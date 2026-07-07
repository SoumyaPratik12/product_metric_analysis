import type { ExecutiveReport, Integration, Overview, QueryResponse } from "./types";

export const fallbackOverview: Overview = {
  metrics: [
    { label: "Daily Active Users", value: "17,680", delta: "-3.0%", trend: "down", detail: "Week-over-week movement" },
    { label: "30-Day Retention", value: "70%", delta: "+3.4%", trend: "up", detail: "Average across tracked features" },
    { label: "Monthly Recurring Revenue", value: "$132.4K", delta: "+11.4%", trend: "up", detail: "Net of expansion and churn" },
    { label: "Churn Risk", value: "3.6%", delta: "-0.2%", trend: "up", detail: "Lower is better" },
  ],
  retention_by_feature: [
    { feature: "Notes", retention: 81, active_users: 18420 },
    { feature: "AI Search", retention: 74, active_users: 14380 },
    { feature: "OCR Scanner", retention: 69, active_users: 11220 },
    { feature: "AI Summary", retention: 55, active_users: 16740 },
  ],
  funnel: [
    { stage: "Signup", users: 52000, conversion: 100 },
    { stage: "Onboarding", users: 42120, conversion: 81 },
    { stage: "First Insight", users: 30160, conversion: 58 },
    { stage: "Dashboard Saved", users: 19480, conversion: 37 },
    { stage: "Invite Sent", users: 12380, conversion: 24 },
  ],
  engagement_trend: [
    { date: "Jun 01", dau: 18920, sessions: 49300, avg_minutes: 12.6 },
    { date: "Jun 08", dau: 20180, sessions: 52840, avg_minutes: 13.2 },
    { date: "Jun 15", dau: 19640, sessions: 50120, avg_minutes: 12.8 },
    { date: "Jun 22", dau: 18220, sessions: 46380, avg_minutes: 11.4 },
    { date: "Jun 29", dau: 17680, sessions: 44890, avg_minutes: 10.9 },
  ],
  revenue_trend: [
    { date: "Feb", mrr: 82000, arpu: 18.2, churn: 4.8 },
    { date: "Mar", mrr: 91500, arpu: 18.9, churn: 4.4 },
    { date: "Apr", mrr: 104200, arpu: 19.6, churn: 4.1 },
    { date: "May", mrr: 118900, arpu: 20.4, churn: 3.8 },
    { date: "Jun", mrr: 132400, arpu: 21.1, churn: 3.6 },
  ],
  insights: [
    {
      title: "Notes drives the strongest long-term retention",
      summary: "Users who adopt Notes keep returning at an 81% 30-day retention rate.",
      confidence: 92,
      recommendation: "Move Notes earlier in onboarding and use it as the default success moment.",
      priority: "High",
    },
    {
      title: "Engagement softened after June 15",
      summary: "DAU and average session minutes both declined for two consecutive weekly periods.",
      confidence: 84,
      recommendation: "Compare app version, login latency, and notification CTR after June 15.",
      priority: "High",
    },
  ],
};

export const fallbackQuery: QueryResponse = {
  question: "Which feature has the highest retention?",
  intent: "Retention Analysis",
  answer: "Notes has the highest 30-day retention at 81%. The next best feature is AI Search at 74%.",
  chart_type: "bar",
  chart_data: fallbackOverview.retention_by_feature,
  insights: fallbackOverview.insights,
  generated_query: "SELECT feature, retention_30d, active_users FROM feature_retention ORDER BY retention_30d DESC;",
  follow_ups: ["Compare Premium vs Free retention", "Show Day 7 retention by feature", "Which onboarding step improves retention?"],
};

export const fallbackIntegrations: Integration[] = [
  { name: "PostgreSQL", category: "Warehouse", status: "connected", last_sync: "6 min ago" },
  { name: "Stripe", category: "Revenue", status: "connected", last_sync: "14 min ago" },
  { name: "Amplitude", category: "Product Analytics", status: "syncing", last_sync: "Running now" },
  { name: "BigQuery", category: "Warehouse", status: "available", last_sync: "Not connected" },
  { name: "Slack", category: "Alerts", status: "available", last_sync: "Not connected" },
];

export const fallbackReport: ExecutiveReport = {
  title: "Weekly Product Intelligence Brief",
  period: "June 22-29, 2026",
  highlights: [
    "MRR reached $132.4K with churn improving to 3.6%.",
    "Notes remains the strongest retention driver at 81% 30-day retention.",
    "Revenue growth is healthy despite softer engagement in the latest week.",
  ],
  risks: [
    "DAU declined for two consecutive weekly periods.",
    "AI Summary retention trails other adopted features.",
  ],
  recommended_actions: [
    "Investigate login latency, notification CTR, and release changes after June 15.",
    "Move Notes into the first-run experience for new workspaces.",
  ],
  metrics: fallbackOverview.metrics,
};

export function getFallbackQueryResponse(question: string): QueryResponse {
  const normalized = question.toLowerCase().trim();

  // Weighted keywords configurations
  const intents = {
    retention: {
      keywords: ["retention", "retain", "cohort", "feature", "retained"],
      negatives: ["mrr", "revenue", "churn", "funnel", "dropoff", "drop off", "conversion", "arpu"],
      regex: [/which feature.*highest.*retention/, /highest.*retention/, /retention.*feature/]
    },
    funnel: {
      keywords: ["funnel", "dropoff", "drop-off", "conversion", "signup", "onboarding", "invite"],
      negatives: ["mrr", "revenue", "churn", "retention", "dau", "arpu"],
      regex: [/where.*drop off.*funnel/, /drop off.*funnel/, /funnel.*conversion/, /where do users drop off/]
    },
    revenue: {
      keywords: ["revenue", "mrr", "arr", "arpu", "churn", "plan", "pricing"],
      negatives: ["retention", "funnel", "onboarding", "dau", "session"],
      regex: [/show.*revenue.*trend/, /revenue.*trend/, /mrr.*trend/, /churn.*rate/]
    },
    engagement: {
      keywords: ["dau", "engagement", "session", "active", "minutes", "average"],
      negatives: ["mrr", "revenue", "churn", "funnel", "arpu"],
      regex: [/why.*engagement.*decrease/, /dau.*decrease/, /engagement.*decrease/, /why did engagement decrease/]
    }
  };

  // Check regex matches first, unless a negative keyword is present
  for (const [intentName, config] of Object.entries(intents)) {
    const hasNegative = config.negatives.some(neg => normalized.includes(neg));
    if (hasNegative) continue;

    for (const pattern of config.regex) {
      if (pattern.test(normalized)) {
        return getMatchedIntentResponse(intentName, question);
      }
    }
  }

  // Scoring
  const scores: Record<string, number> = {};
  for (const [intentName, config] of Object.entries(intents)) {
    let score = 0.0;
    for (const kw of config.keywords) {
      if (normalized.includes(kw)) {
        score += kw === "feature" || kw === "active" || kw === "average" ? 1.5 : 5.0;
      }
    }
    for (const neg of config.negatives) {
      if (normalized.includes(neg)) {
        score -= 8.0;
      }
    }
    scores[intentName] = score;
  }

  // Sort by score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = sorted[0];
  const [secondIntent, secondScore] = sorted[1];

  if (topScore < 2.0) {
    return {
      question,
      intent: "Clarification Required",
      answer: "I'm not fully sure what you're asking. Try rephrasing, or pick a suggested question.",
      chart_type: "table",
      chart_data: [],
      generated_query: "-- Low confidence query detected",
      insights: [],
      follow_ups: [
        "Which feature has the highest retention?",
        "Why did engagement decrease this week?",
        "Show revenue trend",
        "Where do users drop off in the funnel?"
      ]
    };
  }

  if (topScore - secondScore < 1.5) {
    const candidates = [topIntent, secondIntent];
    return {
      question,
      intent: "Clarification Required",
      answer: "Did you mean one of the following product metric analysis views?",
      chart_type: "table",
      chart_data: [],
      generated_query: "-- Ambiguous query detected",
      insights: [],
      follow_ups: candidates.map(c => 
        c === "retention" ? "Which feature has the highest retention?" :
        c === "revenue" ? "Show revenue trend" :
        c === "funnel" ? "Where do users drop off in the funnel?" :
        "Why did engagement decrease this week?"
      )
    };
  }

  return getMatchedIntentResponse(topIntent, question);
}

function getMatchedIntentResponse(intent: string, question: string): QueryResponse {
  if (intent === "retention") {
    return {
      question,
      intent: "Retention Analysis",
      answer: "Notes has the highest 30-day retention at 81%. The next best feature is AI Search at 74%.",
      chart_type: "bar",
      chart_data: fallbackOverview.retention_by_feature,
      insights: fallbackOverview.insights,
      generated_query: "SELECT feature, retention_30d, active_users FROM feature_retention ORDER BY retention_30d DESC;",
      follow_ups: ["Compare Premium vs Free retention", "Show Day 7 retention by feature", "Which onboarding step improves retention?"],
    };
  }
  if (intent === "funnel") {
    return {
      question,
      intent: "Funnel Diagnosis",
      answer: "The largest cumulative drop happens before First Insight, where only 58% of signup users remain in the journey.",
      chart_type: "funnel",
      chart_data: fallbackOverview.funnel,
      insights: [
        {
          title: "First Insight is the activation bottleneck",
          summary: "The product loses 23 percentage points between onboarding and first insight generation.",
          confidence: 86,
          recommendation: "Shorten the first-query path and add templates for common product analytics questions.",
          priority: "High",
        }
      ],
      generated_query: "SELECT stage, users, conversion_rate FROM activation_funnel ORDER BY stage_order ASC;",
      follow_ups: [
        "Segment this funnel by acquisition channel",
        "Show drop-off by plan type",
        "What should we change in onboarding?",
      ],
    };
  }
  if (intent === "revenue") {
    return {
      question,
      intent: "Revenue Analytics",
      answer: "MRR grew to $132.4K in June while churn improved to 3.6%, indicating expansion is outstripping customer loss.",
      chart_type: "line",
      chart_data: fallbackOverview.revenue_trend,
      insights: [
        {
          title: "Revenue quality is improving",
          summary: "MRR, ARPU, and churn are all moving in healthy directions across the latest period.",
          confidence: 89,
          recommendation: "Prioritize expansion prompts for teams that saved at least three dashboards.",
          priority: "Medium",
        }
      ],
      generated_query: "SELECT month, mrr, arpu, churn_rate FROM revenue_metrics ORDER BY month ASC;",
      follow_ups: [
        "Forecast next month MRR",
        "Show churn by customer segment",
        "Which features correlate with paid conversion?",
      ],
    };
  }
  // engagement
  return {
    question,
    intent: "Engagement Root Cause",
    answer: "DAU decreased from 20,180 to 17,680 over the second half of June, while sessions and average minutes also declined.",
    chart_type: "line",
    chart_data: fallbackOverview.engagement_trend,
    insights: [fallbackOverview.insights[1]],
    generated_query: "SELECT week, dau, sessions, avg_minutes FROM engagement_weekly ORDER BY week ASC;",
    follow_ups: [
      "Why did DAU decrease this week?",
      "Compare engagement by feature",
      "Show active users by plan",
    ],
  };
}

