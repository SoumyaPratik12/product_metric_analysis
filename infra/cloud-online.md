# Cloud-Only Deployment Guide

This MVP is designed to be built and deployed online from GitHub.

## Recommended Fast Path

1. Create a GitHub repository and push this code.
2. Open the repository in GitHub Codespaces.
3. Create two Render services from `render.yaml`.
4. In Render, set the backend `CORS_ORIGINS` to the deployed frontend URL.
5. In Render, set the frontend `NEXT_PUBLIC_API_URL` to the deployed backend URL.
6. Deploy both services from the Render dashboard.

## Production Path

- Frontend: Vercel or CloudFront-hosted Next.js
- Backend: Render, Railway, Fly.io, ECS Fargate, or Kubernetes
- Database: managed PostgreSQL
- Auth: Clerk, Auth0, or Cognito
- Storage: S3-compatible object storage
- Observability: provider logs first, then Prometheus/Grafana as scale grows

## MVP Upgrade Backlog

- Replace deterministic insight engine with OpenAI-powered metric planning
- Add managed PostgreSQL and SQLAlchemy models
- Add Clerk/Auth0 authentication and organization roles
- Add warehouse connectors for BigQuery, Snowflake, and PostgreSQL
- Add scheduled alerts and executive summary emails
- Add dashboard sharing and exportable PDF reports

