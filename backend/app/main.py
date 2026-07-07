import os
import csv
import io
from fastapi import FastAPI, Depends, UploadFile, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.analytics import (
    ENGAGEMENT_TREND,
    FUNNEL,
    RETENTION_BY_FEATURE,
    REVENUE_TREND,
    answer_question,
    base_insights,
    overview_metrics,
)
from app.models import (
    ExecutiveReport,
    Integration,
    OverviewResponse,
    QueryRequest,
    QueryResponse,
    UploadResponse,
)
from app.auth import get_current_user_and_workspace, AuthenticatedUser
from app.sanitizer import sanitize_csv_cell


def _allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS", "")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


allowed_origins = _allowed_origins()

# Configure slowapi rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Product Metrics Explorer API",
    version="0.1.0",
    description="MVP analytics and AI insight API for Product Metrics Explorer.",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
def overview(user: AuthenticatedUser = Depends(get_current_user_and_workspace)) -> OverviewResponse:
    return OverviewResponse(
        metrics=overview_metrics(),
        retention_by_feature=RETENTION_BY_FEATURE,
        funnel=FUNNEL,
        engagement_trend=ENGAGEMENT_TREND,
        revenue_trend=REVENUE_TREND,
        insights=base_insights(),
    )


@app.post("/api/query", response_model=QueryResponse)
@limiter.limit("20/minute")
def query_metrics(
    payload: QueryRequest,
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user_and_workspace),
) -> QueryResponse:
    result = answer_question(payload.question)
    return QueryResponse(question=payload.question, **result)


@app.get("/api/integrations", response_model=list[Integration])
def integrations(user: AuthenticatedUser = Depends(get_current_user_and_workspace)) -> list[Integration]:
    return [
        Integration(name="PostgreSQL", category="Warehouse", status="connected", last_sync="6 min ago"),
        Integration(name="Stripe", category="Revenue", status="connected", last_sync="14 min ago"),
        Integration(name="Amplitude", category="Product Analytics", status="syncing", last_sync="Running now"),
        Integration(name="BigQuery", category="Warehouse", status="available", last_sync="Not connected"),
        Integration(name="Slack", category="Alerts", status="available", last_sync="Not connected"),
    ]


@app.get("/api/reports/executive", response_model=ExecutiveReport)
def executive_report(user: AuthenticatedUser = Depends(get_current_user_and_workspace)) -> ExecutiveReport:
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


@app.post("/datasets/upload", response_model=UploadResponse)
@limiter.limit("10/minute")
def upload_dataset(
    request: Request,
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user_and_workspace),
) -> UploadResponse:
    # 1. Size Validation (limit to 5MB for MVP)
    MAX_FILE_SIZE = 5 * 1024 * 1024
    content = file.file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit")

    file_in_memory = io.StringIO(content.decode("utf-8", errors="ignore"))
    reader = csv.reader(file_in_memory)

    try:
        header = next(reader)
    except StopIteration:
        raise HTTPException(status_code=400, detail="Empty CSV file")

    columns = [sanitize_csv_cell(col) for col in header]
    row_count = 0
    sanitized_rows = []

    # 2. Row Count Validation (limit to 50,000 rows for MVP)
    MAX_ROW_COUNT = 50000
    for row in reader:
        row_count += 1
        if row_count > MAX_ROW_COUNT:
            raise HTTPException(status_code=400, detail="Row count exceeds the 50,000 rows limit")
        sanitized_row = [sanitize_csv_cell(cell) for cell in row]
        sanitized_rows.append(sanitized_row)

    return UploadResponse(
        file_name=file.filename,
        row_count=row_count,
        columns=columns,
        status="successfully_sanitized_and_processed",
    )

