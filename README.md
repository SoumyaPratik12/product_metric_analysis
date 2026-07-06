# Product Metrics Explorer MVP

AI-powered product analytics without SQL. This repository is structured for cloud-first development and deployment from a browser-based workflow such as GitHub Codespaces.

## MVP Scope

- Conversational analytics workspace for product questions
- Supabase-ready authentication, user persistence, and CSV upload storage
- CSV row indexing for uploaded datasets, so signed-in users can ask questions against their own uploaded file
- KPI overview, retention, funnel, engagement, revenue, and health metrics
- AI-style insight generation with chart recommendations and next steps
- Executive summary endpoint and UI preview
- Integration status surface for common data sources
- Cloud-ready Dockerfiles, Render blueprint, and GitHub Actions CI

## Repository

```text
frontend/   Next.js, React, TypeScript, Tailwind, Recharts
backend/    FastAPI analytics API with deterministic MVP insight engine
supabase/   Database schema, RLS policies, and storage bucket setup
infra/      Cloud deployment notes
.github/    CI workflow
```

## Online-Only Build Flow

1. Push this repository to GitHub.
2. Open it in GitHub Codespaces.
3. Create the cloud services from `render.yaml`, or connect the frontend to Vercel and backend to Render/Railway/Fly.io.
4. Create a Supabase project and run `supabase/schema.sql` in the Supabase SQL editor.
5. Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on the frontend.
6. Set `CORS_ORIGINS`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` on the backend.
7. Run CI from GitHub Actions and deploy from your cloud provider dashboard.

No local IDE is required; the local machine is only a browser.

## Cloud Environment Variables

Frontend:

- `NEXT_PUBLIC_API_URL`: public URL of the deployed FastAPI backend
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon public key

Backend:

- `CORS_ORIGINS`: comma-separated allowed frontend origins
- `APP_ENV`: `production`, `staging`, or `development`
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase key for future background jobs and secure imports

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Confirm the private `product-datasets` storage bucket exists.
4. In Authentication settings, add your deployed frontend URL to allowed redirect URLs.
5. Add the frontend env vars from `frontend/.env.example` to your host.

The app runs in demo mode when Supabase env vars are missing, then enables login, saved conversations, saved dashboards, and CSV uploads when they are configured.

## Supabase Migrations

If the base schema has already been run, apply newer migrations from `supabase/migrations/`.

Current migration:

- `001_dataset_rows.sql`: adds `dataset_rows`, dataset row counts, dataset column metadata, and RLS policies for indexed CSV data.

After this migration, CSV uploads are stored in Supabase Storage and indexed into `dataset_rows`. When a signed-in user asks a question, the frontend first tries to answer from the latest indexed CSV, then falls back to the sample analytics API.

## API

- `GET /health`
- `GET /api/overview`
- `POST /api/query`
- `GET /api/reports/executive`
- `GET /api/integrations`

## Local Preview

Local preview is optional and only for verification. The intended path is GitHub Codespaces plus hosted services.
