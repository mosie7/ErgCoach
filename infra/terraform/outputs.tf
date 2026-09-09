output "aws_region" {
  value = var.aws_region
}

output "ecr_repository_url" {
  value = aws_ecr_repository.web.repository_url
}

output "apprunner_service_arn" {
  value = aws_apprunner_service.web.arn
}

output "apprunner_service_url" {
  value = "https://${aws_apprunner_service.web.service_url}"
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}

output "secrets_arn" {
  value = aws_secretsmanager_secret.app.arn
}

output "database_url_secret_pointer" {
  value = "${aws_secretsmanager_secret.app.arn}:DATABASE_URL::"
}

output "deploy_hint" {
  value = <<-EOT
    1) Export AWS creds
    2) terraform init && terraform apply -var="openai_api_key=$OPENAI_API_KEY"
    3) docker build -t ergcoach-web .
    4) aws ecr get-login-password | docker login ...
    5) docker tag/push to ${aws_ecr_repository.web.repository_url}:latest
    6) aws apprunner start-deployment --service-arn <service_arn>
    Or use GitHub Actions workflow deploy-aws.yml
  EOT
}
