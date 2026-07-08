from typing import Literal

from pydantic import BaseModel, Field


class MetricCard(BaseModel):
    label: str
    value: str
    delta: str
    trend: Literal["up", "down", "flat"]
    detail: str


class ChartSeries(BaseModel):
    name: str
    data: list[dict[str, float | int | str]]


class Insight(BaseModel):
    title: str
    summary: str
    confidence: int = Field(ge=0, le=100)
    recommendation: str
    priority: Literal["High", "Medium", "Low"]


class OverviewResponse(BaseModel):
    metrics: list[MetricCard]
    retention_by_feature: list[dict[str, float | str]]
    funnel: list[dict[str, float | str]]
    engagement_trend: list[dict[str, float | int | str]]
    revenue_trend: list[dict[str, float | int | str]]
    insights: list[Insight]


class QueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    project_id: str = "demo-project"


class QueryResponse(BaseModel):
    question: str
    intent: str
    answer: str
    chart_type: Literal["bar", "line", "funnel", "table"]
    chart_data: list[dict[str, float | int | str]]
    insights: list[Insight]
    generated_query: str
    follow_ups: list[str]
    # v1.1 extensions:
    metric_affected: str | None = None
    key_findings: list[str] | None = None
    root_cause: str | None = None
    business_impact: str | None = None
    recommendations: list[str] | None = None
    confidence_level: Literal["High", "Medium", "Low"] | None = None
    confidence_score: int | None = None


class Integration(BaseModel):
    name: str
    category: str
    status: Literal["connected", "available", "syncing"]
    last_sync: str


class ExecutiveReport(BaseModel):
    title: str
    period: str
    highlights: list[str]
    risks: list[str]
    recommended_actions: list[str]
    metrics: list[MetricCard]


class UploadResponse(BaseModel):
    file_name: str
    row_count: int
    columns: list[str]
    status: str


