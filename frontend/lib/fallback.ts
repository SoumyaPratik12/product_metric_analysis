import type { ExecutiveReport, Integration, Overview, QueryResponse } from "./types";

export const fallbackOverview: Overview = {
  metrics: [
    { label: "Daily Active Users", value: "23,680", delta: "-3.0%", trend: "down", detail: "Week-over-week movement" },
    { label: "30-Day Retention", value: "81%", delta: "+3.4%", trend: "up", detail: "Average across tracked features" },
    { label: "Monthly Recurring Revenue", value: "$185.0K", delta: "+11.4%", trend: "up", detail: "Net of expansion and churn" },
    { label: "Churn Risk", value: "3.6%", delta: "-0.2%", trend: "up", detail: "Lower is better" },
  ],
  retention_by_feature: [
    { feature: "Playlists", retention: 81, active_users: 42120 },
    { feature: "Smart Search", retention: 74, active_users: 35380 },
    { feature: "Offline Sync", retention: 69, active_users: 28220 },
    { feature: "Lyrics Translation", retention: 55, active_users: 36740 },
  ],
  funnel: [
    { stage: "Signup", users: 125000, conversion: 100 },
    { stage: "Onboarding", users: 101250, conversion: 81 },
    { stage: "Play Song", users: 72500, conversion: 58 },
    { stage: "Create Playlist", users: 46250, conversion: 37 },
    { stage: "Share Playlist", users: 30000, conversion: 24 },
  ],
  engagement_trend: [
    { date: "Jun 01", dau: 24920, sessions: 49300, avg_minutes: 12.6 },
    { date: "Jun 08", dau: 26180, sessions: 52840, avg_minutes: 13.2 },
    { date: "Jun 15", dau: 25640, sessions: 50120, avg_minutes: 12.8 },
    { date: "Jun 22", dau: 24220, sessions: 46380, avg_minutes: 11.4 },
    { date: "Jun 29", dau: 23680, sessions: 44890, avg_minutes: 10.9 },
  ],
  revenue_trend: [
    { date: "Feb", mrr: 125000, arpu: 18.2, churn: 4.8 },
    { date: "Mar", mrr: 142000, arpu: 18.9, churn: 4.4 },
    { date: "Apr", mrr: 156000, arpu: 19.6, churn: 4.1 },
    { date: "May", mrr: 172000, arpu: 20.4, churn: 3.8 },
    { date: "Jun", mrr: 185000, arpu: 21.1, churn: 3.6 },
  ],
  insights: [
    {
      title: "Playlists drives the strongest long-term retention",
      summary: "Users who adopt Playlists keep returning at an 81% Day 30 retention rate.",
      confidence: 92,
      recommendation: "Prompt Free tier users to create their first playlist during onboarding.",
      priority: "High",
    },
    {
      title: "Engagement softened after June 15",
      summary: "DAU and average session minutes both declined for two consecutive weekly periods.",
      confidence: 84,
      recommendation: "Review login latency and notification CTR values after June 15.",
      priority: "High",
    },
  ],
};

export const fallbackQuery: QueryResponse = {
  question: "Which feature has the highest retention?",
  intent: "Retention Analysis",
  answer: "Playlists has the highest 30-day retention at 81%. The next best feature is Smart Search at 74%.",
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
  title: "Weekly StreamFlow Intelligence Brief",
  period: "June 22-29, 2026",
  highlights: [
    "MRR reached $185.0K with churn improving to 3.6%.",
    "Playlists remains the strongest retention driver at 81% Day 30 retention.",
    "Revenue growth is healthy despite softer engagement in the latest week.",
  ],
  risks: [
    "DAU declined for two consecutive weekly periods.",
    "Lyrics Translation retention trails other adopted features.",
  ],
  recommended_actions: [
    "Investigate login latency, notification CTR, and release changes after June 15.",
    "Promote playlist generation to Free tier cohorts to capture organic growth.",
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

const FEATURE_NAMES = ["playlists", "smart search", "offline sync", "lyrics translation", "recommendations", "favorites"];

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
    negativeKeywords: { feature: 2, notes: 2, summary: 2, play: 1.5, search: 1.5 },
    paramExtractors: { metric: extractPlanMetric }
  },
  {
    name: "engagement_drop",
    functionName: "engagementDropDiagnosis",
    keywords: { drop: 3.5, decrease: 3, decline: 3, down: 2, engagement: 2, dau: 2 },
    phrases: [/why.*engagement.*(dropped|decreased)/, /why.*dau.*(decreasing|falling|down)/],
    negativeKeywords: { revenue: 3, mrr: 3, conversion: 2, funnel: 2 }
  },
  {
    name: "dau_trend",
    functionName: "dauTrend",
    keywords: { trend: 3, dau: 3.5, user: 1.5, active: 1.5, daily: 2 },
    phrases: [/show.*dau/, /dau trend/, /daily active users/],
    negativeKeywords: { why: 3, drop: 2.5, decrease: 2.5, decline: 2.5 }
  },
  {
    name: "funnel",
    functionName: "funnelAnalysis",
    keywords: { funnel: 4, dropoff: 3, stage: 2, conversion: 2.5, signup: 1.5 },
    phrases: [/show.*funnel/, /where.*drop.*off/, /funnel analysis/],
    negativeKeywords: { revenue: 3.5, mrr: 3.5 }
  },
  {
    name: "acquisition",
    functionName: "acquisitionChannels",
    keywords: { channel: 3, campaign: 3.5, acquisition: 3, organic: 2, paid: 2 },
    phrases: [/which channel/, /acquisition campaign/],
    negativeKeywords: { retention: 3, revenue: 3, mrr: 3 }
  },
  {
    name: "revenue",
    functionName: "revenueMetrics",
    keywords: { mrr: 4, revenue: 3.5, arpu: 3, sales: 2 },
    phrases: [/show.*mrr/, /revenue trend/, /financial overview/],
    negativeKeywords: { retention: 3, funnel: 3, cohort: 2 }
  },
  {
    name: "churn",
    functionName: "churnAnalysis",
    keywords: { churn: 4, cancel: 3.5, cancelation: 3, leaving: 2 },
    phrases: [/why.*cancel/, /churn rate/],
    negativeKeywords: { feature: 2, notes: 2, playlists: 2 }
  },
  {
    name: "feature_adoption",
    functionName: "featureAdoption",
    keywords: { adoption: 4, popular: 3, adopt: 3, usage: 1.5 },
    phrases: [/most popular feature/, /feature adoption/],
    negativeKeywords: { retention: 3.5, churn: 3.5 }
  },
  {
    name: "engagement_by_feature",
    functionName: "engagementByFeature",
    keywords: { active: 3, engagement: 2.5, duration: 3, session: 3 },
    phrases: [/average session.*feature/, /active users.*feature/],
    negativeKeywords: { plan: 3.5, premium: 3.5 }
  }
];

export function getFallbackQueryResponse(question: string): QueryResponse {
  const q = question.toLowerCase();
  
  // Scoring algorithm synced from Python backend
  const scores: Record<string, number> = {};
  
  for (const intent of INTENTS) {
    let score = 0;
    
    // 1. Keyword weights
    for (const [kw, wt] of Object.entries(intent.keywords)) {
      if (q.includes(kw)) score += wt;
    }
    
    // 2. Phrase matching bonuses
    for (const phrase of intent.phrases) {
      if (phrase.test(q)) score += 2.0;
    }
    
    // 3. Negative keyword penalties
    for (const [neg, penalty] of Object.entries(intent.negativeKeywords)) {
      if (q.includes(neg)) score -= penalty;
    }
    
    scores[intent.functionName] = score;
  }
  
  // Find top score candidates
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = sorted[0];
  const runnerUpScore = sorted[1]?.[1] ?? 0;
  
  // Ambiguity threshold (margin < 1.0)
  if (topScore > 1.5 && (topScore - runnerUpScore) < 1.0) {
    const candidates = sorted.filter(([_, s]) => (topScore - s) < 1.0).map(([i]) => i);
    return {
      question,
      intent: "Clarification Required",
      answer: "Did you mean one of the following product metric analysis views?",
      chart_type: "table",
      chart_data: [],
      insights: [],
      generated_query: "-- Ambiguous query detected",
      follow_ups: candidates.map(c => 
        c === "retentionByFeature" ? "Which feature has the highest retention?" :
        c === "planComparison" ? "Compare Premium vs Free retention" :
        c === "engagementDropDiagnosis" ? "Why did engagement drop this week?" :
        c === "dauTrend" ? "Show me DAU over the last 60 days" :
        c === "funnelAnalysis" ? "Where do users drop off in the funnel?" :
        c === "acquisitionChannels" ? "Which acquisition channel converts best?" :
        c === "revenueMetrics" ? "What's our MRR?" :
        c === "churnAnalysis" ? "What's our churn rate?" :
        c === "featureAdoption" ? "Which feature has the highest weekly adoption?" :
        "Average session duration by feature?"
      )
    };
  }
  
  // Low confidence threshold (score <= 1.5)
  if (topScore <= 1.5) {
    return {
      question,
      intent: "Clarification Required",
      answer: "I'm not fully sure what you're asking. Try rephrasing, or pick a suggested question.",
      chart_type: "table",
      chart_data: [],
      insights: [],
      generated_query: "-- Unresolved query detected",
      follow_ups: [
        "Which feature has the highest retention?",
        "Why did engagement drop this week?",
        "Show me DAU over the last 60 days",
        "Where do users drop off in the funnel?"
      ]
    };
  }
  
  // Matched responses mapping
  if (topIntent === "retentionByFeature") {
    const top = maxBy(fallbackOverview.retention_by_feature, "retention");
    return {
      question,
      intent: "Retention Analysis",
      answer: `${top.feature} has the highest 30-day retention at ${top.retention}%. The next best feature is Smart Search at 74%.`,
      chart_type: "bar",
      chart_data: fallbackOverview.retention_by_feature,
      insights: [fallbackOverview.insights[0]],
      generated_query: "SELECT feature, retention_30d, active_users FROM feature_retention ORDER BY retention_30d DESC;",
      follow_ups: ["Compare Premium vs Free retention", "Show Day 7 retention by feature", "Which onboarding step improves retention?"]
    };
  }
  
  if (topIntent === "planComparison") {
    const plan_data = [
      { cohort: "Premium", retention: 85, avgSessionMin: 18.4, weeklyRevenuePerUser: 4.5 },
      { cohort: "Free", retention: 62, avgSessionMin: 9.2, weeklyRevenuePerUser: 0.0 }
    ];
    return {
      question,
      intent: "Plan Comparison",
      answer: "Premium users exhibit significantly stronger 30-day retention (85% vs 62%) and double the average session length compared to Free tier users.",
      chart_type: "bar",
      chart_data: plan_data,
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
  
  if (topIntent === "engagementDropDiagnosis") {
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
  
  if (topIntent === "dauTrend") {
    return {
      question,
      intent: "DAU Trend",
      answer: "Daily Active Users peaked at 26.1K on June 08 before decreasing to 23.6K by the end of the month.",
      chart_type: "line",
      chart_data: fallbackOverview.engagement_trend.map(item => ({ date: item.date, dau: item.dau })),
      insights: [fallbackOverview.insights[1]],
      generated_query: "SELECT date, dau FROM daily_active_users ORDER BY date ASC LIMIT 60;",
      follow_ups: ["Why is DAU decreasing?", "Show weekly active users (WAU) trend"]
    };
  }
  
  if (topIntent === "funnelAnalysis") {
    const weakest = minBy(fallbackOverview.funnel.slice(1), "conversion");
    return {
      question,
      intent: "Funnel Diagnosis",
      answer: `The largest cumulative drop happens before ${weakest.stage}, where only ${weakest.conversion}% of signup users remain in the journey.`,
      chart_type: "funnel",
      chart_data: fallbackOverview.funnel,
      insights: [
        {
          title: "First Song Play is the activation bottleneck",
          summary: "The product loses 23 percentage points between onboarding completion and first song play.",
          confidence: 86,
          recommendation: "Shorten onboarding screens and offer a popular 'quick-play' station on first-run.",
          priority: "High"
        }
      ],
      generated_query: "SELECT stage, users, conversion_rate FROM activation_funnel ORDER BY stage_order ASC;",
      follow_ups: ["Segment this funnel by acquisition channel", "Show drop-off by plan type", "What should we change in onboarding?"]
    };
  }
  
  if (topIntent === "acquisitionChannels") {
    const channels = [
      { channel: "Organic Search", users: 15200, conversion: 18.5 },
      { channel: "Paid Ads", users: 12800, conversion: 24.2 },
      { channel: "Referrals", users: 8400, conversion: 14.1 },
      { channel: "Direct", users: 9500, conversion: 11.2 }
    ];
    return {
      question,
      intent: "Acquisition Channels",
      answer: "Paid Ads drive the highest conversion rate at 24.2%, but Organic Search drives the largest absolute volume of active users (15.2K).",
      chart_type: "bar",
      chart_data: channels,
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
  
  if (topIntent === "revenueMetrics") {
    return {
      question,
      intent: "Revenue Analytics",
      answer: "MRR grew to $185.0K in June while churn improved to 3.6%, indicating expansion is outpacing customer loss.",
      chart_type: "line",
      chart_data: fallbackOverview.revenue_trend,
      insights: [
        {
          title: "Revenue quality is improving",
          summary: "MRR, ARPU, and churn are all moving in healthy directions across the latest period.",
          confidence: 89,
          recommendation: "Prioritize expansion prompts for teams that saved at least three dashboards.",
          priority: "Medium"
        }
      ],
      generated_query: "SELECT month, mrr, arpu, churn_rate FROM revenue_metrics ORDER BY month ASC;",
      follow_ups: ["Forecast next month MRR", "Show churn by customer segment", "Which features correlate with paid conversion?"]
    };
  }
  
  if (topIntent === "churnAnalysis") {
    return {
      question,
      intent: "Churn Analysis",
      answer: "Monthly churn has steadily declined over the last five months, dropping from 4.8% in February to 3.6% in June.",
      chart_type: "line",
      chart_data: fallbackOverview.revenue_trend.map(item => ({ date: item.date, churn: item.churn })),
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
  
  if (topIntent === "featureAdoption") {
    const adoption_data = [
      { feature: "Playlists", adoption: 76 },
      { feature: "Smart Search", adoption: 68 },
      { feature: "Offline Sync", adoption: 54 },
      { feature: "Lyrics Translation", adoption: 42 }
    ];
    return {
      question,
      intent: "Feature Adoption",
      answer: "Playlists has the highest weekly adoption rate at 76%, followed closely by Smart Search at 68%. Lyrics Translation is the lowest at 42%.",
      chart_type: "bar",
      chart_data: adoption_data,
      insights: [
        {
          title: "Playlists dominates user adoption",
          summary: "Playlists is adopted by 76% of active users within their first week.",
          confidence: 90,
          recommendation: "Feature Playlists prominently in the user onboarding tour.",
          priority: "High"
        }
      ],
      generated_query: "SELECT feature, adoption_rate FROM feature_adoption ORDER BY adoption_rate DESC;",
      follow_ups: ["Which onboarding step improves adoption?", "Show adoption of Offline Sync over time"]
    };
  }
  
  if (topIntent === "engagementByFeature") {
    const eng_data = [
      { feature: "Playlists", avgSessionMin: 14.5 },
      { feature: "Smart Search", avgSessionMin: 11.2 },
      { feature: "Offline Sync", avgSessionMin: 8.9 },
      { feature: "Lyrics Translation", avgSessionMin: 6.4 }
    ];
    return {
      question,
      intent: "Engagement by Feature",
      answer: "Users spend the most time engaging with Playlists (averaging 14.5 minutes per session), compared to 11.2 minutes for Smart Search.",
      chart_type: "bar",
      chart_data: eng_data,
      insights: [
        {
          title: "Playlists session duration is highly sticky",
          summary: "Playlists leads average session time at 14.5 minutes, showing deeper user engagement.",
          confidence: 87,
          recommendation: "Optimize playlist loading times to keep engagement high.",
          priority: "Medium"
        }
      ],
      generated_query: "SELECT feature, avg(session_duration) FROM feature_sessions GROUP BY feature ORDER BY avg(session_duration) DESC;",
      follow_ups: ["Compare engagement by plan type", "Which feature leads to longest sessions?"]
    };
  }
  
  // Default overview fallback
  return {
    question,
    intent: "Product Health Overview",
    answer: "The product is growing revenue and retention, but engagement softened in late June. The highest priority is diagnosing the DAU decline while amplifying the Playlists retention loop.",
    chart_type: "table",
    chart_data: fallbackOverview.metrics,
    insights: fallbackOverview.insights,
    generated_query: "SELECT metric, value, delta FROM product_health_snapshot;",
    follow_ups: ["Which feature has the highest retention?", "Why did engagement drop this week?", "Show MRR trend"]
  };
}

function maxBy<T>(arr: T[], key: keyof T): T {
  return arr.reduce((a, b) => (a[key] > b[key] ? a : b));
}

function minBy<T>(arr: T[], key: keyof T): T {
  return arr.reduce((a, b) => (a[key] < b[key] ? a : b));
}
