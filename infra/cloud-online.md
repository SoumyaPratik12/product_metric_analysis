# Cloud-Only Deployment Guide

This MVP is designed to be built and deployed online from GitHub.

## Recommended Fast Path

1. Create a GitHub repository and push this code.
2. Open the repository in GitHub Codespaces.
3. Create two Render services from `render.yaml`.
4. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
5. In Render, set the backend `CORS_ORIGINS` to the deployed frontend URL.
6. In Render, set the backend `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
7. In Render, set the frontend `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
8. Deploy both services from the Render dashboard.

## Production Path

- Frontend: Vercel or CloudFront-hosted Next.js
- Backend: Render, Railway, Fly.io, ECS Fargate, or Kubernetes
- Database: Supabase PostgreSQL
- Auth: Supabase Auth
- Storage: Supabase Storage for CSV uploads and report exports
- Observability: provider logs first, then Prometheus/Grafana as scale grows

## MVP Upgrade Backlog

- Replace deterministic insight engine with OpenAI-powered metric planning
- Connect backend server-side jobs to Supabase with the service-role key
- Add organization roles and project switching backed by Supabase tables
- Add warehouse connectors for BigQuery, Snowflake, and PostgreSQL
- Add scheduled alerts and executive summary emails
- Add dashboard sharing and exportable PDF reports
