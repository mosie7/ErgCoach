variable "aws_region" {
  description = "AWS region for ErgCoach"
  type        = string
  default     = "eu-west-2"
}

variable "project_name" {
  type    = string
  default = "ergcoach"
}

variable "environment" {
  description = "Environment name (staging|production)"
  type        = string
  default     = "staging"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_name" {
  type    = string
  default = "ergcoach"
}

variable "db_username" {
  type    = string
  default = "ergcoach"
}

variable "openai_api_key" {
  description = "OpenAI API key (stored in Secrets Manager)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "auth_secret" {
  description = "Session auth secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "openai_model" {
  type    = string
  default = "gpt-4o-mini"
}

variable "concept2_client_id" {
  type      = string
  default   = ""
  sensitive = true
}

variable "concept2_client_secret" {
  type      = string
  default   = ""
  sensitive = true
}

variable "concept2_use_mock" {
  type    = string
  default = "true"
}

variable "image_tag" {
  description = "Docker image tag to deploy to App Runner"
  type        = string
  default     = "latest"
}

variable "container_port" {
  type    = number
  default = 3000
}

variable "cpu" {
  description = "App Runner CPU units (e.g. 1024 = 1 vCPU)"
  type        = string
  default     = "1024"
}

variable "memory" {
  description = "App Runner memory MB"
  type        = string
  default     = "2048"
}
