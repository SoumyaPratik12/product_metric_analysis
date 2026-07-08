export type Trend = "up" | "down" | "flat";

export type MetricCard = {
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  detail: string;
};

export type Insight = {
  title: string;
  summary: string;
  confidence: number;
  recommendation: string;
  priority: "High" | "Medium" | "Low";
};

export type Overview = {
  metrics: MetricCard[];
  retention_by_feature: Array<{ feature: string; retention: number; active_users: number }>;
  funnel: Array<{ stage: string; users: number; conversion: number }>;
  engagement_trend: Array<{ date: string; dau: number; sessions: number; avg_minutes: number }>;
  revenue_trend: Array<{ date: string; mrr: number; arpu: number; churn: number }>;
  insights: Insight[];
};

export type QueryResponse = {
  question: string;
  intent: string;
  answer: string;
  chart_type: "bar" | "line" | "funnel" | "table";
  chart_data: Array<Record<string, string | number>>;
  insights: Insight[];
  generated_query: string;
  follow_ups: string[];
  metric_affected?: string;
  key_findings?: string[];
  root_cause?: string;
  business_impact?: string;
  recommendations?: string[];
  confidence_level?: "High" | "Medium" | "Low";
  confidence_score?: number;
  selected_dataset?: string;
  extracted_entities?: string;
};

export type Integration = {
  name: string;
  category: string;
  status: "connected" | "available" | "syncing";
  last_sync: string;
};

export type ExecutiveReport = {
  title: string;
  period: string;
  highlights: string[];
  risks: string[];
  recommended_actions: string[];
  metrics: MetricCard[];
};

