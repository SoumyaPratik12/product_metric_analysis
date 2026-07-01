import { fallbackIntegrations, fallbackOverview, fallbackQuery, fallbackReport } from "./fallback";
import type { ExecutiveReport, Integration, Overview, QueryResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit, fallback?: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    if (fallback) return fallback;
    throw new Error("Unable to reach analytics API");
  }
}

export function getOverview(): Promise<Overview> {
  return request<Overview>("/api/overview", undefined, fallbackOverview);
}

export function askQuestion(question: string): Promise<QueryResponse> {
  return request<QueryResponse>(
    "/api/query",
    {
      method: "POST",
      body: JSON.stringify({ question }),
    },
    { ...fallbackQuery, question },
  );
}

export function getIntegrations(): Promise<Integration[]> {
  return request<Integration[]>("/api/integrations", undefined, fallbackIntegrations);
}

export function getExecutiveReport(): Promise<ExecutiveReport> {
  return request<ExecutiveReport>("/api/reports/executive", undefined, fallbackReport);
}

