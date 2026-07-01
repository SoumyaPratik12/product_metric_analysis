import { supabase } from "./supabase";
import type { QueryResponse } from "./types";

export type DatasetRecord = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  status: string;
  created_at: string;
};

export async function saveConversation(userId: string, response: QueryResponse) {
  if (!supabase) return;

  await supabase.from("ai_conversations").insert({
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
}

export async function saveDashboard(userId: string, response: QueryResponse) {
  if (!supabase) return;

  await supabase.from("saved_dashboards").insert({
    user_id: userId,
    name: `${response.intent} Dashboard`,
    layout_json: {
      source: "generated-answer",
      response,
    },
  });
}

export async function listDatasets(userId: string): Promise<DatasetRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("datasets")
    .select("id,file_name,file_path,file_size,status,created_at")
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
      status: "uploaded",
    })
    .select("id,file_name,file_path,file_size,status,created_at")
    .single();

  if (error) throw error;
  return data;
}

