import { supabase, type AppUser } from "./supabase";
import type { Insight, QueryResponse } from "./types";

export type DatasetRecord = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  row_count: number;
  columns_json: string[];
  status: string;
  last_error: string | null;
  created_at: string;
};

type DatasetRow = {
  row_index: number;
  row_data: Record<string, string>;
};

export async function saveConversation(userId: string, response: QueryResponse) {
  if (!supabase) return;

  const { error } = await supabase.from("ai_conversations").insert({
    user_id: userId,
    question: response.question,
    intent: response.intent,
    answer: response.answer,
    chart_type: response.chart_type,
    chart_data: response.chart_data,
    insights: response.insights,
    generated_query: response.generated_query,
    follow_ups: response.follow_ups,
  });

  if (error) throw error;
}

export async function saveDashboard(userId: string, response: QueryResponse) {
  if (!supabase) return;

  const { error } = await supabase.from("saved_dashboards").insert({
    user_id: userId,
    name: `${response.intent} Dashboard`,
    layout_json: {
      source: "generated-answer",
      response,
    },
  });

  if (error) throw error;
}

export async function ensureUserWorkspace(user: AppUser) {
  if (!supabase || !user.email) return;

  const profile = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? null,
  });

  if (profile.error) throw profile.error;

  const existing = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  if (existing.error) throw existing.error;
  if (existing.data && existing.data.length > 0) return;

  const organization = await supabase
    .from("organizations")
    .insert({
      owner_id: user.id,
      name: "My Product Workspace",
    })
    .select("id")
    .single();

  if (organization.error) throw organization.error;

  const membership = await supabase.from("organization_members").insert({
    organization_id: organization.data.id,
    user_id: user.id,
    role: "owner",
  });

  if (membership.error) throw membership.error;

  const project = await supabase.from("projects").insert({
    organization_id: organization.data.id,
    owner_id: user.id,
    name: "Acme Mobile App",
    description: "Default product analytics workspace",
  });

  if (project.error) throw project.error;
}

export async function listDatasets(userId: string): Promise<DatasetRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("datasets")
    .select("id,file_name,file_path,file_size,row_count,columns_json,status,last_error,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data ?? [];
}

export async function uploadDataset(userId: string, file: File): Promise<DatasetRecord> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const parsed = parseCsv(await file.text());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = `${userId}/${Date.now()}-${safeName}`;
  const upload = await supabase.storage.from("product-datasets").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (upload.error) throw upload.error;

  const { data, error } = await supabase
    .from("datasets")
    .insert({
      user_id: userId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      row_count: parsed.rows.length,
      columns_json: parsed.columns,
      status: parsed.rows.length > 0 ? "indexed" : "uploaded",
    })
    .select("id,file_name,file_path,file_size,row_count,columns_json,status,last_error,created_at")
    .single();

  if (error) throw error;

  if (parsed.rows.length > 0) {
    const rows = parsed.rows.map((row, index) => ({
      dataset_id: data.id,
      user_id: userId,
      row_index: index,
      row_data: row,
    }));

    for (let start = 0; start < rows.length; start += 500) {
      const batch = rows.slice(start, start + 500);
      const insert = await supabase.from("dataset_rows").insert(batch);
      if (insert.error) {
        await supabase
          .from("datasets")
          .update({ status: "error", last_error: insert.error.message })
          .eq("id", data.id);
        throw insert.error;
      }
    }
  }

  return data;
}

export async function analyzeLatestDataset(userId: string, question: string): Promise<QueryResponse | null> {
  if (!supabase) return null;

  const { data: datasets, error: datasetError } = await supabase
    .from("datasets")
    .select("id,file_name,row_count,columns_json,status")
    .eq("user_id", userId)
    .eq("status", "indexed")
    .order("created_at", { ascending: false })
    .limit(1);

  if (datasetError || !datasets || datasets.length === 0) return null;

  const dataset = datasets[0];
  const { data: rows, error: rowsError } = await supabase
    .from("dataset_rows")
    .select("row_index,row_data")
    .eq("dataset_id", dataset.id)
    .order("row_index", { ascending: true })
    .limit(5000);

  if (rowsError || !rows || rows.length === 0) return null;

  return buildDatasetAnswer(
    question,
    dataset.file_name,
    dataset.row_count,
    rows as DatasetRow[],
    dataset.columns_json ?? [],
  );
}

function parseCsv(text: string): { columns: string[]; rows: Array<Record<string, string>> } {
  const records = readCsvRecords(text).filter((record) => record.some((cell) => cell.trim()));
  if (records.length === 0) return { columns: [], rows: [] };

  const columns = records[0].map((column, index) => normalizeColumn(column, index));
  const rows = records.slice(1, 5001).map((record) => {
    const row: Record<string, string> = {};
    columns.forEach((column, index) => {
      row[column] = record[index]?.trim() ?? "";
    });
    return row;
  });

  return { columns, rows };
}

function readCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      records.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  records.push(row);
  return records;
}

function normalizeColumn(column: string, index: number) {
  const cleaned = column.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  return cleaned || `column_${index + 1}`;
}

function buildDatasetAnswer(
  question: string,
  fileName: string,
  totalRows: number,
  rows: DatasetRow[],
  columns: string[],
): QueryResponse {
  const normalized = question.toLowerCase();
  const rowData = rows.map((row) => row.row_data);
  const numericColumns = columns.filter((column) => rowData.some((row) => toNumber(row[column]) !== null));
  const featureColumn = findColumn(columns, ["feature", "feature_name", "event", "event_name", "screen", "module"]);
  const retentionColumn = findColumn(columns, ["retention", "retention_30d", "day_30_retention", "retained"]);
  const revenueColumn = findColumn(columns, ["revenue", "mrr", "arr", "arpu", "amount", "price"]);
  const engagementColumn = findColumn(columns, ["dau", "active_users", "sessions", "session_duration", "engagement"]);
  const dateColumn = findColumn(columns, ["date", "day", "week", "month", "created_at"]);
  const segmentColumn = featureColumn ?? findTextColumn(columns, rowData);

  if ((normalized.includes("retention") || normalized.includes("retain")) && retentionColumn) {
    const chartData = aggregateByText(rowData, segmentColumn, retentionColumn, "average")
      .sort((a, b) => Number(b.retention) - Number(a.retention))
      .slice(0, 8);
    const top = chartData[0];
    return responseFromDataset({
      question,
      intent: "Uploaded CSV Retention Analysis",
      answer: top
        ? `${top.feature} has the strongest retention in ${fileName} at ${Number(top.retention).toFixed(1)}%.`
        : `I found retention data in ${fileName}, but not enough segment values to rank features.`,
      chart_type: "bar",
      chart_data: chartData,
      generated_query: `CSV_ANALYZE ${fileName}: group by ${segmentColumn ?? "row"} and average ${retentionColumn}`,
      insights: [
        datasetInsight("Uploaded retention data is queryable", `${totalRows} rows are indexed from ${fileName}.`, "Use this dataset for retention follow-up questions."),
      ],
    });
  }

  if ((normalized.includes("revenue") || normalized.includes("mrr") || normalized.includes("arpu")) && revenueColumn) {
    const chartData = dateColumn
      ? aggregateByText(rowData, dateColumn, revenueColumn, "sum").map((row) => ({ date: row.feature, mrr: row.retention }))
      : topNumericRows(rowData, segmentColumn, revenueColumn).map((row) => ({ feature: row.feature, retention: row.retention }));
    const total = sumColumn(rowData, revenueColumn);
    return responseFromDataset({
      question,
      intent: "Uploaded CSV Revenue Analysis",
      answer: `${fileName} contains ${formatNumber(total)} total ${revenueColumn.replaceAll("_", " ")} across ${totalRows} rows.`,
      chart_type: dateColumn ? "line" : "bar",
      chart_data: chartData.slice(0, 12),
      generated_query: `CSV_ANALYZE ${fileName}: ${dateColumn ? `sum ${revenueColumn} by ${dateColumn}` : `rank ${revenueColumn}`}`,
      insights: [
        datasetInsight("Revenue data detected", `${revenueColumn} is available as a numeric field.`, "Segment revenue by plan, channel, or feature if those columns exist."),
      ],
    });
  }

  if ((normalized.includes("engagement") || normalized.includes("dau") || normalized.includes("session")) && engagementColumn) {
    const chartData = dateColumn
      ? aggregateByText(rowData, dateColumn, engagementColumn, "sum").map((row) => ({ date: row.feature, dau: row.retention }))
      : topNumericRows(rowData, segmentColumn, engagementColumn);
    return responseFromDataset({
      question,
      intent: "Uploaded CSV Engagement Analysis",
      answer: `${fileName} has ${engagementColumn.replaceAll("_", " ")} data indexed and ready for engagement analysis.`,
      chart_type: dateColumn ? "line" : "bar",
      chart_data: chartData.slice(0, 12),
      generated_query: `CSV_ANALYZE ${fileName}: ${dateColumn ? `sum ${engagementColumn} by ${dateColumn}` : `rank ${engagementColumn}`}`,
      insights: [
        datasetInsight("Engagement metric detected", `${engagementColumn} can be charted from the uploaded CSV.`, "Ask for trends, drops, or top segments."),
      ],
    });
  }

  const firstMetric = numericColumns[0];
  const chartData = firstMetric ? topNumericRows(rowData, segmentColumn, firstMetric).slice(0, 8) : previewRows(rowData);
  return responseFromDataset({
    question,
    intent: "Uploaded CSV Overview",
    answer: `${fileName} is indexed with ${totalRows} rows and ${columns.length} columns. ${
      numericColumns.length > 0 ? `I found numeric metrics including ${numericColumns.slice(0, 4).join(", ")}.` : "I did not find obvious numeric metric columns."
    }`,
    chart_type: firstMetric ? "bar" : "table",
    chart_data: chartData,
    generated_query: `CSV_PROFILE ${fileName}: inspect columns and summarize available metrics`,
    insights: [
      datasetInsight("CSV is connected", `${fileName} is available for natural-language analysis.`, "Ask about retention, revenue, engagement, or top segments using column names from the CSV."),
    ],
  });
}

function responseFromDataset(input: {
  question: string;
  intent: string;
  answer: string;
  chart_type: QueryResponse["chart_type"];
  chart_data: QueryResponse["chart_data"];
  generated_query: string;
  insights: Insight[];
}): QueryResponse {
  return {
    ...input,
    follow_ups: [
      "Summarize the uploaded CSV",
      "Show the top metric by segment",
      "Which rows look most important?",
    ],
  };
}

function datasetInsight(title: string, summary: string, recommendation: string): Insight {
  return { title, summary, recommendation, confidence: 82, priority: "Medium" };
}

function findColumn(columns: string[], candidates: string[]) {
  return columns.find((column) => candidates.includes(column) || candidates.some((candidate) => column.includes(candidate)));
}

function findTextColumn(columns: string[], rows: Array<Record<string, string>>) {
  return columns.find((column) => rows.some((row) => row[column] && toNumber(row[column]) === null));
}

function aggregateByText(
  rows: Array<Record<string, string>>,
  groupColumn: string | undefined,
  metricColumn: string,
  mode: "average" | "sum",
) {
  const grouped = new Map<string, { total: number; count: number }>();

  rows.forEach((row, index) => {
    const value = toNumber(row[metricColumn]);
    if (value === null) return;
    const group = groupColumn ? row[groupColumn] || "Unknown" : `Row ${index + 1}`;
    const current = grouped.get(group) ?? { total: 0, count: 0 };
    grouped.set(group, { total: current.total + value, count: current.count + 1 });
  });

  return Array.from(grouped.entries()).map(([feature, value]) => ({
    feature,
    retention: mode === "average" ? value.total / value.count : value.total,
  }));
}

function topNumericRows(rows: Array<Record<string, string>>, labelColumn: string | undefined, metricColumn: string) {
  return rows
    .map((row, index) => ({
      feature: labelColumn ? row[labelColumn] || `Row ${index + 1}` : `Row ${index + 1}`,
      retention: toNumber(row[metricColumn]) ?? 0,
    }))
    .sort((a, b) => b.retention - a.retention)
    .slice(0, 12);
}

function previewRows(rows: Array<Record<string, string>>) {
  return rows.slice(0, 6).map((row, index) => ({ row: index + 1, ...row }));
}

function sumColumn(rows: Array<Record<string, string>>, column: string) {
  return rows.reduce((total, row) => total + (toNumber(row[column]) ?? 0), 0);
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/[$,%]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
}
