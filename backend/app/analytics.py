from __future__ import annotations

from statistics import mean

from app.models import Insight


RETENTION_BY_FEATURE = [
    {"feature": "Playlists", "retention": 81, "active_users": 42120},
    {"feature": "Smart Search", "retention": 74, "active_users": 35380},
    {"feature": "Offline Sync", "retention": 69, "active_users": 28220},
    {"feature": "Lyrics Translation", "retention": 55, "active_users": 36740},
]

FUNNEL = [
    {"stage": "Signup", "users": 125000, "conversion": 100},
    {"stage": "Onboarding", "users": 101250, "conversion": 81},
    {"stage": "Play Song", "users": 72500, "conversion": 58},
    {"stage": "Create Playlist", "users": 46250, "conversion": 37},
    {"stage": "Share Playlist", "users": 30000, "conversion": 24},
]

ENGAGEMENT_TREND = [
    {"date": "Jun 01", "dau": 24920, "sessions": 49300, "avg_minutes": 12.6},
    {"date": "Jun 08", "dau": 26180, "sessions": 52840, "avg_minutes": 13.2},
    {"date": "Jun 15", "dau": 25640, "sessions": 50120, "avg_minutes": 12.8},
    {"date": "Jun 22", "dau": 24220, "sessions": 46380, "avg_minutes": 11.4},
    {"date": "Jun 29", "dau": 23680, "sessions": 44890, "avg_minutes": 10.9},
]

REVENUE_TREND = [
    {"date": "Feb", "mrr": 125000, "arpu": 18.2, "churn": 4.8},
    {"date": "Mar", "mrr": 142000, "arpu": 18.9, "churn": 4.4},
    {"date": "Apr", "mrr": 156000, "arpu": 19.6, "churn": 4.1},
    {"date": "May", "mrr": 172000, "arpu": 20.4, "churn": 3.8},
    {"date": "Jun", "mrr": 185000, "arpu": 21.1, "churn": 3.6},
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
            title="Playlists drive the strongest long-term retention",
            summary="Users who adopt Playlists keep returning at an 81% Day 30 retention rate, making it the highest-retention feature in the StreamFlow metrics catalogue.",
            confidence=92,
            recommendation="Prompt Free tier users to create their first custom playlist during their first active session.",
            priority="High",
        ),
        Insight(
            title="Engagement softened after June 15",
            summary="DAU and average session minutes both declined for two consecutive weekly periods, suggesting a possible onboarding drop-off after onboarding step 3.",
            confidence=84,
            recommendation="Review login latency and push notification CTR values for updates rolled out after June 15.",
            priority="High",
        ),
        Insight(
            title="Lyrics Translation has adoption but weak repeat usage",
            summary="Lyrics Translation has a large active-user base but only 55% Day 30 retention, so users try it but don't establish a habit.",
            confidence=78,
            recommendation="Add quality improvements and contextual translation recommendations inside song view portals.",
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
                "Which feature has the highest retention?" if c == "retention_by_feature" else
                "Compare retention between Premium and Free users" if c == "plan_comparison" else
                "Why did engagement drop this week?" if c == "engagement_drop" else
                "Show me DAU over the last 60 days" if c == "dau_trend" else
                "Where do users drop off in the funnel?" if c == "funnel" else
                "Which acquisition channel converts best?" if c == "acquisition" else
                "What's our MRR?" if c == "revenue" else
                "What's our churn rate?" if c == "churn" else
                "Which feature has the highest weekly adoption?" if c == "feature_adoption" else
                "Average session duration by feature?" for c in result["candidates"]
            ]
        }
    else: # status == "low_confidence" or "no_match"
        return {
            "intent": "Clarification Required",
            "answer": "I'm not fully sure what you're asking. Try rephrasing, or pick a suggested question.",
            "chart_type": "table",
            "chart_data": [],
            "generated_query": "-- Unresolved query detected",
            "insights": [],
            "follow_ups": [
                "Which feature has the highest retention?",
                "Why did engagement drop this week?",
                "Show me DAU over the last 60 days",
                "Where do users drop off in the funnel?"
            ]
        }

    # Intent routing
    if intent == "retentionByFeature":
        top = max(RETENTION_BY_FEATURE, key=lambda item: item["retention"])
        return {
            "intent": "Retention Analysis",
            "answer": f"{top['feature']} has the highest 30-day retention at {top['retention']}%. The next best feature is Smart Search at 74%.",
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

    if intent == "planComparison":
        plan_data = [
            {"cohort": "Premium", "retention": 85, "avgSessionMin": 18.4, "weeklyRevenuePerUser": 4.5},
            {"cohort": "Free", "retention": 62, "avgSessionMin": 9.2, "weeklyRevenuePerUser": 0.0}
        ]
        return {
            "intent": "Plan Comparison",
            "answer": "Premium users exhibit significantly stronger 30-day retention (85% vs 62%) and double the average session length compared to Free tier users.",
            "chart_type": "bar",
            "chart_data": plan_data,
            "generated_query": "SELECT plan_type, avg(retention_30d), avg(session_duration) FROM user_cohorts GROUP BY plan_type;",
            "insights": [
                Insight(
                    title="Premium cohort shows high stickiness",
                    summary="Premium users generate 85% Day 30 retention and consume twice as much session time, validating paid feature value.",
                    confidence=94,
                    recommendation="Push free-trial upgrades to Free tier users when they exceed 3 active days.",
                    priority="High"
                )
            ],
            "follow_ups": [
                "Segment retention by feature for Premium users",
                "What is the upgrade conversion rate?"
            ]
        }

    if intent == "engagementDropDiagnosis":
        return {
            "intent": "Engagement Drop Diagnosis",
            "answer": "The engagement drop after June 15 was driven primarily by a 14% decline in average daily active users and a corresponding reduction in session length.",
            "chart_type": "line",
            "chart_data": ENGAGEMENT_TREND,
            "generated_query": "SELECT date, dau, avg_minutes FROM engagement_weekly WHERE date >= 'Jun 15' ORDER BY date ASC;",
            "insights": [base_insights()[1]],
            "follow_ups": [
                "Check server response times after June 15",
                "Compare mobile vs web app engagement drops"
            ]
        }

    if intent == "dauTrend":
        return {
            "intent": "DAU Trend",
            "answer": "Daily Active Users peaked at 26.1K on June 08 before decreasing to 23.6K by the end of the month.",
            "chart_type": "line",
            "chart_data": [{"date": item["date"], "dau": item["dau"]} for item in ENGAGEMENT_TREND],
            "generated_query": "SELECT date, dau FROM daily_active_users ORDER BY date ASC LIMIT 60;",
            "insights": [base_insights()[1]],
            "follow_ups": [
                "Why is DAU decreasing?",
                "Show weekly active users (WAU) trend"
            ]
        }

    if intent == "funnelAnalysis":
        weakest = min(FUNNEL[1:], key=lambda item: item["conversion"])
        return {
            "intent": "Funnel Diagnosis",
            "answer": f"The largest cumulative drop happens before {weakest['stage']}, where only {weakest['conversion']}% of signup users remain in the journey.",
            "chart_type": "funnel",
            "chart_data": FUNNEL,
            "generated_query": "SELECT stage, users, conversion_rate FROM activation_funnel ORDER BY stage_order ASC;",
            "insights": [
                Insight(
                    title="First Song Play is the activation bottleneck",
                    summary="The product loses 23 percentage points between onboarding completion and first song play.",
                    confidence=86,
                    recommendation="Shorten onboarding screens and offer a popular 'quick-play' station on first-run.",
                    priority="High",
                )
            ],
            "follow_ups": [
                "Segment this funnel by acquisition channel",
                "Show drop-off by plan type",
                "What should we change in onboarding?",
            ],
        }

    if intent == "acquisitionChannels":
        channels = [
            {"channel": "Organic Search", "users": 15200, "conversion": 18.5},
            {"channel": "Paid Ads", "users": 12800, "conversion": 24.2},
            {"channel": "Referrals", "users": 8400, "conversion": 14.1},
            {"channel": "Direct", "users": 9500, "conversion": 11.2}
        ]
        return {
            "intent": "Acquisition Channels",
            "answer": "Paid Ads drive the highest conversion rate at 24.2%, but Organic Search drives the largest absolute volume of active users (15.2K).",
            "chart_type": "bar",
            "chart_data": channels,
            "generated_query": "SELECT channel, count(*), avg(conversion) FROM user_signups GROUP BY channel ORDER BY count(*) DESC;",
            "insights": [
                Insight(
                    title="Paid Ads conversions are highly efficient",
                    summary="Paid channels yield a 24.2% conversion rate, which is 5.7 percentage points higher than organic search.",
                    confidence=88,
                    recommendation="Increase paid advertising budget for the top-performing campaigns.",
                    priority="Medium"
                )
            ],
            "follow_ups": [
                "Show conversion trends by campaign",
                "What is the cost per acquisition (CAC)?"
            ]
        }

    if intent == "revenueMetrics":
        return {
            "intent": "Revenue Analytics",
            "answer": "MRR grew to $185.0K in June while churn improved to 3.6%, indicating expansion is outpacing customer loss.",
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

    if intent == "churnAnalysis":
        churn_data = [
            {"date": "Feb", "churn": 4.8},
            {"date": "Mar", "churn": 4.4},
            {"date": "Apr", "churn": 4.1},
            {"date": "May", "churn": 3.8},
            {"date": "Jun", "churn": 3.6}
        ]
        return {
            "intent": "Churn Analysis",
            "answer": "Monthly churn has steadily declined over the last five months, dropping from 4.8% in February to 3.6% in June.",
            "chart_type": "line",
            "chart_data": churn_data,
            "generated_query": "SELECT month, churn_rate FROM revenue_metrics ORDER BY month ASC;",
            "insights": [
                Insight(
                    title="Churn is on a steady downward path",
                    summary="Customer churn improved to 3.6% in June, showing strong progress in product stickiness.",
                    confidence=91,
                    recommendation="Roll out NPS surveys to active cohorts to identify remaining churn risks.",
                    priority="Medium"
                )
            ],
            "follow_ups": [
                "Show churn by plan type",
                "What is the average customer lifetime value (LTV)?"
            ]
        }

    if intent == "featureAdoption":
        adoption_data = [
            {"feature": "Playlists", "adoption": 76},
            {"feature": "Smart Search", "adoption": 68},
            {"feature": "Offline Sync", "adoption": 54},
            {"feature": "Lyrics Translation", "adoption": 42}
        ]
        return {
            "intent": "Feature Adoption",
            "answer": "Playlists has the highest weekly adoption rate at 76%, followed closely by Smart Search at 68%. Lyrics Translation is the lowest at 42%.",
            "chart_type": "bar",
            "chart_data": adoption_data,
            "generated_query": "SELECT feature, adoption_rate FROM feature_adoption ORDER BY adoption_rate DESC;",
            "insights": [
                Insight(
                    title="Playlists dominates user adoption",
                    summary="Playlists is adopted by 76% of active users within their first week.",
                    confidence=90,
                    recommendation="Feature Playlists prominently in the user onboarding tour.",
                    priority="High"
                )
            ],
            "follow_ups": [
                "Which onboarding step improves adoption?",
                "Show adoption of Offline Sync over time"
            ]
        }

    if intent == "engagementByFeature":
        eng_data = [
            {"feature": "Playlists", "avgSessionMin": 14.5},
            {"feature": "Smart Search", "avgSessionMin": 11.2},
            {"feature": "Offline Sync", "avgSessionMin": 8.9},
            {"feature": "Lyrics Translation", "avgSessionMin": 6.4}
        ]
        return {
            "intent": "Engagement by Feature",
            "answer": "Users spend the most time engaging with Playlists (averaging 14.5 minutes per session), compared to 11.2 minutes for Smart Search.",
            "chart_type": "bar",
            "chart_data": eng_data,
            "generated_query": "SELECT feature, avg(session_duration) FROM feature_sessions GROUP BY feature ORDER BY avg(session_duration) DESC;",
            "insights": [
                Insight(
                    title="Playlists session duration is highly sticky",
                    summary="Playlists leads average session time at 14.5 minutes, showing deeper user engagement.",
                    confidence=87,
                    recommendation="Optimize playlist loading times to keep engagement high.",
                    priority="Medium"
                )
            ],
            "follow_ups": [
                "Compare engagement by plan type",
                "Which feature leads to longest sessions?"
            ]
        }

    return {
        "intent": "Product Health Overview",
        "answer": "The product is growing revenue and retention, but engagement softened in late June. The highest priority is diagnosing the DAU decline while amplifying the Playlists retention loop.",
        "chart_type": "table",
        "chart_data": overview_metrics(),
        "generated_query": "SELECT metric, value, delta FROM product_health_snapshot;",
        "insights": base_insights(),
        "follow_ups": [
            "Which feature has the highest retention?",
            "Why did engagement drop this week?",
            "Show MRR trend"
        ]
    }
