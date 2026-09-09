resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name_prefix}/app"
  recovery_window_in_days = var.environment == "production" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL           = local.database_url
    AUTH_SECRET            = var.auth_secret != "" ? var.auth_secret : random_password.auth_secret.result
    OPENAI_API_KEY         = var.openai_api_key
    OPENAI_MODEL           = var.openai_model
    CONCEPT2_CLIENT_ID     = var.concept2_client_id
    CONCEPT2_CLIENT_SECRET = var.concept2_client_secret
    CONCEPT2_USE_MOCK      = var.concept2_use_mock
  })
}
