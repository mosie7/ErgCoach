# Legacy AWS deployment (App Runner + RDS Postgres)

> **Deprecated for new deploys.** ErgCoach now targets **Amplify Gen 2**
> (Cognito + Amplify Data/DynamoDB + Amplify Hosting). See the root [README](../README.md).
>
> This Terraform stack remains only as a reference for the previous Postgres/App Runner path.

This stack provisions:

| Resource | Purpose |
|----------|---------|
| VPC + public/private subnets + NAT | Network isolation |
| RDS PostgreSQL 16 | App database (legacy) |
| ECR | Container registry |
| App Runner + VPC connector | Hosts the Next.js web app with private DB access |
| Secrets Manager | Legacy secrets |

Prefer:

```bash
npx ampx sandbox          # local Cognito + DynamoDB
# or connect the repo in Amplify Console for Hosting + backend CI
```
