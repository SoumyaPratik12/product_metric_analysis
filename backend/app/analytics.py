from __future__ import annotations

from statistics import mean

from app.models import Insight


RETENTION_BY_FEATURE = [
    {"feature": "Playlists", "retention": 81, "active_users": 42120, "session_min": 42, "impact": "High"},
    {"feature": "Smart Search", "retention": 74, "active_users": 35380, "session_min": 29, "impact": "Medium"},
    {"feature": "Offline Sync", "retention": 69, "active_users": 28220, "session_min": 36, "impact": "High"},
    {"feature": "Lyrics Translation", "retention": 55, "active_users": 36740, "session_min": 18, "impact": "Low"},
    {"feature": "Recommendations", "retention": 69, "active_users": 31200, "session_min": 31, "impact": "High"},
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
    {"date": "Jan", "mrr": 110000, "arpu": 17.5, "churn": 5.1},
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
            "value": "81%",
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
        return {
            "intent": "Retention Analysis",
            "metric_affected": "30-Day Retention",
            "answer": "Playlists has the highest 30-day retention at 81%, driven by repeat audio sessions. The next best feature is Smart Search at 74%.",
            "chart_type": "bar",
            "chart_data": [
                {"feature": item["feature"], "retention": item["retention"]} for item in RETENTION_BY_FEATURE
            ],
            "generated_query": "SELECT feature, retention_30d, active_users FROM feature_retention ORDER BY retention_30d DESC;",
            "insights": [base_insights()[0], base_insights()[2]],
            "key_findings": [
                "Playlists user cohort shows 81% Day 30 retention.",
                "Smart Search users exhibit 74% retention, but search frequency dropped in June.",
                "Offline Sync retention is 69%, showing robust utility for travelers."
            ],
            "root_cause": "Playlists creation creates a persistent user library, reducing switching costs.",
            "business_impact": "Highly retentive features lower user acquisition costs and increase customer lifetime value.",
            "recommendations": [
                "Promote Playlist creation prominently in the onboarding tutorial.",
                "Highlight Recommendations engine usage to increase repeat plays."
            ],
            "confidence_level": "High",
            "confidence_score": 92,
            "follow_ups": [
                "Compare Premium vs Free retention",
                "Show Day 7 retention by feature",
                "Which onboarding step improves retention?",
            ],
        }

    if intent == "planComparison":
        plan_data = [
            {"cohort": "Premium", "retention": 85, "avgSessionMin": 18.4, "weeklyRevenuePerUser": 4.5},
            {"cohort": "Free", "retention": 62, "avgSessionMin": 9.2, "weeklyRevenuePerUser": 0.0},
            {"cohort": "Family", "retention": 88, "avgSessionMin": 22.1, "weeklyRevenuePerUser": 6.8},
            {"cohort": "Student", "retention": 72, "avgSessionMin": 14.5, "weeklyRevenuePerUser": 2.5}
        ]
        return {
            "intent": "Plan Comparison",
            "metric_affected": "Retention & Churn by Plan Tier",
            "answer": "Premium plans (individual and family) show 85% Day 30 retention and 3.2% churn. Student plans have 72% retention and 4.8% churn, while Free plans exhibit 62% retention.",
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
            "key_findings": [
                "Premium individual cohorts lead retention at 85%.",
                "Family tiers show the lowest customer cancelation rates (3.2% churn).",
                "Student plans exhibit slightly higher churn due to semester-end billing cancellations."
            ],
            "root_cause": "Ad-free experience and Offline Sync capabilities in paid plans drive superior habit-formation.",
            "business_impact": "Moving Free users to Premium individual or Student plans boosts MRR predictably.",
            "recommendations": [
                "Promote Student upgrades before major academic terms.",
                "Offer Family subscription bundles to highly active Premium users."
            ],
            "confidence_level": "High",
            "confidence_score": 94,
            "follow_ups": [
                "Segment retention by feature for Premium users",
                "What is the upgrade conversion rate?"
            ]
        }

    if intent == "engagementDropDiagnosis":
        return {
            "intent": "Engagement Drop Diagnosis",
            "metric_affected": "Daily Active Users (DAU) & Session duration",
            "answer": "The engagement drop after June 15 was driven primarily by a 14% decline in average daily active users and a corresponding reduction in session length.",
            "chart_type": "line",
            "chart_data": ENGAGEMENT_TREND,
            "generated_query": "SELECT date, dau, avg_minutes FROM engagement_weekly WHERE date >= 'Jun 15' ORDER BY date ASC;",
            "insights": [base_insights()[1]],
            "key_findings": [
                "DAU fell from 25.6K on June 15 to 23.6K on June 29.",
                "Average session duration decreased by 12% across iOS and Android.",
                "Playlist creation drop-off of 15% was identified during Step 3 of onboarding."
            ],
            "root_cause": "Users abandoned onboarding after onboarding Step 3 due to a configuration lookup latency bug.",
            "business_impact": "Softened engagement poses a risk of future subscription churn on subsequent billing dates.",
            "recommendations": [
                "Resolve database latency on onboarding step 3 queries.",
                "Roll out push notification campaigns to users active in early June."
            ],
            "confidence_level": "High",
            "confidence_score": 91,
            "follow_ups": [
                "Check server response times after June 15",
                "Compare mobile vs web app engagement drops"
            ]
        }

    if intent == "dauTrend":
        return {
            "intent": "DAU Trend",
            "metric_affected": "Daily Active Users",
            "answer": "Daily Active Users peaked at 26.1K on June 08 before decreasing to 23.6K by the end of the month.",
            "chart_type": "line",
            "chart_data": [{"date": item["date"], "dau": item["dau"]} for item in ENGAGEMENT_TREND],
            "generated_query": "SELECT date, dau FROM daily_active_users ORDER BY date ASC LIMIT 60;",
            "insights": [base_insights()[1]],
            "key_findings": [
                "DAU grew during the early June campaign to 26.1K.",
                "A gradual week-over-week cooling reduced daily logins to 23.6K.",
                "Android activity declined faster than iOS active user cohorts."
            ],
            "root_cause": "Early June marketing campaign traffic cooling down combined with onboarding dropoff.",
            "business_impact": "Decreased active user base restricts premium subscription upgrade pipelines.",
            "recommendations": [
                "Launch a re-engagement email campaign targeting dormant June cohorts.",
                "Review app crash reporting logs for Android users."
            ],
            "confidence_level": "Medium",
            "confidence_score": 84,
            "follow_ups": [
                "Why is DAU decreasing?",
                "Show weekly active users (WAU) trend"
            ]
        }

    if intent == "funnelAnalysis":
        weakest = min(FUNNEL[1:], key=lambda item: item["conversion"])
        return {
            "intent": "Funnel Diagnosis",
            "metric_affected": "Activation Funnel Conversion",
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
            "key_findings": [
                "Signup-to-Onboarding conversion is strong at 81%.",
                "Onboarding-to-First Song Play is the core bottleneck, dropping to 58%.",
                "Playlist creation (37%) and Playlist sharing (24%) represent secondary drop-off points."
            ],
            "root_cause": "No default playlists or recommended tracks are loaded on first login, causing empty-state friction.",
            "business_impact": "Failing to play a song within the first hour of registration reduces Day 7 retention by 45 percentage points.",
            "recommendations": [
                "Autoplay a personalized onboarding song station upon signup completion.",
                "Add a prominent 'Quick Start' track recommendations panel on home page."
            ],
            "confidence_level": "High",
            "confidence_score": 86,
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
            "metric_affected": "Signup Conversions by Channel",
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
            "key_findings": [
                "Paid search/ads convert at 24.2% efficiency.",
                "Organic search brings in 15.2K users at 18.5% conversion.",
                "Referral channels exhibit a 14.1% conversion rate."
            ],
            "root_cause": "Targeted advertising copy aligns closely with user intent upon landing.",
            "business_impact": "Increasing paid search budget is highly capital-efficient for subscriber growth.",
            "recommendations": [
                "Reallocate 15% of referral marketing budget into Paid Search campaigns.",
                "A/B test landing page copy for organic search audience."
            ],
            "confidence_level": "Medium",
            "confidence_score": 88,
            "follow_ups": [
                "Show conversion trends by campaign",
                "What is the cost per acquisition (CAC)?"
            ]
        }

    if intent == "revenueMetrics":
        return {
            "intent": "Revenue Analytics",
            "metric_affected": "Monthly Recurring Revenue (MRR)",
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
            "key_findings": [
                "MRR increased from $110K in January to $185K in June.",
                "Average ARPU reached $21.1 per Premium user.",
                "Net MRR retention is positive due to high upgrades."
            ],
            "root_cause": "Expansion from Premium upgrades and family plan conversions outweighs monthly subscription cancelations.",
            "business_impact": "Positive net revenue retention supports long-term operating profit margin expansion.",
            "recommendations": [
                "Launch high-value add-ons (Lossless Audio) to top-tier Premium subscribers.",
                "Automate dunning emails to prevent involuntary churn on expired cards."
            ],
            "confidence_level": "High",
            "confidence_score": 89,
            "follow_ups": [
                "Forecast next month MRR",
                "Show churn by customer segment",
                "Which features correlate with paid conversion?",
            ],
        }

    if intent == "churnAnalysis":
        return {
            "intent": "Churn Analysis",
            "metric_affected": "Subscriber Churn Rate",
            "answer": "Monthly churn has steadily declined over the last five months, dropping from 4.8% in February to 3.6% in June.",
            "chart_type": "line",
            "chart_data": [{"date": item["date"], "churn": item["churn"]} for item in REVENUE_TREND if item["date"] != "Jan"],
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
            "key_findings": [
                "Churn improved to 3.6% in June, a 25% relative reduction from February.",
                "Upgraded payment processors reduced involuntary credit card failures.",
                "Premium cohort exhibits lower churn than family subscription plans."
            ],
            "root_cause": "Consistent updates to recommendation search engine increased overall time spent.",
            "business_impact": "Lower churn rate increases lifetime value (LTV) and boosts enterprise valuation.",
            "recommendations": [
                "Trigger NPS survey alerts when a subscriber uses search less than twice weekly.",
                "Introduce annual prepayment discounts to lock in sticky cohorts."
            ],
            "confidence_level": "High",
            "confidence_score": 91,
            "follow_ups": [
                "Show churn by plan type",
                "What is the average customer lifetime value (LTV)?"
            ]
        }

    if intent == "featureAdoption":
        return {
            "intent": "Feature Adoption",
            "metric_affected": "Weekly Feature Adoption",
            "answer": "Playlists has the highest weekly adoption rate at 76%, followed closely by Smart Search at 68%. Lyrics Translation is the lowest at 42%.",
            "chart_type": "bar",
            "chart_data": [
                {"feature": item["feature"], "adoption": item["retention"] - 5} for item in RETENTION_BY_FEATURE if item["feature"] != "Recommendations"
            ],
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
            "key_findings": [
                "Playlists adoption leads at 76% of active signups.",
                "Smart Search is adopted by 68% of users.",
                "Lyrics Translation exhibits low repeat usage (42% adoption)."
            ],
            "root_cause": "Onboarding flow directs users directly to create a playlist upon signup.",
            "business_impact": "Feature adoption correlates directly with long-term subscription retention.",
            "recommendations": [
                "Expose Playlists shortcuts on the home page dashboard.",
                "Incorporate Lyrics search hints to drive Smart Search usage."
            ],
            "confidence_level": "High",
            "confidence_score": 90,
            "follow_ups": [
                "Which onboarding step improves adoption?",
                "Show adoption of Offline Sync over time"
            ]
        }

    if intent == "engagementByFeature":
        return {
            "intent": "Engagement by Feature",
            "metric_affected": "Session duration by feature",
            "answer": "Users spend the most time engaging with Playlists (averaging 14.5 minutes per session), compared to 11.2 minutes for Smart Search.",
            "chart_type": "bar",
            "chart_data": [
                {"feature": item["feature"], "avgSessionMin": item["session_min"] / 3} for item in RETENTION_BY_FEATURE
            ],
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
            "key_findings": [
                "Playlists sessions average 14.5 minutes.",
                "Smart Search session interaction average is 11.2 minutes.",
                "Lyrics Translation sessions remain short (6.4 minutes)."
            ],
            "root_cause": "Playlist listening loops create passive continuous audio streams.",
            "business_impact": "High session duration drives ad conversions for Free users and retention for Premium users.",
            "recommendations": [
                "Optimize playlist loading times to prevent stream abandonment.",
                "Recommend similar albums when a playlist finishes playing."
            ],
            "confidence_level": "Medium",
            "confidence_score": 87,
            "follow_ups": [
                "Compare engagement by plan type",
                "Which feature leads to longest sessions?"
            ]
        }

    if intent == "genreCountryAnalysis":
        genre_data = [
            {"country": "India", "streams": 95000, "genre": "Bollywood"},
            {"country": "USA", "streams": 85000, "genre": "Pop"},
            {"country": "UK", "streams": 62000, "genre": "Rock"},
            {"country": "Germany", "streams": 55000, "genre": "Electronic"},
            {"country": "Japan", "streams": 48000, "genre": "J-Pop"}
        ]
        return {
            "intent": "Genre Country Analytics",
            "metric_affected": "Genre Streams by Country",
            "answer": "Bollywood is the most listened genre in India (95K streams), Pop in USA (85K streams), Rock in UK (62K streams), Electronic in Germany (55K streams), and J-Pop in Japan (48K streams).",
            "chart_type": "bar",
            "chart_data": genre_data,
            "generated_query": "SELECT country, genre, count(*) as streams FROM streams_history GROUP BY country, genre ORDER BY streams DESC;",
            "insights": [
                Insight(
                    title="India dominates streaming volume via Bollywood",
                    summary="Bollywood tracks represent 95K streams, making India the highest streaming country by single-genre density.",
                    confidence=94,
                    recommendation="Increase South Asian local artist catalog acquisitions.",
                    priority="High"
                )
            ],
            "key_findings": [
                "India leads in single-genre streaming density via Bollywood.",
                "Pop music has global dominance in Western regions (USA/UK).",
                "J-Pop remains a highly isolated local market trend in Japan."
            ],
            "root_cause": "CURATED regional playlist editorial placements and localized artist promotion campaigns.",
            "business_impact": "Localized genre streaming feeds regional ad-insertion efficiency and Premium upgrade pipelines.",
            "recommendations": [
                "Partner with Indian music labels to secure early release tracks.",
                "Promote global crossover Pop playlists to US Premium cohorts."
            ],
            "confidence_level": "High",
            "confidence_score": 94,
            "follow_ups": [
                "Which language is listened to the most?",
                "Show genre trends in Germany"
            ]
        }

    if intent == "languageAnalysis":
        lang_data = [
            {"language": "English", "shares": 52},
            {"language": "Spanish", "shares": 22},
            {"language": "Hindi", "shares": 14},
            {"language": "Japanese", "shares": 8},
            {"language": "Others", "shares": 4}
        ]
        return {
            "intent": "Language Analytics",
            "metric_affected": "Music Language Streams Share",
            "answer": "English is the most listened language representing 52% of total music stream shares, followed by Spanish at 22% and Hindi at 14%.",
            "chart_type": "bar",
            "chart_data": lang_data,
            "generated_query": "SELECT track_language, count(*) * 100.0 / sum(count(*)) over() as share FROM track_streams GROUP BY track_language ORDER BY share DESC;",
            "insights": [
                Insight(
                    title="Spanish track popularity shows global crossover",
                    summary="Spanish tracks represent 22% of total shares, indicating strong cross-border growth.",
                    confidence=91,
                    recommendation="Recommend Spanish crossover tracks to English listening cohorts.",
                    priority="Medium"
                )
            ],
            "key_findings": [
                "English remains the global baseline with 52% of streams.",
                "Spanish is the fastest-growing global language share at 22%.",
                "Hindi shares are concentrated but have extremely high session repeat rates."
            ],
            "root_cause": "Global popularity of Latin pop and South Asian classical music crossover trends.",
            "business_impact": "Language crossover boosts average session duration through globalized recommendations.",
            "recommendations": [
                "Introduce Spanish-English crossover radio stations.",
                "Offer localized lyric translation features for global Spanish hits."
            ],
            "confidence_level": "High",
            "confidence_score": 91,
            "follow_ups": [
                "What is the most listened genre country wise?",
                "Which language has the highest skip rate?"
            ]
        }

    if intent == "searchKeywordAnalysis":
        keyword_data = [
            {"keyword": "Lo-Fi Beats", "searches": 28400, "conversion": 82},
            {"keyword": "Summer Hits", "searches": 22100, "conversion": 78},
            {"keyword": "Chill Vibes", "searches": 19500, "conversion": 80},
            {"keyword": "Gym Workout", "searches": 15600, "conversion": 74},
            {"keyword": "Sad Songs", "searches": 12200, "conversion": 85}
        ]
        return {
            "intent": "Search Keyword Analytics",
            "metric_affected": "Top Search Keywords & Stream Conversions",
            "answer": "The most common keyword typed in the search bar is 'Lo-Fi Beats' (28.4K searches) with a conversion rate of 82% to play song. 'Sad Songs' has the highest conversion rate to stream at 85%.",
            "chart_type": "table",
            "chart_data": keyword_data,
            "generated_query": "SELECT query_keyword, count(*) as searches, avg(converted_to_stream) as conversion FROM search_events GROUP BY query_keyword ORDER BY searches DESC LIMIT 5;",
            "insights": [
                Insight(
                    title="Mood keywords drive high stream conversion",
                    summary="Mood searches ('Sad Songs', 'Lo-Fi Beats') convert to play actions 10% more efficiently than generic keywords.",
                    confidence=92,
                    recommendation="Pre-load mood recommendation chips in the search panel.",
                    priority="High"
                )
            ],
            "key_findings": [
                "'Lo-Fi Beats' is the top searched term with 28.4K inquiries.",
                "'Sad Songs' leads stream conversions at 85%.",
                "Workout-related terms show slightly higher bounce rates (74% conversion)."
            ],
            "root_cause": "Contextual study/exercise user intents drive mood-based search queries.",
            "business_impact": "Optimizing search-to-stream conversions reduces navigation friction and extends active sessions.",
            "recommendations": [
                "Create and feature official playlist radios matching the top searches.",
                "Optimize search indexing algorithms to rank playlist matches above individual tracks."
            ],
            "confidence_level": "High",
            "confidence_score": 92,
            "follow_ups": [
                "Show search keywords by device type",
                "What is the average time to start streaming after search?"
            ]
        }

    if intent == "planDistributionAnalysis":
        dist_data = [
            {"stage": "Total Active Users", "users": 125000},
            {"stage": "Freemium Users", "users": 87000},
            {"stage": "Paid Subscribers", "users": 38000}
        ]
        return {
            "intent": "Plan Distribution Analytics",
            "metric_affected": "Freemium vs Premium Plan Distribution",
            "answer": "Out of 125,000 active users, 87,000 (69.6%) are using the Freemium tier, while 38,000 (30.4%) have active Paid Premium Subscriptions.",
            "chart_type": "funnel",
            "chart_data": dist_data,
            "generated_query": "SELECT plan_type, count(distinct user_id) FROM users GROUP BY plan_type;",
            "insights": [
                Insight(
                    title="Paid Premium subscription conversion is stable",
                    summary="Paid subscribers represent 30.4% of total base, aligning with long-term SaaS monetization goals.",
                    confidence=95,
                    recommendation="Target freemium cohorts streaming >2 hours daily with premium upgrade trials.",
                    priority="High"
                )
            ],
            "key_findings": [
                "Freemium users account for 87,000 (69.6%) of active pool.",
                "Premium paid subscribers reached 38,000 (30.4%).",
                "Conversion rate of free-to-paid users increased by 7.0% YoY."
            ],
            "root_cause": "Effective expansion triggers and family upgrade bundle campaigns.",
            "business_impact": "Strong premium percentage protects operating profit margins and pays label royalties.",
            "recommendations": [
                "Increase premium upgrade prompts when a user plays a skip-restricted free song.",
                "Introduce student plans to convert price-sensitive student freemium segments."
            ],
            "confidence_level": "High",
            "confidence_score": 95,
            "follow_ups": [
                "Compare Premium vs Free retention",
                "What is the average upgrade conversion rate?"
            ]
        }

    return {
        "intent": "Product Health Overview",
        "metric_affected": "Product Health Portfolio",
        "answer": "The product is growing revenue and retention, but engagement softened in late June. The highest priority is diagnosing the DAU decline while amplifying the Playlists retention loop.",
        "chart_type": "table",
        "chart_data": overview_metrics(),
        "generated_query": "SELECT metric, value, delta FROM product_health_snapshot;",
        "insights": base_insights(),
        "key_findings": [
            "MRR grew to $185K, representing solid financial growth.",
            "Day 30 retention remains robust at an average of 81%.",
            "Daily Active Users decreased by 3.0% over the last week."
        ],
        "root_cause": "A combination of marketing campaign cooldown and minor latencies on onboarding step 3.",
        "business_impact": "Positive overall revenue progress, but softened engagement may create churn drag in future months.",
        "recommendations": [
            "Address database latency during onboarding step 3.",
            "Integrate smart search recommendations to enhance passive session lengths."
        ],
        "confidence_level": "High",
        "confidence_score": 91,
        "follow_ups": [
            "Which feature has the highest retention?",
            "Why did engagement drop this week?",
            "Show MRR trend"
        ]
    }
