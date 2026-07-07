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

interface Intent {
  name: string;
  functionName: string;
  keywords: Record<string, number>;
  phrases: RegExp[];
  negativeKeywords: Record<string, number>;
  paramExtractors?: Record<string, (q: string) => string | null>;
}

const FEATURE_NAMES = ["notes", "ai search", "ocr scanner", "ai summary", "templates", "export"];

function extractFeature(q: string): string | null {
  for (const f of FEATURE_NAMES) {
    if (q.includes(f)) {
      return f.charAt(0).toUpperCase() + f.slice(1);
    }
  }
  return null;
}

function extractPlanMetric(q: string): string {
  if (["revenue", "arpu", "pay", "spend"].some(t => q.includes(t))) {
    return "weeklyRevenuePerUser";
  }
  if (["session", "time spent", "engagement time"].some(t => q.includes(t))) {
    return "avgSessionMin";
  }
  return "retentionDay30";
}

function extractRetentionWindow(q: string): string | null {
  if (q.includes("day 1") || q.includes("day1") || q.includes("first day")) {
    return "day1";
  }
  if (q.includes("day 7") || q.includes("day7") || q.includes("week")) {
    return "day7";
  }
  return "day30";
}

const INTENTS: Intent[] = [
  {
    name: "retention_by_feature",
    functionName: "retentionByFeature",
    keywords: { retention: 3, retain: 3, retained: 3 },
    phrases: [
      /which feature.*(highest|best|most).*retention/,
      /retention by feature/,
      /feature.*retention/
    ],
    negativeKeywords: { premium: 2.5, free: 2.5, plan: 2, vs: 1.5, versus: 1.5 },
    paramExtractors: { window: extractRetentionWindow }
  },
  {
    name: "plan_comparison",
    functionName: "planComparison",
    keywords: { premium: 3, free: 2.5, compare: 2, vs: 2, versus: 2 },
    phrases: [/compare.*(premium|free)/, /(premium|free).*vs.*(premium|free)/],
    negativeKeywords: {},
    paramExtractors: { metric: extractPlanMetric }
  },
  {
    name: "engagement_drop",
    functionName: "engagementDropDiagnosis",
    keywords: { drop: 3, decrease: 3, why: 2.5, declin: 2.5, fell: 2 },
    phrases: [
      /why (did|is|has).*(drop|decreas|declin|fell)/,
      /engagement.*(drop|down|fell)/
    ],
    negativeKeywords: {}
  },
  {
    name: "dau_trend",
    functionName: "dauTrend",
    keywords: { dau: 3, "daily active": 3, trend: 1.5, "over time": 1.5, "60 days": 2 },
    phrases: [/dau.*(last|past|over)/, /daily active users.*(trend|last|past)/],
    negativeKeywords: { why: 2.5, drop: 2 }
  },
  {
    name: "funnel",
    functionName: "funnelAnalysis",
    keywords: { funnel: 3, "drop off": 3, dropoff: 3, checkout: 2, conversion: 1.5 },
    phrases: [/where.*(drop off|dropoff|do users leave)/, /funnel/],
    negativeKeywords: {}
  },
  {
    name: "acquisition",
    functionName: "acquisitionChannels",
    keywords: { channel: 3, acquisition: 3, campaign: 3, convert: 1.5, source: 1.5 },
    phrases: [/(best|top).*channel/, /acquisition channel/, /(best|top).*campaign/],
    negativeKeywords: {}
  },
  {
    name: "revenue",
    functionName: "revenueMetrics",
    keywords: { mrr: 3, arpu: 3, ltv: 3, revenue: 2 },
    phrases: [/\b(mrr|arpu|ltv)\b/, /revenue metrics/],
    negativeKeywords: { premium: 1.5, free: 1.5, feature: 1.5 }
  },
  {
    name: "churn",
    functionName: "churnAnalysis",
    keywords: { churn: 3, cancel: 2 },
    phrases: [/churn rate/, /why.*(people|users|customers).*(leav|cancel)/],
    negativeKeywords: {}
  },
  {
    name: "feature_adoption",
    functionName: "featureAdoption",
    keywords: { adoption: 3, "most popular": 2.5, "least used": 2.5 },
    phrases: [/(most|highest) (popular|adopt)/, /weekly adoption/],
    negativeKeywords: { retention: 2.5 }
  },
  {
    name: "engagement_by_feature",
    functionName: "engagementByFeature",
    keywords: { session: 2, "active users": 2, "most active": 3 },
    phrases: [/(average|avg) session/, /most active/],
    negativeKeywords: { drop: 2.5, why: 2 }
  }
];

const PHRASE_MATCH_BONUS = 4.0;
const CONFIDENCE_THRESHOLD = 3.0;
const AMBIGUITY_MARGIN = 1.0;

export function getFallbackQueryResponse(question: string): QueryResponse {
  const q = question.toLowerCase().trim();
  const scored: { score: number; intent: Intent }[] = [];

  for (const intent of INTENTS) {
    let score = 0.0;
    for (const [kw, weight] of Object.entries(intent.keywords)) {
      if (q.includes(kw)) {
        score += weight;
      }
    }
    for (const pattern of intent.phrases) {
      if (pattern.test(q)) {
        score += PHRASE_MATCH_BONUS;
      }
    }
    for (const [nkw, penalty] of Object.entries(intent.negativeKeywords)) {
      if (q.includes(nkw)) {
        score -= penalty;
      }
    }
    if (score > 0) {
      scored.push({ score, intent });
    }
  }

  if (scored.length === 0) {
    return {
      question,
      intent: "Clarification Required",
      answer: "I'm not fully sure what you're asking. Try rephrasing, or pick a suggested question.",
      chart_type: "table",
      chart_data: [],
      generated_query: "-- Unresolved query detected",
      insights: [],
      follow_ups: [
        "Which feature has the highest retention?",
        "Why did engagement drop this week?",
        "Show me DAU over the last 60 days",
        "Where do users drop off in the funnel?"
      ]
    };
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];

  if (top.score < CONFIDENCE_THRESHOLD) {
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
        "Why did engagement drop this week?",
        "Show me DAU over the last 60 days",
        "Where do users drop off in the funnel?"
      ]
    };
  }

  if (scored.length > 1 && (top.score - scored[1].score) < AMBIGUITY_MARGIN) {
    const candidates = [scored[0].intent.name, scored[1].intent.name];
    return {
      question,
      intent: "Clarification Required",
      answer: "Did you mean one of the following product metric analysis views?",
      chart_type: "table",
      chart_data: [],
      generated_query: "-- Ambiguous query detected",
      insights: [],
      follow_ups: candidates.map(c => 
        c === "retention_by_feature" ? "Which feature has the highest retention?" :
        c === "plan_comparison" ? "Compare retention between Premium and Free users" :
        c === "engagement_drop" ? "Why did engagement drop this week?" :
        c === "dau_trend" ? "Show me DAU over the last 60 days" :
        c === "funnel" ? "Where do users drop off in the funnel?" :
        c === "acquisition" ? "Which acquisition channel converts best?" :
        c === "revenue" ? "What's our MRR?" :
        c === "churn" ? "What's our churn rate?" :
        c === "feature_adoption" ? "Which feature has the highest weekly adoption?" :
        "Average session duration by feature?"
      )
    };
  }

  return getMatchedIntentResponse(top.intent.functionName, question);
}

function getMatchedIntentResponse(intent: string, question: string): QueryResponse {
  if (intent === "retentionByFeature") {
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
  if (intent === "planComparison") {
    return {
      question,
      intent: "Plan Comparison",
      answer: "Premium users exhibit significantly stronger 30-day retention (85% vs 62%) and double the average session length compared to Free tier users.",
      chart_type: "bar",
      chart_data: [
        { cohort: "Premium", retention: 85, avgSessionMin: 18.4, weeklyRevenuePerUser: 4.5 },
        { cohort: "Free", retention: 62, avgSessionMin: 9.2, weeklyRevenuePerUser: 0.0 }
      ],
      insights: [
        {
          title: "Premium cohort shows high stickiness",
          summary: "Premium users generate 85% Day 30 retention and consume twice as much session time, validating paid feature value.",
          confidence: 94,
          recommendation: "Push free-trial upgrades to Free tier users when they exceed 3 active days.",
          priority: "High"
        }
      ],
      generated_query: "SELECT plan_type, avg(retention_30d), avg(session_duration) FROM user_cohorts GROUP BY plan_type;",
      follow_ups: ["Segment retention by feature for Premium users", "What is the upgrade conversion rate?"]
    };
  }
  if (intent === "engagementDropDiagnosis") {
    return {
      question,
      intent: "Engagement Drop Diagnosis",
      answer: "The engagement drop after June 15 was driven primarily by a 14% decline in average daily active users and a corresponding reduction in session length.",
      chart_type: "line",
      chart_data: fallbackOverview.engagement_trend,
      insights: [fallbackOverview.insights[1]],
      generated_query: "SELECT date, dau, avg_minutes FROM engagement_weekly WHERE date >= 'Jun 15' ORDER BY date ASC;",
      follow_ups: ["Check server response times after June 15", "Compare mobile vs web app engagement drops"]
    };
  }
  if (intent === "dauTrend") {
    return {
      question,
      intent: "DAU Trend",
      answer: "Daily Active Users peaked at 20.1K on June 08 before decreasing to 17.6K by the end of the month.",
      chart_type: "line",
      chart_data: fallbackOverview.engagement_trend.map(item => ({ date: item.date, dau: item.dau })),
      insights: [fallbackOverview.insights[1]],
      generated_query: "SELECT date, dau FROM daily_active_users ORDER BY date ASC LIMIT 60;",
      follow_ups: ["Why is DAU decreasing?", "Show weekly active users (WAU) trend"]
    };
  }
  if (intent === "funnelAnalysis") {
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
  if (intent === "acquisitionChannels") {
    return {
      question,
      intent: "Acquisition Channels",
      answer: "Paid Ads drive the highest conversion rate at 24.2%, but Organic Search drives the largest absolute volume of active users (15.2K).",
      chart_type: "bar",
      chart_data: [
        { channel: "Organic Search", users: 15200, conversion: 18.5 },
        { channel: "Paid Ads", users: 12800, conversion: 24.2 },
        { channel: "Referrals", users: 8400, conversion: 14.1 },
        { channel: "Direct", users: 9500, conversion: 11.2 }
      ],
      insights: [
        {
          title: "Paid Ads conversions are highly efficient",
          summary: "Paid channels yield a 24.2% conversion rate, which is 5.7 percentage points higher than organic search.",
          confidence: 88,
          recommendation: "Increase paid advertising budget for the top-performing campaigns.",
          priority: "Medium"
        }
      ],
      generated_query: "SELECT channel, count(*), avg(conversion) FROM user_signups GROUP BY channel ORDER BY count(*) DESC;",
      follow_ups: ["Show conversion trends by campaign", "What is the cost per acquisition (CAC)?"]
    };
  }
  if (intent === "revenueMetrics") {
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
  if (intent === "churnAnalysis") {
    return {
      question,
      intent: "Churn Analysis",
      answer: "Monthly churn has steadily declined over the last five months, dropping from 4.8% in February to 3.6% in June.",
      chart_type: "line",
      chart_data: [
        { date: "Feb", churn: 4.8 },
        { date: "Mar", churn: 4.4 },
        { date: "Apr", churn: 4.1 },
        { date: "May", churn: 3.8 },
        { date: "Jun", churn: 3.6 }
      ],
      insights: [
        {
          title: "Churn is on a steady downward path",
          summary: "Customer churn improved to 3.6% in June, showing strong progress in product stickiness.",
          confidence: 91,
          recommendation: "Roll out NPS surveys to active cohorts to identify remaining churn risks.",
          priority: "Medium"
        }
      ],
      generated_query: "SELECT month, churn_rate FROM revenue_metrics ORDER BY month ASC;",
      follow_ups: ["Show churn by plan type", "What is the average customer lifetime value (LTV)?"]
    };
  }
  if (intent === "featureAdoption") {
    return {
      question,
      intent: "Feature Adoption",
      answer: "Notes has the highest weekly adoption rate at 76%, followed closely by AI Search at 68%. AI Summary is the lowest at 42%.",
      chart_type: "bar",
      chart_data: [
        { feature: "Notes", adoption: 76 },
        { feature: "AI Search", adoption: 68 },
        { feature: "OCR Scanner", adoption: 54 },
        { feature: "AI Summary", adoption: 42 }
      ],
      insights: [
        {
          title: "Notes dominates user adoption",
          summary: "Notes is adopted by 76% of active users within their first week.",
          confidence: 90,
          recommendation: "Feature Notes prominently in the user onboarding tour.",
          priority: "High"
        }
      ],
      generated_query: "SELECT feature, adoption_rate FROM feature_adoption ORDER BY adoption_rate DESC;",
      follow_ups: ["Which onboarding step improves adoption?", "Show adoption of OCR Scanner over time"]
    };
  }
  // engagementByFeature
  return {
    question,
    intent: "Engagement by Feature",
    answer: "Users spend the most time engaging with Notes (averaging 14.5 minutes per session), compared to 11.2 minutes for AI Search.",
    chart_type: "bar",
    chart_data: [
      { feature: "Notes", avgSessionMin: 14.5 },
      { feature: "AI Search", avgSessionMin: 11.2 },
      { feature: "OCR Scanner", avgSessionMin: 8.9 },
      { feature: "AI Summary", avgSessionMin: 6.4 }
    ],
    insights: [
      {
        title: "Notes session duration is highly sticky",
        summary: "Notes leads average session time at 14.5 minutes, showing deeper user engagement.",
        confidence: 87,
        recommendation: "Optimize Notes load times and editor speed to keep engagement high.",
        priority: "Medium"
      }
    ],
    generated_query: "SELECT feature, avg(session_duration) FROM feature_sessions GROUP BY feature ORDER BY avg(session_duration) DESC;",
    follow_ups: ["Compare engagement by plan type", "Which feature leads to longest sessions?"]
  };
}

