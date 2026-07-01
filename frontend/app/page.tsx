"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Loader2,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  Workflow,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { askQuestion, getExecutiveReport, getIntegrations, getOverview } from "@/lib/api";
import { isSupabaseConfigured, supabase, type AppUser } from "@/lib/supabase";
import { listDatasets, saveConversation, saveDashboard, uploadDataset, type DatasetRecord } from "@/lib/supabase-persistence";
import type { ExecutiveReport, Insight, Integration, MetricCard, Overview, QueryResponse } from "@/lib/types";

const sampleQuestions = [
  "Which feature has the highest retention?",
  "Why did engagement decrease this week?",
  "Show revenue trend",
  "Where do users drop off in the funnel?",
];

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "AI Chat", icon: Bot },
  { label: "Reports", icon: FileText },
  { label: "Alerts", icon: Bell },
  { label: "Settings", icon: Settings },
];

export default function Home() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [query, setQuery] = useState(sampleQuestions[0]);
  const [answer, setAnswer] = useState<QueryResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [persistenceMessage, setPersistenceMessage] = useState("");

  useEffect(() => {
    Promise.all([getOverview(), getIntegrations(), getExecutiveReport(), askQuestion(sampleQuestions[0])]).then(
      ([overviewData, integrationData, reportData, firstAnswer]) => {
        setOverview(overviewData);
        setIntegrations(integrationData);
        setReport(reportData);
        setAnswer(firstAnswer);
      },
    );
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthMessage("");
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setDatasets([]);
      return;
    }

    listDatasets(user.id)
      .then(setDatasets)
      .catch(() => setPersistenceMessage("Unable to load datasets. Check Supabase RLS setup."));
  }, [user]);

  async function submitQuestion(question = query) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setIsAsking(true);
    setQuery(trimmed);
    const response = await askQuestion(trimmed);
    setAnswer(response);
    if (user) {
      try {
        await saveConversation(user.id, response);
        setPersistenceMessage("Conversation saved to Supabase.");
      } catch {
        setPersistenceMessage("Answer generated, but Supabase could not save the conversation.");
      }
    }
    setIsAsking(false);
  }

  async function handleAuth(mode: "signin" | "signup") {
    if (!supabase) {
      setAuthMessage("Add Supabase env vars to enable authentication.");
      return;
    }

    if (!authEmail || !authPassword) {
      setAuthMessage("Enter email and password.");
      return;
    }

    const request =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        : supabase.auth.signUp({ email: authEmail, password: authPassword });

    const { error } = await request;
    setAuthMessage(error ? error.message : mode === "signin" ? "Signed in." : "Account created. Check email if confirmation is enabled.");
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setPersistenceMessage("");
  }

  async function handleSaveDashboard() {
    if (!user || !answer) {
      setPersistenceMessage("Sign in with Supabase to save dashboards.");
      return;
    }

    try {
      await saveDashboard(user.id, answer);
      setPersistenceMessage("Dashboard saved to Supabase.");
    } catch {
      setPersistenceMessage("Dashboard save failed. Check Supabase RLS setup.");
    }
  }

  async function handleDatasetUpload(file: File | undefined) {
    if (!file) return;
    if (!user) {
      setPersistenceMessage("Sign in with Supabase to upload datasets.");
      return;
    }

    setIsUploading(true);
    try {
      const dataset = await uploadDataset(user.id, file);
      setDatasets((current) => [dataset, ...current].slice(0, 5));
      setPersistenceMessage("CSV uploaded to Supabase Storage.");
    } catch {
      setPersistenceMessage("Upload failed. Check the Supabase storage bucket and RLS policies.");
    } finally {
      setIsUploading(false);
    }
  }

  const selectedChart = useMemo(() => {
    if (!answer) return null;
    return <AnswerChart response={answer} />;
  }, [answer]);

  return (
    <main className="min-h-screen text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-ink/10 bg-white/72 px-4 py-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-pine text-white">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold">Product Metrics</p>
              <p className="text-xs text-ink/55">Explorer Cloud</p>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm transition ${
                    index === 0 ? "bg-mint text-pine" : "text-ink/68 hover:bg-ink/5"
                  }`}
                  title={item.label}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-8 rounded-lg border border-ink/10 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">Workspace</p>
            <p className="mt-2 text-sm font-semibold">Acme Mobile App</p>
            <p className="mt-1 text-xs text-ink/58">Production data sample</p>
          </div>
        </aside>

        <section className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
          <header className="mb-5 flex flex-col gap-4 border-b border-ink/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink/58">
                <span>Acme Mobile App</span>
                <span className="h-1 w-1 rounded-full bg-ink/30" />
                <span>June 2026</span>
                <span className="h-1 w-1 rounded-full bg-ink/30" />
                <span>Cloud MVP</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">Product Intelligence Workspace</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill icon={ShieldCheck} label={user ? "Supabase session" : "Auth ready"} />
              <StatusPill icon={Database} label="Warehouse sample" />
              <StatusPill icon={Activity} label="Live API" />
            </div>
          </header>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {(overview?.metrics ?? []).map((metric) => (
                  <MetricTile key={metric.label} metric={metric} />
                ))}
              </section>

              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
                <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">AI Metrics Explorer</p>
                      <p className="text-xs text-ink/58">Natural-language analytics</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDashboard}
                        className="grid h-9 w-9 place-items-center rounded-md border border-ink/10 text-ink/70 hover:bg-mist"
                        title="Saved dashboards"
                      >
                        <Save className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        className="grid h-9 w-9 place-items-center rounded-md border border-ink/10 text-ink/70 hover:bg-mist"
                        title="Metric health"
                      >
                        <Gauge className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <form
                    className="flex flex-col gap-2 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitQuestion();
                    }}
                  >
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="min-h-11 flex-1 rounded-md border border-ink/12 bg-mist/60 px-3 text-sm outline-none ring-pine/20 transition focus:border-pine focus:ring-4"
                      placeholder="Ask a product metrics question"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-white transition hover:bg-pine/92 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isAsking}
                    >
                      {isAsking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                      Run
                    </button>
                  </form>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {sampleQuestions.map((question) => (
                      <button
                        key={question}
                        onClick={() => submitQuestion(question)}
                        className="rounded-md border border-ink/10 bg-white px-3 py-2 text-left text-xs text-ink/72 transition hover:border-pine/30 hover:bg-mint/45"
                      >
                        {question}
                      </button>
                    ))}
                  </div>

                  {answer && (
                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                      <div className="rounded-lg bg-mist/70 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pine">
                          <Bot className="h-4 w-4" aria-hidden />
                          {answer.intent}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-ink/82">{answer.answer}</p>
                        <pre className="mt-4 max-h-28 overflow-auto rounded-md bg-ink p-3 text-xs leading-5 text-mint">
                          {answer.generated_query}
                        </pre>
                      </div>
                      <div className="rounded-lg border border-ink/10 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">Follow-ups</p>
                        <div className="mt-3 space-y-2">
                          {answer.follow_ups.map((followUp) => (
                            <button
                              key={followUp}
                              onClick={() => submitQuestion(followUp)}
                              className="block w-full rounded-md bg-mist px-3 py-2 text-left text-xs leading-5 text-ink/76 hover:bg-mint"
                            >
                              {followUp}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Generated Visualization</p>
                      <p className="text-xs text-ink/58">{answer?.chart_type ?? "bar"} chart</p>
                    </div>
                    <StatusPill icon={Sparkles} label="AI selected" />
                  </div>
                  <div className="h-[330px] min-h-[330px]">{selectedChart}</div>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <ChartPanel title="Retention by Feature" subtitle="30-day retained users">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview?.retention_by_feature ?? []} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#dfe8df" />
                      <XAxis dataKey="feature" tickLine={false} axisLine={false} className="chart-axis" />
                      <YAxis tickLine={false} axisLine={false} className="chart-axis" />
                      <Tooltip cursor={{ fill: "#eef3ee" }} />
                      <Bar dataKey="retention" radius={[6, 6, 0, 0]} fill="#145240" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="Engagement Trend" subtitle="DAU and average minutes">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview?.engagement_trend ?? []} margin={{ top: 8, right: 18, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#dfe8df" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} className="chart-axis" />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} className="chart-axis" />
                      <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} className="chart-axis" />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="dau" stroke="#145240" strokeWidth={3} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="avg_minutes" stroke="#ff6b57" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartPanel>
              </section>
            </div>

            <aside className="space-y-4">
                <Panel title="AI Insight Queue" subtitle="Ranked product opportunities">
                <div className="space-y-3">
                  {(answer?.insights ?? overview?.insights ?? []).map((insight) => (
                    <InsightCard key={insight.title} insight={insight} />
                  ))}
                </div>
              </Panel>

              <Panel title="Supabase Workspace" subtitle={isSupabaseConfigured ? "Auth, storage, and saved work" : "Demo mode until env vars are set"}>
                <AuthPanel
                  user={user}
                  email={authEmail}
                  password={authPassword}
                  message={authMessage}
                  onEmailChange={setAuthEmail}
                  onPasswordChange={setAuthPassword}
                  onAuth={handleAuth}
                  onSignOut={handleSignOut}
                />
                <DatasetUploader
                  datasets={datasets}
                  isUploading={isUploading}
                  message={persistenceMessage}
                  onUpload={handleDatasetUpload}
                />
              </Panel>

              <Panel title="Connected Sources" subtitle="Data sync status">
                <div className="space-y-2">
                  {integrations.map((integration) => (
                    <div key={integration.name} className="flex items-center justify-between rounded-md border border-ink/10 bg-mist/45 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{integration.name}</p>
                        <p className="text-xs text-ink/55">{integration.category}</p>
                      </div>
                      <div className="text-right">
                        <StatusDot status={integration.status} />
                        <p className="mt-1 text-xs text-ink/50">{integration.last_sync}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {report && (
                <Panel title={report.title} subtitle={report.period}>
                  <ReportBlock label="Highlights" items={report.highlights} tone="good" />
                  <ReportBlock label="Risks" items={report.risks} tone="risk" />
                  <ReportBlock label="Actions" items={report.recommended_actions} tone="action" />
                </Panel>
              )}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricTile({ metric }: { metric: MetricCard }) {
  const isDown = metric.trend === "down";
  const Icon = isDown ? TrendingDown : TrendingUp;
  return (
    <article className="min-h-32 rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">{metric.label}</p>
        <div className={`grid h-8 w-8 place-items-center rounded-md ${isDown ? "bg-coral/12 text-coral" : "bg-mint text-pine"}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold">{metric.value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className={isDown ? "font-semibold text-coral" : "font-semibold text-pine"}>{metric.delta}</span>
        <span className="text-ink/55">{metric.detail}</span>
      </div>
    </article>
  );
}

function AnswerChart({ response }: { response: QueryResponse }) {
  if (response.chart_type === "funnel") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={response.chart_data} layout="vertical" margin={{ top: 8, right: 18, left: 16, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="#dfe8df" />
          <XAxis type="number" tickLine={false} axisLine={false} className="chart-axis" />
          <YAxis type="category" dataKey="stage" width={96} tickLine={false} axisLine={false} className="chart-axis" />
          <Tooltip />
          <Bar dataKey="conversion" radius={[0, 6, 6, 0]} fill="#145240" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (response.chart_type === "line") {
    const firstNumericKey = Object.keys(response.chart_data[0] ?? {}).find((key) => typeof response.chart_data[0][key] === "number") ?? "dau";
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={response.chart_data} margin={{ top: 8, right: 18, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#dfe8df" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} className="chart-axis" />
          <YAxis tickLine={false} axisLine={false} className="chart-axis" />
          <Tooltip />
          <Line type="monotone" dataKey={firstNumericKey} stroke="#145240" strokeWidth={3} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (response.chart_type === "table") {
    return (
      <div className="h-full overflow-auto rounded-md border border-ink/10">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <tbody>
            {response.chart_data.map((row, index) => (
              <tr key={index} className="border-b border-ink/10 last:border-0">
                {Object.entries(row).map(([key, value]) => (
                  <td key={key} className="px-3 py-3">
                    <span className="block text-xs uppercase tracking-wide text-ink/45">{key}</span>
                    <span className="font-semibold">{String(value)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={response.chart_data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#dfe8df" />
        <XAxis dataKey="feature" tickLine={false} axisLine={false} className="chart-axis" />
        <YAxis tickLine={false} axisLine={false} className="chart-axis" />
        <Tooltip cursor={{ fill: "#eef3ee" }} />
        <Bar dataKey="retention" radius={[6, 6, 0, 0]}>
          {response.chart_data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={index === 0 ? "#145240" : index === 1 ? "#2a7f62" : index === 2 ? "#f5b942" : "#ff6b57"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const priorityClass =
    insight.priority === "High" ? "bg-coral/12 text-coral" : insight.priority === "Medium" ? "bg-gold/20 text-ink" : "bg-mint text-pine";
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5">{insight.title}</h3>
        <span className={`shrink-0 rounded px-2 py-1 text-[11px] font-semibold ${priorityClass}`}>{insight.priority}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink/64">{insight.summary}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-pine">{insight.confidence}% confidence</p>
        <CheckCircle2 className="h-4 w-4 text-pine" aria-hidden />
      </div>
      <p className="mt-2 rounded-md bg-mist px-3 py-2 text-xs leading-5 text-ink/72">{insight.recommendation}</p>
    </article>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-ink/55">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="h-[310px] rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
      <div className="mb-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-ink/55">{subtitle}</p>
      </div>
      <div className="h-[245px]">{children}</div>
    </section>
  );
}

function StatusPill({ icon: Icon, label }: { icon: typeof Activity; label: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-md border border-ink/10 bg-white px-3 text-xs font-medium text-ink/70">
      <Icon className="h-3.5 w-3.5 text-pine" aria-hidden />
      {label}
    </span>
  );
}

function StatusDot({ status }: { status: Integration["status"] }) {
  const className =
    status === "connected" ? "bg-pine" : status === "syncing" ? "bg-gold" : "bg-ink/30";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold capitalize">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {status}
    </span>
  );
}

function AuthPanel({
  user,
  email,
  password,
  message,
  onEmailChange,
  onPasswordChange,
  onAuth,
  onSignOut,
}: {
  user: AppUser | null;
  email: string;
  password: string;
  message: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onAuth: (mode: "signin" | "signup") => void;
  onSignOut: () => void;
}) {
  if (user) {
    return (
      <div className="rounded-lg border border-ink/10 bg-mint/45 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-pine">Signed in</p>
            <p className="mt-1 truncate text-sm font-semibold">{user.email}</p>
          </div>
          <button
            onClick={onSignOut}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-pine/20 bg-white text-pine hover:bg-mint"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ink/10 bg-mist/55 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pine">
        <Users className="h-4 w-4" aria-hidden />
        Supabase Auth
      </div>
      <div className="mt-3 space-y-2">
        <input
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          className="h-10 w-full rounded-md border border-ink/10 bg-white px-3 text-sm outline-none ring-pine/15 focus:border-pine focus:ring-4"
          placeholder="Email"
          type="email"
        />
        <input
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          className="h-10 w-full rounded-md border border-ink/10 bg-white px-3 text-sm outline-none ring-pine/15 focus:border-pine focus:ring-4"
          placeholder="Password"
          type="password"
        />
        <div className="grid grid-cols-2 gap-2">
          <button className="h-9 rounded-md bg-pine text-xs font-semibold text-white hover:bg-pine/92" onClick={() => onAuth("signin")}>
            Sign in
          </button>
          <button className="h-9 rounded-md border border-ink/10 bg-white text-xs font-semibold text-ink/75 hover:bg-mint" onClick={() => onAuth("signup")}>
            Sign up
          </button>
        </div>
        {message && <p className="text-xs leading-5 text-ink/62">{message}</p>}
      </div>
    </div>
  );
}

function DatasetUploader({
  datasets,
  isUploading,
  message,
  onUpload,
}: {
  datasets: DatasetRecord[];
  isUploading: boolean;
  message: string;
  onUpload: (file: File | undefined) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-ink/10 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">CSV Connector</p>
          <p className="mt-1 text-xs text-ink/58">Upload sample product data</p>
        </div>
        <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-ink/10 text-pine hover:bg-mint" title="Upload CSV">
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
          <input
            className="hidden"
            type="file"
            accept=".csv,text/csv"
            disabled={isUploading}
            onChange={(event) => onUpload(event.target.files?.[0])}
          />
        </label>
      </div>
      {message && <p className="mt-3 rounded-md bg-mist px-3 py-2 text-xs leading-5 text-ink/70">{message}</p>}
      <div className="mt-3 space-y-2">
        {datasets.length === 0 ? (
          <p className="text-xs leading-5 text-ink/55">No uploaded datasets yet.</p>
        ) : (
          datasets.map((dataset) => (
            <div key={dataset.id} className="rounded-md bg-mist/70 px-3 py-2">
              <p className="truncate text-xs font-semibold">{dataset.file_name}</p>
              <p className="mt-1 text-[11px] text-ink/50">{Math.max(1, Math.round(dataset.file_size / 1024))} KB · {dataset.status}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReportBlock({ label, items, tone }: { label: string; items: string[]; tone: "good" | "risk" | "action" }) {
  const marker = tone === "good" ? "bg-pine" : tone === "risk" ? "bg-coral" : "bg-gold";
  return (
    <div className="mt-4 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-5 text-ink/70">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${marker}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
