import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.analytics import (
    ENGAGEMENT_TREND,
    FUNNEL,
    RETENTION_BY_FEATURE,
    REVENUE_TREND,
    answer_question,
    base_insights,
    overview_metrics,
)
from app.models import ExecutiveReport, Integration, OverviewResponse, QueryRequest, QueryResponse


def _allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS", "")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


allowed_origins = _allowed_origins()


app = FastAPI(
    title="Product Metrics Explorer API",
    version="0.1.0",
    description="MVP analytics and AI insight API for Product Metrics Explorer.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials="*" not in allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "product-metrics-api"}


@app.get("/api/overview", response_model=OverviewResponse)
def overview() -> OverviewResponse:
    return OverviewResponse(
        metrics=overview_metrics(),
        retention_by_feature=RETENTION_BY_FEATURE,
        funnel=FUNNEL,
        engagement_trend=ENGAGEMENT_TREND,
        revenue_trend=REVENUE_TREND,
        insights=base_insights(),
    )


@app.post("/api/query", response_model=QueryResponse)
def query_metrics(payload: QueryRequest) -> QueryResponse:
    result = answer_question(payload.question)
    return QueryResponse(question=payload.question, **result)


@app.get("/api/integrations", response_model=list[Integration])
def integrations() -> list[Integration]:
    return [
        Integration(name="PostgreSQL", category="Warehouse", status="connected", last_sync="6 min ago"),
        Integration(name="Stripe", category="Revenue", status="connected", last_sync="14 min ago"),
        Integration(name="Amplitude", category="Product Analytics", status="syncing", last_sync="Running now"),
        Integration(name="BigQuery", category="Warehouse", status="available", last_sync="Not connected"),
        Integration(name="Slack", category="Alerts", status="available", last_sync="Not connected"),
    ]


@app.get("/api/reports/executive", response_model=ExecutiveReport)
def executive_report() -> ExecutiveReport:
    return ExecutiveReport(
        title="Weekly Product Intelligence Brief",
        period="June 22-29, 2026",
        highlights=[
            "MRR reached $132.4K with churn improving to 3.6%.",
            "Notes remains the strongest retention driver at 81% 30-day retention.",
            "Revenue growth is healthy despite softer engagement in the latest week.",
        ],
        risks=[
            "DAU declined for two consecutive weekly periods.",
            "AI Summary retention trails other adopted features.",
            "Activation funnel loses 23 percentage points before first insight.",
        ],
        recommended_actions=[
            "Investigate login latency, notification CTR, and release changes after June 15.",
            "Move Notes into the first-run experience for new workspaces.",
            "Create guided question templates to increase first-insight completion.",
        ],
        metrics=overview_metrics(),
    )
