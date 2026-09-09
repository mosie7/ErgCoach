# ErgCoach AWS deployment

This stack provisions:

| Resource | Purpose |
|----------|---------|
| VPC + public/private subnets + NAT | Network isolation |
| RDS PostgreSQL 16 | App database |
| ECR | Container registry |
| App Runner + VPC connector | Hosts the Next.js web app with private DB access |
| Secrets Manager | `DATABASE_URL`, `AUTH_SECRET`, `OPENAI_API_KEY`, Concept2 secrets |

## Prerequisites

1. AWS account with permissions for VPC, RDS, ECR, App Runner, IAM, Secrets Manager
2. Terraform >= 1.5
3. Docker
4. AWS CLI v2
5. OpenAI API key (for live coach chat)

## One-time bootstrap

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit region / environment as needed

export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=eu-west-2
export TF_VAR_openai_api_key=sk-...

terraform init
terraform plan
terraform apply
```

Note the outputs:

- `ecr_repository_url`
- `apprunner_service_url`
- `apprunner_service_arn`
- `secrets_arn`

## Build & push image

```bash
cd ../..   # repo root
ECR=$(cd infra/terraform && terraform output -raw ecr_repository_url)
REGION=$(cd infra/terraform && terraform output -raw aws_region)
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

docker build -t ergcoach-web:latest .
docker tag ergcoach-web:latest "$ECR:latest"
docker push "$ECR:latest"

SERVICE_ARN=$(cd infra/terraform && terraform output -raw apprunner_service_arn)
aws apprunner start-deployment --service-arn "$SERVICE_ARN" --region "$REGION"
```

App Runner health check: `GET /api/health`

## Seed production/staging data (optional)

After the service is healthy, run migrations are automatic on boot (`RUN_MIGRATIONS=true`).

To load the synthetic demo athlete, connect to RDS via a bastion/SSM jump or a one-off ECS/App Runner task with `SEED_ON_BOOT` / `pnpm db:seed`. Prefer seeding only in staging.

## GitHub Actions

Set repository secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (e.g. `eu-west-2`)
- `OPENAI_API_KEY`
- `TF_STATE` optional if using remote state later

Workflow: `.github/workflows/deploy-aws.yml`

## Cost notes (staging defaults)

Rough monthly ballpark for `eu-west-2` staging:

- RDS `db.t4g.micro`
- NAT Gateway (largest fixed cost)
- App Runner 1 vCPU / 2 GB
- ECR storage

Destroy when idle:

```bash
terraform destroy
```

## Chat / AI

Coach chat is at `/coach` on the deployed URL.

Set `OPENAI_API_KEY` in Terraform/`TF_VAR_openai_api_key` (or update Secrets Manager). Without it, chat still retrieves training evidence and returns a heuristic reply.
