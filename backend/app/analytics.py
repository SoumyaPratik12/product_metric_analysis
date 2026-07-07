from __future__ import annotations

from statistics import mean

from app.models import Insight


RETENTION_BY_FEATURE = [
    {"feature": "Notes", "retention": 81, "active_users": 18420},
    {"feature": "AI Search", "retention": 74, "active_users": 14380},
    {"feature": "OCR Scanner", "retention": 69, "active_users": 11220},
    {"feature": "AI Summary", "retention": 55, "active_users": 16740},
]

FUNNEL = [
    {"stage": "Signup", "users": 52000, "conversion": 100},
    {"stage": "Onboarding", "users": 42120, "conversion": 81},
    {"stage": "First Insight", "users": 30160, "conversion": 58},
    {"stage": "Dashboard Saved", "users": 19480, "conversion": 37},
    {"stage": "Invite Sent", "users": 12380, "conversion": 24},
]

ENGAGEMENT_TREND = [
    {"date": "Jun 01", "dau": 18920, "sessions": 49300, "avg_minutes": 12.6},
    {"date": "Jun 08", "dau": 20180, "sessions": 52840, "avg_minutes": 13.2},
    {"date": "Jun 15", "dau": 19640, "sessions": 50120, "avg_minutes": 12.8},
    {"date": "Jun 22", "dau": 18220, "sessions": 46380, "avg_minutes": 11.4},
    {"date": "Jun 29", "dau": 17680, "sessions": 44890, "avg_minutes": 10.9},
]

REVENUE_TREND = [
    {"date": "Feb", "mrr": 82000, "arpu": 18.2, "churn": 4.8},
    {"date": "Mar", "mrr": 91500, "arpu": 18.9, "churn": 4.4},
    {"date": "Apr", "mrr": 104200, "arpu": 19.6, "churn": 4.1},
    {"date": "May", "mrr": 118900, "arpu": 20.4, "churn": 3.8},
    {"date": "Jun", "mrr": 132400, "arpu": 21.1, "churn": 3.6},
]


def overview_metrics() -> list[dict[str, str]]:
    current_dau = ENGAGEMENT_TREND[-1]["dau"]
    previous_dau = ENGAGEMENT_TREND[-2]["dau"]
    dau_delta = ((current_dau - previous_dau) / previous_dau) * 100

    current_mrr = REVENUE_TREND[-1]["mrr"]
    previous_mrr = REVENUE_TREND[-2]["mrr"]
    mrr_delta = ((current_mrr - previous_mrr) / previous_mrr) * 100

    return [
        {
            "label": "Daily Active Users",
            "value": f"{current_dau:,}",
            "delta": f"{dau_delta:.1f}%",
            "trend": "down" if dau_delta < 0 else "up",
            "detail": "Week-over-week movement",
        },
        {
            "label": "30-Day Retention",
            "value": f"{mean(item['retention'] for item in RETENTION_BY_FEATURE):.0f}%",
            "delta": "+3.4%",
            "trend": "up",
            "detail": "Average across tracked features",
        },
        {
            "label": "Monthly Recurring Revenue",
            "value": f"${current_mrr / 1000:.1f}K",
            "delta": f"+{mrr_delta:.1f}%",
            "trend": "up",
            "detail": "Net of expansion and churn",
        },
        {
            "label": "Churn Risk",
            "value": "3.6%",
            "delta": "-0.2%",
            "trend": "up",
            "detail": "Lower is better",
        },
    ]


def base_insights() -> list[Insight]:
    return [
        Insight(
            title="Notes drives the strongest long-term retention",
            summary="Users who adopt Notes keep returning at an 81% 30-day retention rate, making it the highest-retention feature in the sample product dataset.",
            confidence=92,
            recommendation="Move Notes earlier in onboarding and use it as the default success moment for new users.",
            priority="High",
        ),
        Insight(
            title="Engagement softened after June 15",
            summary="DAU and average session minutes both declined for two consecutive weekly periods, suggesting a broad usage issue rather than a single-channel acquisition problem.",
            confidence=84,
            recommendation="Compare app version, login latency, and notification CTR for users active after June 15.",
            priority="High",
        ),
        Insight(
            title="AI Summary has adoption but weak repeat usage",
            summary="AI Summary has a large active-user base but only 55% retention, so the feature is bringing users in without creating a durable habit.",
            confidence=78,
            recommendation="Add quality feedback, examples, and reminder prompts after summary generation.",
            priority="Medium",
        ),
    ]


def detect_intent(question: str) -> str:
    normalized = question.lower()
    if any(word in normalized for word in ["retain", "retention", "cohort"]):
        return "retention"
    if any(word in normalized for word in ["funnel", "drop", "conversion", "checkout", "signup"]):
        return "funnel"
    if any(word in normalized for word in ["revenue", "mrr", "arr", "arpu", "churn"]):
        return "revenue"
    if any(word in normalized for word in ["dau", "engagement", "session", "active"]):
        return "engagement"
    return "overview"


def answer_question(question: str) -> dict:
    from app.nlp.router import route
    
    result = route(question)
    status = result["status"]
    
    if status == "matched":
        intent = result["function"]
    elif status == "ambiguous":
        return {
            "intent": "Clarification Required",
            "answer": "Did you mean one of the following product metric analysis views?",
            "chart_type": "table",
            "chart_data": [],
            "generated_query": "-- Ambiguous query detected",
            "insights": [],
            "follow_ups": [
                "Which feature has the highest retention?" if c == "retention" else
                "Show revenue trend" if c == "revenue" else
                "Where do users drop off in the funnel?" if c == "funnel" else
                "Why did engagement decrease this week?" for c in result["candidates"]
            ]
        }
    else: # status == "low_confidence"
        return {
            "intent": "Clarification Required",
            "answer": "I'm not fully sure what you're asking. Try rephrasing, or pick a suggested question.",
            "chart_type": "table",
            "chart_data": [],
            "generated_query": "-- Low confidence query detected",
            "insights": [],
            "follow_ups": [
                "Which feature has the highest retention?",
                "Why did engagement decrease this week?",
                "Show revenue trend",
                "Where do users drop off in the funnel?"
            ]
        }

    if intent == "retention":
        top = max(RETENTION_BY_FEATURE, key=lambda item: item["retention"])
        return {
            "intent": "Retention Analysis",
            "answer": f"{top['feature']} has the highest 30-day retention at {top['retention']}%. The next best feature is AI Search at 74%.",
            "chart_type": "bar",
            "chart_data": RETENTION_BY_FEATURE,
            "generated_query": "SELECT feature, retention_30d, active_users FROM feature_retention ORDER BY retention_30d DESC;",
            "insights": [base_insights()[0], base_insights()[2]],
            "follow_ups": [
                "Compare Premium vs Free retention",
                "Show Day 7 retention by feature",
                "Which onboarding step improves retention?",
            ],
        }

    if intent == "funnel":
        weakest = min(FUNNEL[1:], key=lambda item: item["conversion"])
        return {
            "intent": "Funnel Diagnosis",
            "answer": f"The largest cumulative drop happens before {weakest['stage']}, where only {weakest['conversion']}% of signup users remain in the journey.",
            "chart_type": "funnel",
            "chart_data": FUNNEL,
            "generated_query": "SELECT stage, users, conversion_rate FROM activation_funnel ORDER BY stage_order ASC;",
            "insights": [
                Insight(
                    title="First Insight is the activation bottleneck",
                    summary="The product loses 23 percentage points between onboarding and first insight generation.",
                    confidence=86,
                    recommendation="Shorten the first-query path and add templates for common product analytics questions.",
                    priority="High",
                )
            ],
            "follow_ups": [
                "Segment this funnel by acquisition channel",
                "Show drop-off by plan type",
                "What should we change in onboarding?",
            ],
        }

    if intent == "revenue":
        return {
            "intent": "Revenue Analytics",
            "answer": "MRR grew to $132.4K in June while churn improved to 3.6%, indicating expansion is outpacing customer loss.",
            "chart_type": "line",
            "chart_data": REVENUE_TREND,
            "generated_query": "SELECT month, mrr, arpu, churn_rate FROM revenue_metrics ORDER BY month ASC;",
            "insights": [
                Insight(
                    title="Revenue quality is improving",
                    summary="MRR, ARPU, and churn are all moving in healthy directions across the latest period.",
                    confidence=89,
                    recommendation="Prioritize expansion prompts for teams that saved at least three dashboards.",
                    priority="Medium",
                )
            ],
            "follow_ups": [
                "Forecast next month MRR",
                "Show churn by customer segment",
                "Which features correlate with paid conversion?",
            ],
        }

    if intent == "engagement":
        return {
            "intent": "Engagement Root Cause",
            "answer": "DAU decreased from 20,180 to 17,680 over the second half of June, while sessions and average minutes also declined.",
            "chart_type": "line",
            "chart_data": ENGAGEMENT_TREND,
            "generated_query": "SELECT week, dau, sessions, avg_minutes FROM engagement_weekly ORDER BY week ASC;",
            "insights": [base_insights()[1]],
            "follow_ups": [
                "Why did DAU decrease this week?",
                "Compare engagement by feature",
                "Show active users by plan",
            ],
        }

    return {
        "intent": "Product Health Overview",
        "answer": "The product is growing revenue and retention, but engagement softened in late June. The highest priority is diagnosing the DAU decline while amplifying the Notes retention loop.",
        "chart_type": "table",
        "chart_data": overview_metrics(),
        "generated_query": "SELECT metric, value, delta FROM product_health_snapshot;",
        "insights": base_insights(),
        "follow_ups": [
            "Which feature has the highest retention?",
            "Why did engagement decrease this week?",
            "Show revenue trend",
        ],
    }

