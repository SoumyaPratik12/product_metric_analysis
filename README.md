# Product Metrics Explorer MVP

AI-powered product analytics without SQL. This repository is structured for cloud-first development and deployment from a browser-based workflow such as GitHub Codespaces.

## MVP Scope

- Conversational analytics workspace for product questions
- KPI overview, retention, funnel, engagement, revenue, and health metrics
- AI-style insight generation with chart recommendations and next steps
- Executive summary endpoint and UI preview
- Integration status surface for common data sources
- Cloud-ready Dockerfiles, Render blueprint, and GitHub Actions CI

## Repository

```text
frontend/   Next.js, React, TypeScript, Tailwind, Recharts
backend/    FastAPI analytics API with deterministic MVP insight engine
infra/      Cloud deployment notes
.github/    CI workflow
```

## Online-Only Build Flow

1. Push this repository to GitHub.
2. Open it in GitHub Codespaces.
3. Create the cloud services from `render.yaml`, or connect the frontend to Vercel and backend to Render/Railway/Fly.io.
4. Set `NEXT_PUBLIC_API_URL` on the frontend to the deployed backend URL.
5. Run CI from GitHub Actions and deploy from your cloud provider dashboard.

No local IDE is required; the local machine is only a browser.

## Cloud Environment Variables

Frontend:

- `NEXT_PUBLIC_API_URL`: public URL of the deployed FastAPI backend

Backend:

- `CORS_ORIGINS`: comma-separated allowed frontend origins
- `APP_ENV`: `production`, `staging`, or `development`

## API

- `GET /health`
- `GET /api/overview`
- `POST /api/query`
- `GET /api/reports/executive`
- `GET /api/integrations`

## Local Preview

Local preview is optional and only for verification. The intended path is GitHub Codespaces plus hosted services.

