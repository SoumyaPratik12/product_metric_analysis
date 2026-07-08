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
    { feature: "Recommendations", retention: 69, active_users: 31200 },
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
  metric_affected: "30-Day Retention",
  answer: "Playlists has the highest 30-day retention at 81%, driven by repeat audio sessions. The next best feature is Smart Search at 74%.",
  chart_type: "bar",
  chart_data: fallbackOverview.retention_by_feature,
  insights: [fallbackOverview.insights[0]],
  generated_query: "SELECT feature, retention_30d, active_users FROM feature_retention ORDER BY retention_30d DESC;",
  follow_ups: ["Compare Premium vs Free retention", "Show Day 7 retention by feature", "Which onboarding step improves retention?"],
  key_findings: [
    "Playlists user cohort shows 81% Day 30 retention.",
    "Smart Search users exhibit 74% retention, but search frequency dropped in June.",
    "Offline Sync retention is 69%, showing robust utility for travelers."
  ],
  root_cause: "Playlists creation creates a persistent user library, reducing switching costs.",
  business_impact: "Highly retentive features lower user acquisition costs and increase customer lifetime value.",
  recommendations: [
    "Promote Playlist creation prominently in the onboarding tutorial.",
    "Highlight Recommendations engine usage to increase repeat plays."
  ],
  confidence_level: "High",
  confidence_score: 92,
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
    name: "search_analytics",
    functionName: "searchKeywordAnalysis",
    keywords: { keyword: 4, search: 3, searches: 3.5, find: 2, typed: 2, "search bar": 4 },
    phrases: [/most.*search/, /search.*keyword/, /searches.*no result/, /search.*fail.*find/],
    negativeKeywords: {}
  },
  {
    name: "genre_analytics",
    functionName: "genreAnalytics",
    keywords: { genre: 4, genres: 4, pop: 2, rock: 2, electronic: 2, bollywood: 2 },
    phrases: [/growing.*fastest.*genre/, /most popular genre/, /compare.*genre/, /genre.*retention/, /genre.*convert.*premium/],
    negativeKeywords: {}
  },
  {
    name: "language_analytics",
    functionName: "languageAnalysis",
    keywords: { language: 4, languages: 4, hindi: 2.5, english: 2.5, spanish: 2.5, streamed: 2 },
    phrases: [/language.*stream/, /compare.*hindi.*english/, /language.*grown/, /highest.*listening time.*language/],
    negativeKeywords: {}
  },
  {
    name: "subscription_analytics",
    functionName: "subscriptionAnalytics",
    keywords: { free: 3, premium: 3.5, subscription: 3, plan: 2.5, revenue: 2, convert: 2 },
    phrases: [/percentage.*free/, /percentage.*premium/, /country.*highest.*premium conversion/, /plan.*generate.*revenue/],
    negativeKeywords: {}
  },
  {
    name: "recommendation_analytics",
    functionName: "recommendationAnalytics",
    keywords: { recommendation: 4, recommend: 4, ctr: 3, "click-through": 3, skipped: 2.5, algorithm: 3 },
    phrases: [/recommendation.*ctr/, /recommend.*song.*skip/, /recommendation algorithm/],
    negativeKeywords: {}
  },
  {
    name: "listening_behaviour",
    functionName: "listeningBehaviour",
    keywords: { skipped: 3.5, skip: 3, artist: 3, artists: 3.5, playlist: 3, playlists: 3.5, binge: 3 },
    phrases: [/song.*skip.*most/, /artist.*increase.*listening time/, /playlist.*improve.*retention/, /binge-listen/],
    negativeKeywords: {}
  },
  {
    name: "geography_analytics",
    functionName: "geographyAnalytics",
    keywords: { country: 3.5, city: 3, state: 3, geographic: 2.5, india: 2, usa: 2 },
    phrases: [/country.*stream.*most/, /city.*highest.*premium/, /compare.*india.*usa/],
    negativeKeywords: {}
  },
  {
    name: "time_analytics",
    functionName: "timeAnalytics",
    keywords: { time: 3, hour: 3.5, morning: 2.5, evening: 2.5, weekend: 3, weekday: 3, peak: 3.5 },
    phrases: [/peak listening hour/, /weekend.*weekday/, /time.*premium.*listen/],
    negativeKeywords: {}
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
  let [topIntent, topScore] = sorted[0];
  
  if (topScore <= 1.5) {
    // Dynamic keyword search to always resolve
    if (q.includes("genre")) {
      topIntent = "genreAnalytics";
    } else if (q.includes("language") || q.includes("languages")) {
      topIntent = "languageAnalysis";
    } else if (q.includes("keyword") || q.includes("search")) {
      topIntent = "searchKeywordAnalysis";
    } else if (q.includes("freemium") || q.includes("premium") || q.includes("paid") || q.includes("subscription")) {
      topIntent = "subscriptionAnalytics";
    } else if (q.includes("recommend") || q.includes("algorithm") || q.includes("ctr")) {
      topIntent = "recommendationAnalytics";
    } else if (q.includes("skip") || q.includes("artist") || q.includes("playlist") || q.includes("binge")) {
      topIntent = "listeningBehaviour";
    } else if (q.includes("country") || q.includes("city") || q.includes("usa") || q.includes("india")) {
      topIntent = "geographyAnalytics";
    } else if (q.includes("time") || q.includes("hour") || q.includes("weekend") || q.includes("weekday")) {
      topIntent = "timeAnalytics";
    } else if (q.includes("retention") || q.includes("retain")) {
      topIntent = "genreAnalytics";
    } else if (q.includes("mrr") || q.includes("revenue")) {
      topIntent = "subscriptionAnalytics";
    } else if (q.includes("churn")) {
      topIntent = "subscriptionAnalytics";
    } else if (q.includes("dau") || q.includes("active")) {
      topIntent = "geographyAnalytics";
    } else if (q.includes("funnel") || q.includes("conversion")) {
      topIntent = "subscriptionAnalytics";
    } else {
      // Universal Dynamic Fallback
      return {
        question,
        intent: "Universal Analytics Assistant",
        metric_affected: "General StreamFlow Workspace Metrics",
        selected_dataset: "users.csv",
        extracted_entities: "Overall StreamFlow Metrics",
        answer: `I parsed your question '${question}' against the StreamFlow database. Here is the general product health overview for the metrics related to your query.`,
        chart_type: "table",
        chart_data: fallbackOverview.metrics,
        insights: fallbackOverview.insights,
        generated_query: `SELECT metric_name, current_value FROM metrics_catalog WHERE query_keywords LIKE '%${question}%';`,
        key_findings: [
          `Parsed user query: '${question}'`,
          "No exact database routing matched; retrieved global workspace indicators.",
          "Active users remained stable at 125,000 overall."
        ],
        root_cause: "System successfully retrieved global overview metrics as a fallback response.",
        business_impact: "Prevents analytics query failures, ensuring continuous decision support availability.",
        recommendations: [
          "Ensure your query targets features (Playlists, Smart Search) or plans (Premium, Freemium).",
          "Use the suggested follow-up questions to drill down."
        ],
        confidence_level: "Medium",
        confidence_score: 85,
        follow_ups: [
          "What is the most listened genre country wise?",
          "Which language is listened to the most?",
          "What's our MRR?",
          "Which feature has the highest retention?"
        ]
      };
    }
  }
  
  // Matched responses mapping
  if (topIntent === "retentionByFeature") {
    return {
      question,
      intent: "Retention Analysis",
      metric_affected: "30-Day Retention",
      answer: "Playlists has the highest 30-day retention at 81%, driven by repeat audio sessions. The next best feature is Smart Search at 74%.",
      chart_type: "bar",
      chart_data: fallbackOverview.retention_by_feature,
      insights: [fallbackOverview.insights[0]],
      generated_query: "SELECT feature, retention_30d, active_users FROM feature_retention ORDER BY retention_30d DESC;",
      follow_ups: ["Compare Premium vs Free retention", "Show Day 7 retention by feature", "Which onboarding step improves retention?"],
      key_findings: [
        "Playlists user cohort shows 81% Day 30 retention.",
        "Smart Search users exhibit 74% retention, but search frequency dropped in June.",
        "Offline Sync retention is 69%, showing robust utility for travelers."
      ],
      root_cause: "Playlists creation creates a persistent user library, reducing switching costs.",
      business_impact: "Highly retentive features lower user acquisition costs and increase customer lifetime value.",
      recommendations: [
        "Promote Playlist creation prominently in the onboarding tutorial.",
        "Highlight Recommendations engine usage to increase repeat plays."
      ],
      confidence_level: "High",
      confidence_score: 92,
    };
  }
  
  if (topIntent === "planComparison") {
    const plan_data = [
      { cohort: "Premium", retention: 85, avgSessionMin: 18.4, weeklyRevenuePerUser: 4.5 },
      { cohort: "Free", retention: 62, avgSessionMin: 9.2, weeklyRevenuePerUser: 0.0 },
      { cohort: "Family", retention: 88, avgSessionMin: 22.1, weeklyRevenuePerUser: 6.8 },
      { cohort: "Student", retention: 72, avgSessionMin: 14.5, weeklyRevenuePerUser: 2.5 }
    ];
    return {
      question,
      intent: "Plan Comparison",
      metric_affected: "Retention & Churn by Plan Tier",
      answer: "Premium plans (individual and family) show 85% Day 30 retention and 3.2% churn. Student plans have 72% retention and 4.8% churn, while Free plans exhibit 62% retention.",
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
      follow_ups: ["Segment retention by feature for Premium users", "What is the upgrade conversion rate?"],
      key_findings: [
        "Premium individual cohorts lead retention at 85%.",
        "Family tiers show the lowest customer cancelation rates (3.2% churn).",
        "Student plans exhibit slightly higher churn due to semester-end billing cancellations."
      ],
      root_cause: "Ad-free experience and Offline Sync capabilities in paid plans drive superior habit-formation.",
      business_impact: "Moving Free users to Premium individual or Student plans boosts MRR predictably.",
      recommendations: [
        "Promote Student upgrades before major academic terms.",
        "Offer Family subscription bundles to highly active Premium users."
      ],
      confidence_level: "High",
      confidence_score: 94,
    };
  }
  
  if (topIntent === "engagementDropDiagnosis") {
    return {
      question,
      intent: "Engagement Drop Diagnosis",
      metric_affected: "Daily Active Users (DAU) & Session duration",
      answer: "The engagement drop after June 15 was driven primarily by a 14% decline in average daily active users and a corresponding reduction in session length.",
      chart_type: "line",
      chart_data: fallbackOverview.engagement_trend,
      insights: [fallbackOverview.insights[1]],
      generated_query: "SELECT date, dau, avg_minutes FROM engagement_weekly WHERE date >= 'Jun 15' ORDER BY date ASC;",
      follow_ups: ["Check server response times after June 15", "Compare mobile vs web app engagement drops"],
      key_findings: [
        "DAU fell from 25.6K on June 15 to 23.6K on June 29.",
        "Average session duration decreased by 12% across iOS and Android.",
        "Playlist creation drop-off of 15% was identified during Step 3 of onboarding."
      ],
      root_cause: "Users abandoned onboarding after onboarding Step 3 due to a configuration lookup latency bug.",
      business_impact: "Softened engagement poses a risk of future subscription churn on subsequent billing dates.",
      recommendations: [
        "Resolve database latency on onboarding step 3 queries.",
        "Roll out push notification campaigns to users active in early June."
      ],
      confidence_level: "High",
      confidence_score: 91,
    };
  }
  
  if (topIntent === "dauTrend") {
    return {
      question,
      intent: "DAU Trend",
      metric_affected: "Daily Active Users",
      answer: "Daily Active Users peaked at 26.1K on June 08 before decreasing to 23.6K by the end of the month.",
      chart_type: "line",
      chart_data: fallbackOverview.engagement_trend.map(item => ({ date: item.date, dau: item.dau })),
      insights: [fallbackOverview.insights[1]],
      generated_query: "SELECT date, dau FROM daily_active_users ORDER BY date ASC LIMIT 60;",
      follow_ups: ["Why is DAU decreasing?", "Show weekly active users (WAU) trend"],
      key_findings: [
        "DAU grew during the early June campaign to 26.1K.",
        "A gradual week-over-week cooling reduced daily logins to 23.6K.",
        "Android activity declined faster than iOS active user cohorts."
      ],
      root_cause: "Early June marketing campaign traffic cooling down combined with onboarding dropoff.",
      business_impact: "Decreased active user base restricts premium subscription upgrade pipelines.",
      recommendations: [
        "Launch a re-engagement email campaign targeting dormant June cohorts.",
        "Review app crash reporting logs for Android users."
      ],
      confidence_level: "Medium",
      confidence_score: 84,
    };
  }
  
  if (topIntent === "funnelAnalysis") {
    const weakest = fallbackOverview.funnel[2]; // Play Song
    return {
      question,
      intent: "Funnel Diagnosis",
      metric_affected: "Activation Funnel Conversion",
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
      follow_ups: ["Segment this funnel by acquisition channel", "Show drop-off by plan type", "What should we change in onboarding?"],
      key_findings: [
        "Signup-to-Onboarding conversion is strong at 81%.",
        "Onboarding-to-First Song Play is the core bottleneck, dropping to 58%.",
        "Playlist creation (37%) and Playlist sharing (24%) represent secondary drop-off points."
      ],
      root_cause: "No default playlists or recommended tracks are loaded on first login, causing empty-state friction.",
      business_impact: "Failing to play a song within the first hour of registration reduces Day 7 retention by 45 percentage points.",
      recommendations: [
        "Autoplay a personalized onboarding song station upon signup completion.",
        "Add a prominent 'Quick Start' track recommendations panel on home page."
      ],
      confidence_level: "High",
      confidence_score: 86,
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
      metric_affected: "Signup Conversions by Channel",
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
      follow_ups: ["Show conversion trends by campaign", "What is the cost per acquisition (CAC)?"],
      key_findings: [
        "Paid search/ads convert at 24.2% efficiency.",
        "Organic search brings in 15.2K users at 18.5% conversion.",
        "Referral channels exhibit a 14.1% conversion rate."
      ],
      root_cause: "Targeted advertising copy aligns closely with user intent upon landing.",
      business_impact: "Increasing paid search budget is highly capital-efficient for subscriber growth.",
      recommendations: [
        "Reallocate 15% of referral marketing budget into Paid Search campaigns.",
        "A/B test landing page copy for organic search audience."
      ],
      confidence_level: "Medium",
      confidence_score: 88,
    };
  }
  
  if (topIntent === "revenueMetrics") {
    return {
      question,
      intent: "Revenue Analytics",
      metric_affected: "Monthly Recurring Revenue (MRR)",
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
      follow_ups: ["Forecast next month MRR", "Show churn by customer segment", "Which features correlate with paid conversion?"],
      key_findings: [
        "MRR increased from $110K in January to $185K in June.",
        "Average ARPU reached $21.1 per Premium user.",
        "Net MRR retention is positive due to high upgrades."
      ],
      root_cause: "Expansion from Premium upgrades and family plan conversions outweighs monthly subscription cancelations.",
      business_impact: "Positive net revenue retention supports long-term operating profit margin expansion.",
      recommendations: [
        "Launch high-value add-ons (Lossless Audio) to top-tier Premium subscribers.",
        "Automate dunning emails to prevent involuntary churn on expired cards."
      ],
      confidence_level: "High",
      confidence_score: 89,
    };
  }
  
  if (topIntent === "churnAnalysis") {
    return {
      question,
      intent: "Churn Analysis",
      metric_affected: "Subscriber Churn Rate",
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
      follow_ups: ["Show churn by plan type", "What is the average customer lifetime value (LTV)?"],
      key_findings: [
        "Churn improved to 3.6% in June, a 25% relative reduction from February.",
        "Upgraded payment processors reduced involuntary credit card failures.",
        "Premium cohort exhibits lower churn than family subscription plans."
      ],
      root_cause: "Consistent updates to recommendation search engine increased overall time spent.",
      business_impact: "Lower churn rate increases lifetime value (LTV) and boosts enterprise valuation.",
      recommendations: [
        "Trigger NPS survey alerts when a subscriber uses search less than twice weekly.",
        "Introduce annual prepayment discounts to lock in sticky cohorts."
      ],
      confidence_level: "High",
      confidence_score: 91,
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
      metric_affected: "Weekly Feature Adoption",
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
      follow_ups: ["Which onboarding step improves adoption?", "Show adoption of Offline Sync over time"],
      key_findings: [
        "Playlists adoption leads at 76% of active signups.",
        "Smart Search is adopted by 68% of users.",
        "Lyrics Translation exhibits low repeat usage (42% adoption)."
      ],
      root_cause: "Onboarding flow directs users directly to create a playlist upon signup.",
      business_impact: "Feature adoption correlates directly with long-term subscription retention.",
      recommendations: [
        "Expose Playlists shortcuts on the home page dashboard.",
        "Incorporate Lyrics search hints to drive Smart Search usage."
      ],
      confidence_level: "High",
      confidence_score: 90,
    };
  }
  
  if (topIntent === "genreAnalytics" || topIntent === "genreCountryAnalysis") {
    const genre_data = [
      { country: "India", streams: 95000, genre: "Bollywood" },
      { country: "USA", streams: 85000, genre: "Pop" },
      { country: "UK", streams: 62000, genre: "Rock" },
      { country: "Germany", streams: 55000, genre: "Electronic" },
      { country: "Japan", streams: 48000, genre: "J-Pop" }
    ];
    return {
      question,
      intent: "Genre Analytics",
      metric_affected: "Fastest Growing Genre & Listening Time",
      selected_dataset: "songs.csv",
      extracted_entities: "Country: India, Germany | Genres: Pop, Rock, Electronic",
      answer: "Bollywood is the fastest growing genre in India (↑ 14% WoW, 95K streams). In Germany, Electronic music is the most popular with 55K streams, showing an 18% growth month-over-month.",
      chart_type: "bar",
      chart_data: genre_data,
      insights: [
        {
          title: "Bollywood leads single-genre streaming density",
          summary: "Bollywood tracks account for 95K streams, showing massive geographic loyalty in South Asia.",
          confidence: 94,
          recommendation: "Increase catalog budgets for Indian and South Asian regional content creators.",
          priority: "High"
        }
      ],
      generated_query: "SELECT genre, count(*) as streams, avg(duration) as avg_duration FROM songs GROUP BY genre ORDER BY streams DESC;",
      follow_ups: ["Which artists are driving Premium subscriptions?", "Compare Pop vs Rock listening time."],
      key_findings: [
        "Bollywood is growing fastest in India with 95K streams (↑ 14%).",
        "Pop leads Western markets with Pop (85K) and Rock (62K) stream totals.",
        "Pop converts Freemium users to Paid Premium subscriptions at a 12% higher rate."
      ],
      root_cause: "Curated editorial playlists and regional artist cross-promotions on the home tab.",
      business_impact: "Genre popularity maps directly to Premium subscription upgrades and ad impressions.",
      recommendations: [
        "Partner with local Indian labels to capture early-release catalog exclusive rights.",
        "A/B test genre-specific banner recommendations on mobile homepages."
      ],
      confidence_level: "High",
      confidence_score: 94,
    };
  }

  if (topIntent === "languageAnalysis") {
    const lang_data = [
      { language: "English", shares: 52 },
      { language: "Spanish", shares: 22 },
      { language: "Hindi", shares: 14 },
      { language: "Japanese", shares: 8 },
      { language: "Others", shares: 4 }
    ];
    return {
      question,
      intent: "Language Analytics",
      metric_affected: "Music Language Streams Share & Listening Time",
      selected_dataset: "songs.csv",
      extracted_entities: "Languages: Hindi, English, Spanish",
      answer: "English is the most listened language representing 52% of total music stream shares, followed by Spanish at 22% and Hindi at 14%. Hindi tracks show the highest average listening time per session.",
      chart_type: "bar",
      chart_data: lang_data,
      insights: [
        {
          title: "Spanish track popularity shows global crossover",
          summary: "Spanish tracks represent 22% of total shares, indicating strong cross-border growth.",
          confidence: 91,
          recommendation: "Recommend Spanish crossover tracks to English listening cohorts.",
          priority: "Medium"
        }
      ],
      generated_query: "SELECT track_language, count(*) * 100.0 / sum(count(*)) over() as share FROM track_streams GROUP BY track_language ORDER BY share DESC;",
      follow_ups: ["Which language has grown this month?", "Compare Hindi vs English."],
      key_findings: [
        "English remains the global baseline with 52% of streams.",
        "Spanish is the fastest-growing global language share at 22%.",
        "Hindi shares are concentrated but have extremely high session repeat rates."
      ],
      root_cause: "Global popularity of Latin pop and South Asian classical music crossover trends.",
      business_impact: "Language crossover boosts average session duration through globalized recommendations.",
      recommendations: [
        "Introduce Spanish-English crossover radio stations.",
        "Offer localized lyric translation features for global Spanish hits."
      ],
      confidence_level: "High",
      confidence_score: 91,
    };
  }

  if (topIntent === "searchKeywordAnalysis") {
    const keyword_data = [
      { keyword: "Lo-Fi Beats", searches: 28400, conversion: 82 },
      { keyword: "Summer Hits", searches: 22100, conversion: 78 },
      { keyword: "Chill Vibes", searches: 19500, conversion: 80 },
      { keyword: "Gym Workout", searches: 15600, conversion: 74 },
      { keyword: "Sad Songs", searches: 12200, conversion: 85 }
    ];
    return {
      question,
      intent: "Search Keyword Analytics",
      metric_affected: "Top Search Keywords & Stream Conversions",
      selected_dataset: "search.csv",
      extracted_entities: "Keywords: Lo-Fi Beats, Sad Songs",
      answer: "The most common keyword typed in the search bar is 'Lo-Fi Beats' (28.4K searches) with a conversion rate of 82% to play song. 'Sad Songs' has the highest conversion rate to stream at 85%.",
      chart_type: "table",
      chart_data: keyword_data,
      insights: [
        {
          title: "Mood keywords drive high stream conversion",
          summary: "Mood searches ('Sad Songs', 'Lo-Fi Beats') convert to play actions 10% more efficiently than generic keywords.",
          confidence: 92,
          recommendation: "Pre-load mood recommendation chips in the search panel.",
          priority: "High"
        }
      ],
      generated_query: "SELECT query_keyword, count(*) as searches, avg(converted_to_stream) as conversion FROM search_events GROUP BY query_keyword ORDER BY searches DESC LIMIT 5;",
      follow_ups: ["Which searches return no results?", "What do users search for in India?"],
      key_findings: [
        "'Lo-Fi Beats' is the top searched term with 28.4K inquiries.",
        "'Sad Songs' leads stream conversions at 85%.",
        "Workout-related terms show slightly higher bounce rates (74% conversion)."
      ],
      root_cause: "Contextual study/exercise user intents drive mood-based search queries.",
      business_impact: "Optimizing search-to-stream conversions reduces navigation friction and extends active sessions.",
      recommendations: [
        "Create and feature official playlist radios matching the top searches.",
        "Optimize search indexing algorithms to rank playlist matches above individual tracks."
      ],
      confidence_level: "High",
      confidence_score: 92,
    };
  }

  if (topIntent === "subscriptionAnalytics" || topIntent === "planDistributionAnalysis") {
    const dist_data = [
      { stage: "Total Active Users", users: 125000 },
      { stage: "Freemium Users", users: 87000 },
      { stage: "Paid Subscribers", users: 38000 }
    ];
    return {
      question,
      intent: "Subscription Analytics",
      metric_affected: "Freemium vs Premium Plan Distribution & Revenue",
      selected_dataset: "subscription.csv",
      extracted_entities: "Plan: Freemium, Premium, Family, Student",
      answer: "Out of 125,000 active users, 87,000 (69.6%) are using the Freemium tier, while 38,000 (30.4%) have active Paid Premium Subscriptions. Family plans generate the highest average revenue per user (ARPU).",
      chart_type: "funnel",
      chart_data: dist_data,
      insights: [
        {
          title: "Paid Premium subscription conversion is stable",
          summary: "Paid subscribers represent 30.4% of total base, aligning with long-term SaaS monetization goals.",
          confidence: 95,
          recommendation: "Target freemium cohorts streaming >2 hours daily with premium upgrade trials.",
          priority: "High"
        }
      ],
      generated_query: "SELECT plan_type, count(distinct user_id), sum(revenue) FROM subscription GROUP BY plan_type;",
      follow_ups: ["Which plan generates the most revenue?", "Which country has the highest Premium conversion?"],
      key_findings: [
        "Freemium users account for 87,000 (69.6%) of active pool.",
        "Premium paid subscribers reached 38,000 (30.4%).",
        "Conversion rate of free-to-paid users increased by 7.0% YoY."
      ],
      root_cause: "Effective expansion triggers and family upgrade bundle campaigns.",
      business_impact: "Strong premium percentage protects operating profit margins and pays label royalties.",
      recommendations: [
        "Increase premium upgrade prompts when a user plays a skip-restricted free song.",
        "Introduce student plans to convert price-sensitive student freemium segments."
      ],
      confidence_level: "High",
      confidence_score: 95,
    };
  }

  if (topIntent === "recommendationAnalytics") {
    const rec_data = [
      { algorithm: "Collaborative", ctr: 24.5 },
      { algorithm: "Content-Based", ctr: 18.2 },
      { algorithm: "Popularity", ctr: 12.6 }
    ];
    return {
      question,
      intent: "Recommendation Analytics",
      metric_affected: "Click-Through Rate (CTR) by Algorithm",
      selected_dataset: "recommendations.csv",
      extracted_entities: "Algorithms: Collaborative Filtering, Content-Based, Popularity",
      answer: "Collaborative filtering recommendations show the highest click-through rate (CTR) at 24.5%, compared to 18.2% for Content-Based methods. Recommended tracks show a skip rate under 15% on Collaborative plans.",
      chart_type: "bar",
      chart_data: rec_data,
      insights: [
        {
          title: "Collaborative filtering shows clear performance lead",
          summary: "CTR for Collaborative recommendations is 6.3 percentage points higher than content-based matches.",
          confidence: 90,
          recommendation: "Fully transition home-screen feeds to use the new Collaborative algorithm.",
          priority: "High"
        }
      ],
      generated_query: "SELECT algorithm_name, count(distinct case when clicked=1 then user_id end) * 100.0 / count(*) as ctr FROM recommendations GROUP BY algorithm_name;",
      follow_ups: ["Which recommended songs are skipped?", "Which recommendation algorithm performs best?"],
      key_findings: [
        "Collaborative Filtering leads CTR at 24.5%.",
        "Content-Based is second at 18.2% conversion.",
        "Popularity-based recommendations perform lowest at 12.6% CTR."
      ],
      root_cause: "Leveraging user cohort listening patterns produces more relevant recommendations than simple audio attributes.",
      business_impact: "Higher CTR directly increases daily session lengths and reduces user drop-off.",
      recommendations: [
        "Deploy the Collaborative engine to all desktop web clients.",
        "A/B test a hybrid Collaborative/Content-Based model for mobile users."
      ],
      confidence_level: "High",
      confidence_score: 90,
    };
  }

  if (topIntent === "listeningBehaviour") {
    const skip_data = [
      { category: "Curated Playlists", skip_rate: 14 },
      { category: "Recommendations", skip_rate: 18 },
      { category: "Organic Radio", "skip_rate": 26 },
      { category: "Independent Albums", "skip_rate": 34 }
    ];
    return {
      question,
      intent: "Listening Behaviour",
      metric_affected: "Song Skip Rate & Playlist Retention",
      selected_dataset: "listening_events.csv",
      extracted_entities: "Playlists: Curated Playlists, Recommendations | Actions: Skips",
      answer: "Curated playlists have the lowest skip rate at 14% and improve 30-day retention to 81%. Independent album streams have the highest skip rate at 34%.",
      chart_type: "bar",
      chart_data: skip_data,
      insights: [
        {
          title: "Curated playlists improve retention and satisfaction",
          summary: "Skip rates remain low (14%) inside editor-curated playlists, verifying high song selection quality.",
          confidence: 92,
          recommendation: "Direct onboarding users to curated editorial playlists instead of self-selected albums.",
          priority: "High"
        }
      ],
      generated_query: "SELECT category, count(case when skipped=1 then 1 end) * 100.0 / count(*) as skip_rate FROM listening_events GROUP BY category;",
      follow_ups: ["Which playlists improve retention?", "Which songs are skipped most?"],
      key_findings: [
        "Curated playlists lead with a low skip rate of 14%.",
        "Recommendations have a 18% skip rate.",
        "Independent albums show a high skip rate (34%)."
      ],
      root_cause: "Familiar editor tracks reduce user skip behavior and maintain active audio sessions.",
      business_impact: "Lowering average skip rates extends total listening time and boosts ad-revenue shares.",
      recommendations: [
        "Promote editor playlists on the initial onboarding screen.",
        "Implement smart track cross-fading to reduce bounce clicks."
      ],
      confidence_level: "High",
      confidence_score: 92,
    };
  }

  if (topIntent === "geographyAnalytics") {
    const geo_data = [
      { country: "USA", hours: 420000 },
      { country: "India", hours: 390000 },
      { country: "UK", hours: 210000 },
      { country: "Germany", hours: 180000 }
    ];
    return {
      question,
      intent: "Geography Analytics",
      metric_affected: "Total Listening Time by Country",
      selected_dataset: "users.csv",
      extracted_entities: "Countries: USA, India, UK, Germany",
      answer: "USA leads with 420K total music listening hours. India is a close second at 390K hours but has the fastest growing user pool. Mumbai leads city-wise Premium conversions.",
      chart_type: "bar",
      chart_data: geo_data,
      insights: [
        {
          title: "India represents the primary growth vector",
          summary: "Listening hours in India reached 390K, and user signups are expanding at 18% month-over-month.",
          confidence: 93,
          recommendation: "Invest in localized regional payment gateways in India to optimize Premium upgrades.",
          priority: "High"
        }
      ],
      generated_query: "SELECT country, sum(listening_time) as total_hours FROM users GROUP BY country ORDER BY total_hours DESC;",
      follow_ups: ["Compare India vs USA.", "Which city has the highest Premium adoption?"],
      key_findings: [
        "USA leads listening volume at 420K hours.",
        "India is the fastest-expanding region with 390K hours.",
        "Mumbai leads regional cities in paid premium subscriptions (34.2%)."
      ],
      root_cause: "High mobile device penetration and low data costs in India drive massive stream volumes.",
      business_impact: "Capitalizing on regional conversions protects global market share.",
      recommendations: [
        "Roll out localized student pricing plans in India.",
        "Collaborate with regional telecom providers to bundle subscriptions."
      ],
      confidence_level: "High",
      confidence_score: 93,
    };
  }

  if (topIntent === "timeAnalytics") {
    const time_data = [
      { hour: "08:00", weekday_listeners: 15000, weekend_listeners: 8000 },
      { hour: "12:00", weekday_listeners: 12000, weekend_listeners: 14000 },
      { hour: "18:00", weekday_listeners: 28000, weekend_listeners: 16000 },
      { hour: "22:00", weekday_listeners: 19000, weekend_listeners: 18000 }
    ];
    return {
      question,
      intent: "Time Analytics",
      metric_affected: "Peak Listening Hour & Weekend Trends",
      selected_dataset: "listening_events.csv",
      extracted_entities: "Time Slots: Commute, Lunch, Evening | Plan: Premium",
      answer: "The peak listening hour is 6:00 PM to 8:00 PM (commute hours) on weekdays with 28K active listeners. Weekends show a flatter, more distributed listening curve peaking at midday.",
      chart_type: "line",
      chart_data: time_data,
      insights: [
        {
          title: "Commute hours drive peak weekday streaming",
          summary: "Weekday listeners spike to 28K at 6:00 PM, indicating heavy commute listening.",
          confidence: 89,
          recommendation: "Push offline playlist downloads before the morning/evening commute hours.",
          priority: "Medium"
        }
      ],
      generated_query: "SELECT strftime('%H', timestamp) as hour, count(*) FROM listening_events GROUP BY hour ORDER BY count(*) DESC;",
      follow_ups: ["What time do Premium users listen to music?", "Compare weekday vs weekend listening time."],
      key_findings: [
        "Peak commute listening occurs at 6:00 PM with 28K listeners.",
        "Midday (12:00 PM) is the highest active slot on weekends (14K).",
        "Premium users stream 45% more music late at night compared to Free users."
      ],
      root_cause: "Commute habits and bedtime relaxation routines define weekday peak schedules.",
      business_impact: "Targeted push notifications during peak windows increase total active sessions.",
      recommendations: [
        "Trigger 'Download Offline Playlists' alerts at 4:30 PM on weekdays.",
        "Promote calm ambient tracks after 10:00 PM."
      ],
      confidence_level: "High",
      confidence_score: 89,
    };
  }

  // Default overview fallback
  return {
    question,
    intent: "Product Health Overview",
    metric_affected: "Product Health Portfolio",
    selected_dataset: "users.csv",
    extracted_entities: "Overall StreamFlow Metrics",
    answer: "The product is growing revenue and retention, but engagement softened in late June. The highest priority is diagnosing the DAU decline while amplifying the Playlists retention loop.",
    chart_type: "table",
    chart_data: fallbackOverview.metrics,
    insights: fallbackOverview.insights,
    generated_query: "SELECT metric, value, delta FROM product_health_snapshot;",
    follow_ups: ["Which feature has the highest retention?", "Why did engagement drop this week?", "Show MRR trend"],
    key_findings: [
      "MRR grew to $185K, representing solid financial growth.",
      "Day 30 retention remains robust at an average of 81%.",
      "Daily Active Users decreased by 3.0% over the last week."
    ],
    root_cause: "A combination of marketing campaign cooldown and minor latencies on onboarding step 3.",
    business_impact: "Positive overall revenue progress, but softened engagement may create churn drag in future months.",
    recommendations: [
      "Address database latency during onboarding step 3.",
      "Integrate smart search recommendations to enhance passive session lengths."
    ],
    confidence_level: "High",
    confidence_score: 91,
  };
}

function maxBy<T>(arr: T[], key: keyof T): T {
  return arr.reduce((a, b) => (a[key] > b[key] ? a : b));
}

function minBy<T>(arr: T[], key: keyof T): T {
  return arr.reduce((a, b) => (a[key] < b[key] ? a : b));
}
