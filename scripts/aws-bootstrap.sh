#!/usr/bin/env bash
# Two-phase AWS bootstrap for ErgCoach (ECR must contain an image before App Runner).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/infra/terraform"
REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-eu-west-2}}"

if ! command -v aws >/dev/null; then
  echo "AWS CLI required" >&2
  exit 1
fi
if ! command -v terraform >/dev/null; then
  echo "Terraform required" >&2
  exit 1
fi
if ! command -v docker >/dev/null; then
  echo "Docker required" >&2
  exit 1
fi

cd "$TF_DIR"
if [[ ! -f terraform.tfvars ]]; then
  cp terraform.tfvars.example terraform.tfvars
  echo "Created terraform.tfvars — review before continuing."
fi

echo "==> Phase 1: network, RDS, ECR, secrets (no App Runner yet)"
terraform init
terraform apply -auto-approve \
  -target=aws_vpc.main \
  -target=aws_internet_gateway.main \
  -target=aws_subnet.public \
  -target=aws_subnet.private \
  -target=aws_eip.nat \
  -target=aws_nat_gateway.main \
  -target=aws_route_table.public \
  -target=aws_route_table_association.public \
  -target=aws_route_table.private \
  -target=aws_route_table_association.private \
  -target=aws_security_group.apprunner_vpc \
  -target=aws_security_group.rds \
  -target=aws_db_subnet_group.main \
  -target=random_password.db \
  -target=aws_db_instance.main \
  -target=random_password.auth_secret \
  -target=aws_secretsmanager_secret.app \
  -target=aws_secretsmanager_secret_version.app \
  -target=aws_ecr_repository.web \
  -target=aws_ecr_lifecycle_policy.web \
  -target=aws_iam_role.apprunner_ecr \
  -target=aws_iam_role_policy_attachment.apprunner_ecr \
  -target=aws_iam_role.apprunner_instance \
  -target=aws_iam_role_policy.apprunner_secrets \
  -target=aws_apprunner_vpc_connector.main

ECR="$(terraform output -raw ecr_repository_url)"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"

echo "==> Building and pushing image to $ECR"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

cd "$ROOT"
docker build -t ergcoach-web:latest .
docker tag ergcoach-web:latest "$ECR:latest"
docker push "$ECR:latest"

echo "==> Phase 2: App Runner service"
cd "$TF_DIR"
terraform apply -auto-approve

echo
echo "Deployed:"
terraform output -raw apprunner_service_url
echo
echo "Coach chat: $(terraform output -raw apprunner_service_url)/coach"
echo "Health:     $(terraform output -raw apprunner_service_url)/api/health"
