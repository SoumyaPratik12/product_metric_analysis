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

