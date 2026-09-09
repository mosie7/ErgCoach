data "aws_iam_policy_document" "apprunner_ecr_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["build.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_ecr" {
  name               = "${local.name_prefix}-apprunner-ecr"
  assume_role_policy = data.aws_iam_policy_document.apprunner_ecr_assume.json
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_ecr.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

data "aws_iam_policy_document" "apprunner_instance_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["tasks.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_instance" {
  name               = "${local.name_prefix}-apprunner-instance"
  assume_role_policy = data.aws_iam_policy_document.apprunner_instance_assume.json
}

data "aws_iam_policy_document" "apprunner_secrets" {
  statement {
    sid     = "ReadAppSecrets"
    actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = [
      aws_secretsmanager_secret.app.arn,
    ]
  }
}

resource "aws_iam_role_policy" "apprunner_secrets" {
  name   = "${local.name_prefix}-secrets"
  role   = aws_iam_role.apprunner_instance.id
  policy = data.aws_iam_policy_document.apprunner_secrets.json
}

resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "${local.name_prefix}-connector"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.apprunner_vpc.id]
}

resource "aws_apprunner_service" "web" {
  service_name = "${local.name_prefix}-web"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.web.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = tostring(var.container_port)

        runtime_environment_variables = {
          NODE_ENV            = "production"
          PORT                = tostring(var.container_port)
          HOSTNAME            = "0.0.0.0"
          RUN_MIGRATIONS      = "true"
          OPENAI_MODEL        = var.openai_model
          CONCEPT2_USE_MOCK   = var.concept2_use_mock
          NEXT_PUBLIC_APP_URL = "https://placeholder.local"
        }

        runtime_environment_secrets = {
          DATABASE_URL           = "${aws_secretsmanager_secret.app.arn}:DATABASE_URL::"
          AUTH_SECRET            = "${aws_secretsmanager_secret.app.arn}:AUTH_SECRET::"
          OPENAI_API_KEY         = "${aws_secretsmanager_secret.app.arn}:OPENAI_API_KEY::"
          CONCEPT2_CLIENT_ID     = "${aws_secretsmanager_secret.app.arn}:CONCEPT2_CLIENT_ID::"
          CONCEPT2_CLIENT_SECRET = "${aws_secretsmanager_secret.app.arn}:CONCEPT2_CLIENT_SECRET::"
        }
      }
    }

    auto_deployments_enabled = false
  }

  instance_configuration {
    cpu               = var.cpu
    memory            = var.memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/api/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  tags = { Name = "${local.name_prefix}-web" }

  depends_on = [
    aws_iam_role_policy_attachment.apprunner_ecr,
    aws_iam_role_policy.apprunner_secrets,
    aws_db_instance.main,
  ]

  lifecycle {
    ignore_changes = [
      source_configuration[0].image_repository[0].image_identifier,
      source_configuration[0].image_repository[0].image_configuration[0].runtime_environment_variables["NEXT_PUBLIC_APP_URL"],
    ]
  }
}

# After first deploy, CI updates NEXT_PUBLIC_APP_URL / CONCEPT2_REDIRECT_URI to the real App Runner URL.
