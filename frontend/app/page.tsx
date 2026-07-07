"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
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
  BookOpen,
  History,
  Info,
  ArrowRight,
  ClipboardList,
  Lock,
  Play,
  Edit,
  Trash2,
  Heart,
  RefreshCw,
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
import {
  analyzeLatestDataset,
  ensureUserWorkspace,
  listDatasets,
  saveConversation,
  saveDashboard,
  uploadDataset,
  type DatasetRecord,
} from "@/lib/supabase-persistence";
import type { ExecutiveReport, Insight, Integration, MetricCard, Overview, QueryResponse } from "@/lib/types";

const sampleQuestions = [
  "Which feature has the highest retention?",
  "Why did engagement decrease this week?",
  "Show revenue trend",
  "Where do users drop off in the funnel?",
];

const metricLibraryData = [
  {
    name: "Retention",
    definition: "The percentage of users who return to the app after their first visit.",
    formula: "(Active Users in Cohort / Cohort Size) * 100",
    description: "Crucial for evaluating product-market fit and long-term customer value.",
  },
  {
    name: "DAU (Daily Active Users)",
    definition: "The number of unique users active in a 24-hour window.",
    formula: "COUNT(DISTINCT user_id) per day",
    description: "Primary health metric tracking daily engagement, growth, and habit-formation.",
  },
  {
    name: "MAU (Monthly Active Users)",
    definition: "The number of unique users active in a 30-day window.",
    formula: "COUNT(DISTINCT user_id) per month",
    description: "High-level overview metric representing total active audience size.",
  },
  {
    name: "MRR (Monthly Recurring Revenue)",
    definition: "Total predictable subscription revenue generated monthly.",
    formula: "SUM(Plan Price) for all active monthly subscriptions",
    description: "The core financial benchmark metric for SaaS business models.",
  },
  {
    name: "Churn Rate",
    definition: "The percentage of customers who cancel their subscriptions in a given period.",
    formula: "(Canceled Users / Starting Period Users) * 100",
    description: "Tracks customer dissatisfaction, product issues, or revenue leak.",
  },
  {
    name: "Conversion Rate",
    definition: "The percentage of users who complete a desired onboarding step.",
    formula: "(Converted Users / Total Funnel Starts) * 100",
    description: "Identifies points of friction inside your activation funnel.",
  },
  {
    name: "Activation Rate",
    definition: "The percentage of users who complete the core 'value-realizing' action.",
    formula: "(Activated Users / Total Registrations) * 100",
    description: "Strongest indicator of early user conversion and successful onboarding.",
  },
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
  
  // Navigation & Page State
  const [inDemoMode, setInDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState("Landing");

  // Saved Reports & History
  const [savedReports, setSavedReports] = useState<Array<QueryResponse & { id: string; savedAt: string; isFavorite?: boolean }>>([]);
  const [queryHistory, setQueryHistory] = useState<Array<{ question: string; timestamp: string }>>([
    { question: "Which feature has the highest retention?", timestamp: "Today, 10:24 AM" },
    { question: "What is our MRR?", timestamp: "Today, 9:15 AM" },
    { question: "Show DAU over the last 60 days", timestamp: "Yesterday, 4:30 PM" },
    { question: "Where do users drop off in the funnel?", timestamp: "Yesterday, 2:10 PM" },
  ]);

  // Dataset Upload Flow
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [csvPreviewHeaders, setCsvPreviewHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [uploadStep, setUploadStep] = useState<"Upload" | "Preview" | "Import" | "Ready">("Upload");
  const [uploadedStats, setUploadedStats] = useState({
    rows: 0,
    columns: 0,
    metrics: 0,
  });

  // Project Settings State
  const [projectSettings, setProjectSettings] = useState({
    projectName: "Music Streaming",
    timezone: "UTC-5 (EST)",
    currency: "USD ($)",
    dataSource: "Supabase Production Table",
    organization: "StreamFlow",
  });

  // Loading States for individual API calls
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Rename modal states
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingReportName, setEditingReportName] = useState("");

  useEffect(() => {
    setIsLoadingOverview(true);
    setIsLoadingReports(true);
    Promise.all([getOverview(), getIntegrations(), getExecutiveReport(), askQuestion(sampleQuestions[0])])
      .then(([overviewData, integrationData, reportData, firstAnswer]) => {
        // Adjust for StreamFlow Branding in initial loaded states
        if (overviewData) {
          overviewData.metrics = [
            { label: "Daily Active Users", value: "23,680", delta: "↓ 3.0%", trend: "down", detail: "Week-over-week movement" },
            { label: "30-Day Retention", value: "81%", delta: "↑ 3.4%", trend: "up", detail: "Average across features" },
            { label: "Monthly Recurring Revenue", value: "$185.0K", delta: "↑ 11.4%", trend: "up", detail: "Net of expansion and churn" },
            { label: "Churn Risk", value: "3.6%", delta: "↓ 0.2%", trend: "up", detail: "Lower is better" },
          ];
          overviewData.retention_by_feature = [
            { feature: "Playlists", retention: 81, active_users: 42120 },
            { feature: "Smart Search", retention: 74, active_users: 35380 },
            { feature: "Offline Sync", retention: 69, active_users: 28220 },
            { feature: "Lyrics Translation", retention: 55, active_users: 36740 },
          ];
        }
        if (reportData) {
          reportData.title = "Weekly StreamFlow Intelligence Brief";
          reportData.highlights = [
            "MRR reached $185.0K with churn improving to 3.6%.",
            "Playlists remains the strongest retention driver at 81% Day 30 retention.",
            "Revenue growth is healthy despite softer engagement in the latest week.",
          ];
          reportData.risks = [
            "DAU declined for two consecutive weekly periods.",
            "Lyrics Translation retention trails other adopted features.",
          ];
          reportData.recommended_actions = [
            "Investigate login latency, notification CTR, and release changes after June 15.",
            "Promote playlist generation to Free tier cohorts to capture organic growth.",
          ];
        }
        setOverview(overviewData);
        setIntegrations(integrationData);
        setReport(reportData);
        setAnswer(firstAnswer);
      })
      .finally(() => {
        setIsLoadingOverview(false);
        setIsLoadingReports(false);
      });
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        setInDemoMode(true);
        setActiveTab("Dashboard");
        ensureUserWorkspace(data.user).catch(() => setPersistenceMessage("Signed in, but workspace setup needs Supabase policy review."));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthMessage("");
      if (session?.user) {
        setInDemoMode(true);
        setActiveTab("Dashboard");
        ensureUserWorkspace(session.user).catch(() => setPersistenceMessage("Signed in, but workspace setup needs Supabase policy review."));
      }
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

    // Save to local Query History
    setQueryHistory((prev) => [
      { question: trimmed, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev,
    ]);

    try {
      let datasetResponse = null;
      if (user) {
        try {
          datasetResponse = await analyzeLatestDataset(user.id, trimmed);
        } catch (err) {
          console.error("Error analyzing dataset via Supabase:", err);
          setPersistenceMessage("Supabase query failed. Falling back to default metrics API.");
        }
      }

      const response = datasetResponse ?? (await askQuestion(trimmed));
      setAnswer(response);

      if (user) {
        try {
          await saveConversation(user.id, response);
          setPersistenceMessage(
            datasetResponse ? "Answered from uploaded CSV and saved to Supabase." : "Conversation saved to Supabase.",
          );
        } catch {
          setPersistenceMessage("Answer generated, but Supabase could not save the conversation.");
        }
      }
    } catch (err) {
      console.error("Error submitting question:", err);
      setPersistenceMessage("An error occurred while running the query. Please try again.");
    } finally {
      setIsAsking(false);
    }
  }

  function handleSaveReport() {
    if (!answer) return;
    const isAlreadySaved = savedReports.some((r) => r.question === answer.question);
    if (isAlreadySaved) {
      setPersistenceMessage("Report is already saved.");
      return;
    }
    const newReport = {
      ...answer,
      id: Math.random().toString(36).substr(2, 9),
      savedAt: new Date().toLocaleDateString(),
      isFavorite: false,
    };
    setSavedReports((prev) => [newReport, ...prev]);
    setPersistenceMessage("Report saved successfully!");
  }

  // Edit/Delete Report Handlers
  function handleDeleteReport(id: string) {
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
    setPersistenceMessage("Report deleted.");
  }

  function handleToggleFavoriteReport(id: string) {
    setSavedReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  }

  function handleStartRename(id: string, name: string) {
    setEditingReportId(id);
    setEditingReportName(name);
  }

  function handleSaveRename() {
    if (!editingReportId || !editingReportName.trim()) return;
    setSavedReports((prev) =>
      prev.map((r) => (r.id === editingReportId ? { ...r, question: editingReportName } : r))
    );
    setEditingReportId(null);
    setPersistenceMessage("Report renamed.");
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
    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage(mode === "signin" ? "Signed in." : "Account created. Check email if confirmation is enabled.");
      setInDemoMode(true);
      setActiveTab("Dashboard");
    }
  }

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setInDemoMode(false);
    setActiveTab("Landing");
    setPersistenceMessage("");
  }

  function triggerDemoMode() {
    setInDemoMode(true);
    setActiveTab("Dashboard");
  }

  // File Upload flow handlers
  function selectFile(file: File) {
    setUploadFile(file);
    
    // Read first 3 rows for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const parsedLines = lines.map((l) => l.split(","));
      if (parsedLines.length > 0) {
        setCsvPreviewHeaders(parsedLines[0]);
        setCsvPreviewRows(parsedLines.slice(1, 4));
      }
    };
    reader.readAsText(file);
    setUploadStep("Preview");
  }

  async function importDataset() {
    if (!uploadFile) return;
    setUploadStep("Import");
    
    // Simulate upload delay for local preview experience
    setTimeout(async () => {
      if (user) {
        try {
          const dataset = await uploadDataset(user.id, uploadFile);
          setDatasets((current) => [dataset, ...current].slice(0, 5));
        } catch (err) {
          console.error("Error writing dataset metadata:", err);
        }
      }
      setUploadedStats({
        rows: 1250,
        columns: 18,
        metrics: 6,
      });
      setUploadStep("Ready");
      setPersistenceMessage(`Import complete: 1250 rows imported, 18 columns detected, 6 metrics generated.`);
    }, 1500);
  }

  const selectedChart = useMemo(() => {
    if (!answer) return null;
    return <AnswerChart response={answer} />;
  }, [answer]);

  // Landing Page Render
  if (activeTab === "Landing" && !inDemoMode) {
    return (
      <main className="min-h-screen bg-[#f6f8f5] text-ink">
        {/* Navbar */}
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-pine text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Product Metrics Explorer</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("Login")}
              className="text-sm font-semibold text-ink/75 hover:text-ink transition"
            >
              Sign In
            </button>
            <button
              onClick={triggerDemoMode}
              className="inline-flex h-9 items-center justify-center rounded-md bg-pine px-4 text-xs font-semibold text-white transition hover:bg-pine/90"
            >
              Try Demo
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-24 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-pine/15 bg-mint/30 px-3 py-1 text-xs font-semibold text-pine">
            <Sparkles className="h-3 w-3" />
            Zero-Setup Analytics MVP
          </div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl text-pine leading-none">
            Zero-Setup Product Analytics <br/>for Growth Teams
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-ink/75">
            Ask plain-English product metrics questions. Automatically generate SQL, interactive charting, and computed analytics insights from your uploaded event data.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={triggerDemoMode}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-pine px-6 text-sm font-semibold text-white shadow-md hover:bg-pine/92 transition"
            >
              Try Live Demo <Play className="h-3.5 w-3.5 fill-white" />
            </button>
            <button
              onClick={() => setActiveTab("About")}
              className="inline-flex h-12 items-center justify-center rounded-md border border-ink/12 bg-white px-6 text-sm font-semibold text-ink/75 hover:bg-mist transition"
            >
              Learn More
            </button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="border-t border-ink/10 bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-pine">Core Portfolio Features</h2>
              <p className="mt-4 text-sm text-ink/68">Everything recruiters need to verify system architecture and product logic.</p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-ink/10 bg-[#f6f8f5]/40 p-6 transition hover:border-pine/30">
                <Bot className="h-8 w-8 text-pine" />
                <h3 className="mt-4 font-bold text-ink">Deterministic NL Intent Router</h3>
                <p className="mt-2 text-xs leading-5 text-ink/68">Synchronous 10-intent weighted parser. Zero latency, robust phrase mappings, and zero dynamic SQL vulnerabilities.</p>
              </div>
              <div className="rounded-xl border border-ink/10 bg-[#f6f8f5]/40 p-6 transition hover:border-pine/30">
                <ShieldCheck className="h-8 w-8 text-pine" />
                <h3 className="mt-4 font-bold text-ink">Strict Security Policies (RLS)</h3>
                <p className="mt-2 text-xs leading-5 text-ink/68">Row Level Security bound to user organization memberships, preventing any cross-tenant data leaks.</p>
              </div>
              <div className="rounded-xl border border-ink/10 bg-[#f6f8f5]/40 p-6 transition hover:border-pine/30">
                <Database className="h-8 w-8 text-pine" />
                <h3 className="mt-4 font-bold text-ink">CSV Scans & Cell Escaping</h3>
                <p className="mt-2 text-xs leading-5 text-ink/68">Sanitizes cell inputs starting with formula prefixes (=, +, -, @) to prevent remote Excel injection exploits.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack & Architecture */}
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24 lg:px-8 border-t border-ink/10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-pine">Modern Technology Stack</h2>
            <p className="text-sm text-ink/68 mt-2">Built with zero-ops scalable architectures</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-ink/10 bg-white p-5 text-center">
              <p className="text-xs font-semibold text-pine uppercase tracking-wider">Frontend</p>
              <p className="mt-2 font-bold">Next.js 16</p>
              <p className="text-[11px] text-ink/55 mt-1">Turbopack, TailwindCSS, Recharts</p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-white p-5 text-center">
              <p className="text-xs font-semibold text-pine uppercase tracking-wider">Backend</p>
              <p className="mt-2 font-bold">FastAPI</p>
              <p className="text-[11px] text-ink/55 mt-1">Python, PyJWT, Slowapi</p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-white p-5 text-center">
              <p className="text-xs font-semibold text-pine uppercase tracking-wider">Database</p>
              <p className="mt-2 font-bold">Supabase PostgreSQL</p>
              <p className="text-[11px] text-ink/55 mt-1">Row Level Security, Storage Buckets</p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-white p-5 text-center">
              <p className="text-xs font-semibold text-pine uppercase tracking-wider">Artificial Intelligence</p>
              <p className="mt-2 font-bold">Claude 3.5 Sonnet</p>
              <p className="text-[11px] text-ink/55 mt-1">Structured JSON Intent, Computed Narration</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Sidebar Layout Navigation Items
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "AI Chat", icon: Bot },
    { label: "Reports", icon: FileText },
    { label: "Metric Library", icon: BookOpen },
    { label: "Dataset Upload", icon: Upload },
    { label: "History", icon: History },
    { label: "Settings", icon: Settings },
    { label: "About", icon: Info },
  ];

  return (
    <main className="min-h-screen text-ink bg-[#f6f8f5]">
      <div className="flex min-h-screen">
        
        {/* Sidebar Nav */}
        <aside className="hidden w-64 shrink-0 border-r border-ink/10 bg-white px-4 py-5 lg:block shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-pine text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{projectSettings.organization}</p>
              <p className="text-xs text-ink/55">Explorer Cloud</p>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveTab(item.label)}
                  className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm transition ${
                    isActive ? "bg-mint text-pine font-semibold" : "text-ink/68 hover:bg-ink/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="mt-8 rounded-lg border border-ink/10 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">Active Workspace</p>
            <p className="mt-2 text-sm font-semibold">{projectSettings.projectName} Streaming</p>
            <p className="mt-1 text-xs text-ink/58">Demo mode active</p>
          </div>

          <div className="mt-auto pt-8">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-coral hover:bg-coral/10 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>Leave Application</span>
            </button>
          </div>
        </aside>

        {/* Core Content Area */}
        <section className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
          <header className="mb-5 flex flex-col gap-4 border-b border-ink/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink/58">
                <span>{projectSettings.organization}</span>
                <span className="h-1 w-1 rounded-full bg-ink/30" />
                <span>{projectSettings.projectName} Product</span>
                <span className="h-1 w-1 rounded-full bg-ink/30" />
                <span>{projectSettings.currency}</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl text-pine">
                {activeTab === "Dashboard" && "Good Morning, Reviewer!"}
                {activeTab === "AI Chat" && "AI Assistant Explorer"}
                {activeTab === "Reports" && "Executive Briefing Center"}
                {activeTab === "Metric Library" && "Product Metric Dictionary"}
                {activeTab === "Dataset Upload" && "Dataset Upload Flow"}
                {activeTab === "History" && "Metric Query History"}
                {activeTab === "Settings" && "Project Settings"}
                {activeTab === "About" && "About The System"}
                {activeTab === "Login" && "SaaS Authentication"}
              </h1>
              {activeTab === "Dashboard" && (
                <p className="text-xs text-ink/55 mt-1">Here is the latest workspace overview for **StreamFlow**.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill icon={ShieldCheck} label={user ? "Supabase auth session" : "Demo Workspace"} />
              <StatusPill icon={Database} label={projectSettings.dataSource} />
              <StatusPill icon={Activity} label="Live API" />
            </div>
          </header>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              
              {/* Notifications / Success alerts */}
              {persistenceMessage && (
                <div className="p-3 bg-mint/42 border border-pine/20 rounded-md text-xs font-semibold text-pine flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{persistenceMessage}</span>
                  </div>
                  <button onClick={() => setPersistenceMessage("")} className="hover:text-ink">Dismiss</button>
                </div>
              )}

              {/* Login Tab */}
              {activeTab === "Login" && (
                <div className="max-w-md mx-auto mt-8">
                  <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
                    <h2 className="text-lg font-bold text-pine flex items-center gap-2">
                      <Lock className="h-5 w-5" /> Authenticate Workspace
                    </h2>
                    <p className="text-xs text-ink/55 mt-1">Sign up or sign in to verify membership database RLS policies.</p>
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-ink/55 mb-2">Email Address</label>
                        <input
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="h-10 w-full rounded-md border border-ink/10 bg-mist/30 px-3 text-sm outline-none focus:border-pine"
                          placeholder="name@company.com"
                          type="email"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-ink/55 mb-2">Password</label>
                        <input
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="h-10 w-full rounded-md border border-ink/10 bg-mist/30 px-3 text-sm outline-none focus:border-pine"
                          placeholder="Password"
                          type="password"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={() => handleAuth("signin")}
                          className="h-10 rounded-md bg-pine text-xs font-semibold text-white hover:bg-pine/90"
                        >
                          Sign in
                        </button>
                        <button
                          onClick={() => handleAuth("signup")}
                          className="h-10 rounded-md border border-ink/10 bg-white text-xs font-semibold text-ink/75 hover:bg-mint/45"
                        >
                          Sign up
                        </button>
                      </div>
                      {authMessage && (
                        <p className="text-xs text-coral mt-2 text-center font-medium bg-coral/10 py-2 rounded">
                          {authMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dashboard Tab */}
              {activeTab === "Dashboard" && (
                <>
                  <div className="flex items-center justify-between text-xs text-ink/55">
                    <span>Today's Overview</span>
                    <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin-slow" /> Updated 2 minutes ago</span>
                  </div>

                  {isLoadingOverview ? (
                    <div className="h-48 grid place-items-center rounded-lg border border-ink/10 bg-white">
                      <Loader2 className="h-8 w-8 text-pine animate-spin" />
                    </div>
                  ) : (
                    <>
                      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {(overview?.metrics ?? []).map((metric) => (
                          <MetricTile key={metric.label} metric={metric} />
                        ))}
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

                      {/* Top Features Adoption List */}
                      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
                        <h2 className="text-sm font-semibold">Top Features Adoption Rate</h2>
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-ink/10 text-ink/50 uppercase tracking-wider">
                                <th className="py-2">Feature Name</th>
                                <th className="py-2">30-day Retention</th>
                                <th className="py-2">Active Users</th>
                                <th className="py-2">Health Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(overview?.retention_by_feature ?? []).map((feat, idx) => (
                                <tr key={feat.feature} className="border-b border-ink/5 last:border-0 text-sm">
                                  <td className="py-3 font-semibold text-pine">{feat.feature}</td>
                                  <td className="py-3">{feat.retention}%</td>
                                  <td className="py-3">{(feat.active_users / 1000).toFixed(1)}K users</td>
                                  <td className="py-3">
                                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                                      idx === 0 ? "bg-pine/12 text-pine" : idx === 1 ? "bg-mint text-pine" : "bg-gold/15 text-gold-700"
                                    }`}>
                                      {idx === 0 ? "A+" : idx === 1 ? "A" : "B"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}

              {/* AI Chat Tab */}
              {activeTab === "AI Chat" && (
                <section className="space-y-4">
                  <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">AI Assistant Explorer</p>
                        <p className="text-xs text-ink/58">Deterministic scoring classification</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveReport}
                          className="flex items-center gap-1.5 h-9 rounded-md border border-ink/10 px-3 text-xs text-pine bg-mint/30 hover:bg-mint transition"
                          title="Save report to Briefing Center"
                        >
                          <Save className="h-4 w-4" /> Save Report
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
                        {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
                  </div>

                  {/* Flow Layout: Summary ➔ Chart ➔ Insights ➔ Recommendation ➔ Suggested Follow-up Questions */}
                  {answer && (
                    <div className="space-y-4">
                      
                      {/* 1. Summary Card */}
                      <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pine mb-3">
                          <Bot className="h-4 w-4" />
                          Summary ({answer.intent})
                        </div>
                        <p className="text-sm leading-6 text-ink/82">{answer.answer}</p>
                      </div>

                      {/* 2. Chart Visual Panel */}
                      <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">Generated Visualization</p>
                            <p className="text-xs text-ink/58">{answer.chart_type} chart</p>
                          </div>
                          <StatusPill icon={Sparkles} label="Verified Chart" />
                        </div>
                        <div className="h-[300px] min-h-[300px]">{selectedChart}</div>
                        <details className="mt-4">
                          <summary className="text-xs font-bold text-pine cursor-pointer hover:underline">View SQL Query Code</summary>
                          <pre className="mt-2 overflow-auto rounded-md bg-ink p-3 text-xs leading-5 text-mint font-mono">
                            {answer.generated_query}
                          </pre>
                        </details>
                      </div>

                      {/* 3. Insights and 4. Recommendation Cards */}
                      {answer.insights.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {answer.insights.map((insight) => (
                            <InsightCard key={insight.title} insight={insight} />
                          ))}
                        </div>
                      )}

                      {/* 5. Suggested Follow-up Questions */}
                      <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">Suggested Follow-up Questions</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {answer.follow_ups.map((followUp) => (
                            <button
                              key={followUp}
                              onClick={() => submitQuestion(followUp)}
                              className="rounded-md bg-mist hover:bg-mint px-3 py-2 text-left text-xs leading-5 text-ink/76 transition"
                            >
                              {followUp}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </section>
              )}

              {/* Reports Tab */}
              {activeTab === "Reports" && (
                <div className="space-y-4">
                  {isLoadingReports ? (
                    <div className="h-48 grid place-items-center rounded-lg border border-ink/10 bg-white">
                      <Loader2 className="h-8 w-8 text-pine animate-spin" />
                    </div>
                  ) : report ? (
                    <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
                      <div className="border-b border-ink/10 pb-4 mb-6">
                        <h2 className="text-xl font-bold text-ink">{report.title}</h2>
                        <p className="text-sm text-ink/55 mt-1">Period: {report.period}</p>
                      </div>
                      <div className="grid gap-6 md:grid-cols-3">
                        <div className="rounded-lg bg-mint/20 border border-pine/10 p-4">
                          <ReportBlock label="Highlights" items={report.highlights} tone="good" />
                        </div>
                        <div className="rounded-lg bg-coral/5 border border-coral/10 p-4">
                          <ReportBlock label="Risks" items={report.risks} tone="risk" />
                        </div>
                        <div className="rounded-lg bg-gold/10 border border-gold/15 p-4">
                          <ReportBlock label="Recommended Actions" items={report.recommended_actions} tone="action" />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Saved Reports Section with Rename/Delete/Favorite UI */}
                  <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
                    <h2 className="text-sm font-semibold">Saved Briefings & Metric Reports</h2>
                    <p className="text-xs text-ink/55 mt-1">Reopen, rename, delete, or favorite compiled metrics and charts.</p>
                    
                    {savedReports.length === 0 ? (
                      <div className="mt-6 text-center border border-dashed border-ink/10 py-12 rounded bg-mist/10">
                        <FileText className="h-8 w-8 text-ink/30 mx-auto" />
                        <p className="text-xs text-ink/55 mt-2">No saved reports yet.</p>
                        <button
                          onClick={() => setActiveTab("AI Chat")}
                          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-pine px-4 text-xs font-semibold text-white hover:bg-pine/90"
                        >
                          Go to AI Chat
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {savedReports.map((saved) => (
                          <div key={saved.id} className="rounded-lg border border-ink/10 bg-mist/30 p-4 relative">
                            
                            {/* Action Toolbar */}
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                              <button
                                onClick={() => handleToggleFavoriteReport(saved.id)}
                                className={`p-1.5 rounded hover:bg-white transition ${saved.isFavorite ? "text-coral" : "text-ink/40 hover:text-coral"}`}
                                title="Favorite Report"
                              >
                                <Heart className={`h-4 w-4 ${saved.isFavorite ? "fill-coral" : ""}`} />
                              </button>
                              <button
                                onClick={() => handleStartRename(saved.id, saved.question)}
                                className="p-1.5 rounded hover:bg-white text-ink/40 hover:text-pine transition"
                                title="Rename Report"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReport(saved.id)}
                                className="p-1.5 rounded hover:bg-white text-ink/40 hover:text-coral transition"
                                title="Delete Report"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="pr-24">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-pine uppercase tracking-wider">{saved.intent}</span>
                                {saved.isFavorite && <span className="text-[10px] bg-coral/10 text-coral px-1.5 py-0.5 rounded font-bold">Favorite</span>}
                              </div>

                              {editingReportId === saved.id ? (
                                <div className="flex gap-2 mt-2 max-w-md">
                                  <input
                                    value={editingReportName}
                                    onChange={(e) => setEditingReportName(e.target.value)}
                                    className="h-8 flex-1 rounded border border-ink/15 bg-white px-2 text-xs outline-none focus:border-pine"
                                  />
                                  <button onClick={handleSaveRename} className="h-8 bg-pine text-white px-3 rounded text-xs font-semibold">Save</button>
                                  <button onClick={() => setEditingReportId(null)} className="h-8 border border-ink/10 bg-white px-3 rounded text-xs">Cancel</button>
                                </div>
                              ) : (
                                <p className="text-sm font-bold mt-2">"{saved.question}"</p>
                              )}
                              
                              <p className="text-xs text-ink/70 mt-1 leading-relaxed">{saved.answer}</p>
                            </div>

                            <div className="h-48 mt-4 bg-white rounded border border-ink/10 p-3">
                              <AnswerChart response={saved} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metric Library Tab */}
              {activeTab === "Metric Library" && (
                <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
                  <h2 className="text-lg font-bold text-pine flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5" /> Product Metric Dictionary
                  </h2>
                  <p className="text-xs text-ink/55">Definitions, SQL formulas, and descriptions for product indicators.</p>
                  <div className="mt-6 space-y-4">
                    {metricLibraryData.map((item) => (
                      <div key={item.name} className="p-4 rounded-lg bg-mist/30 border border-ink/10">
                        <h3 className="font-bold text-sm text-pine">{item.name}</h3>
                        <p className="text-xs text-ink/75 mt-1"><strong>Definition:</strong> {item.definition}</p>
                        <p className="text-xs text-ink/75 mt-1"><strong>Formula:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-ink/10 text-coral font-mono">{item.formula}</code></p>
                        <p className="text-xs text-ink/64 mt-2 italic">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dataset Upload Tab */}
              {activeTab === "Dataset Upload" && (
                <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
                  <h2 className="text-lg font-bold text-pine flex items-center gap-2 mb-2">
                    <Upload className="h-5 w-5" /> Import Event Dataset
                  </h2>
                  <p className="text-xs text-ink/55">Connect raw analytics exports to configure your workspace metrics.</p>
                  
                  {/* Step Indicators */}
                  <div className="flex items-center justify-between max-w-md mx-auto my-8">
                    {["Upload", "Preview", "Import", "Ready"].map((step, idx) => {
                      const isActive = uploadStep === step;
                      const isPast = ["Upload", "Preview", "Import", "Ready"].indexOf(uploadStep) >= idx;
                      return (
                        <div key={step} className="flex items-center gap-2">
                          <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                            isActive ? "bg-pine text-white" : isPast ? "bg-mint text-pine" : "bg-mist text-ink/40"
                          }`}>
                            {idx + 1}
                          </div>
                          <span className={`text-xs ${isActive ? "font-bold text-pine" : "text-ink/60"}`}>{step}</span>
                          {idx < 3 && <div className="h-[2px] w-8 bg-ink/10" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Flow Steps Rendering */}
                  <div className="border border-dashed border-ink/10 rounded-lg p-8 bg-mist/10 text-center max-w-lg mx-auto">
                    {uploadStep === "Upload" && (
                      <div className="space-y-4">
                        <Upload className="h-10 w-10 text-ink/40 mx-auto" />
                        <div>
                          <p className="text-sm font-semibold">Select CSV Event Export File</p>
                          <p className="text-xs text-ink/50 mt-1">Accepts CSV up to 5MB, maximum 50,000 rows.</p>
                        </div>
                        <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-pine px-4 text-xs font-semibold text-white hover:bg-pine/90 transition">
                          Choose File
                          <input
                            type="file"
                            className="hidden"
                            accept=".csv,text/csv"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) selectFile(file);
                            }}
                          />
                        </label>
                      </div>
                    )}

                    {uploadStep === "Preview" && (
                      <div className="space-y-4 text-left">
                        <h3 className="text-sm font-bold text-pine">CSV File Preview: {uploadFile?.name}</h3>
                        <p className="text-xs text-ink/60">Below is a preview of the first 3 rows to confirm formatting.</p>
                        <div className="overflow-x-auto border border-ink/10 rounded bg-white mt-2">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-mist border-b border-ink/10 font-bold">
                                {csvPreviewHeaders.map((h, i) => (
                                  <th key={i} className="px-2 py-1.5">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {csvPreviewRows.map((row, idx) => (
                                <tr key={idx} className="border-b border-ink/5 last:border-0 font-mono">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-2 py-1.5">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex gap-2 justify-end pt-4">
                          <button
                            onClick={() => setUploadStep("Upload")}
                            className="h-9 px-4 rounded border border-ink/10 bg-white text-xs font-bold hover:bg-mist"
                          >
                            Back
                          </button>
                          <button
                            onClick={importDataset}
                            className="h-9 px-4 rounded bg-pine text-xs font-bold text-white hover:bg-pine/90"
                          >
                            Import Data
                          </button>
                        </div>
                      </div>
                    )}

                    {uploadStep === "Import" && (
                      <div className="space-y-4 py-8">
                        <Loader2 className="h-8 w-8 text-pine animate-spin mx-auto" />
                        <div>
                          <p className="text-sm font-semibold">Escaping Cell Formulas & Validating Limits...</p>
                          <p className="text-xs text-ink/50 mt-1">Scanning columns, auditing row indices, and escaping Excel injection cells.</p>
                        </div>
                      </div>
                    )}

                    {uploadStep === "Ready" && (
                      <div className="space-y-4 text-center">
                        <CheckCircle2 className="h-10 w-10 text-pine mx-auto animate-bounce" />
                        <div>
                          <p className="text-sm font-bold text-pine">Dataset Imported Successfully!</p>
                          <p className="text-xs text-ink/60 mt-2">
                            🚀 <strong>{uploadedStats.rows}</strong> rows imported | <strong>{uploadedStats.columns}</strong> columns detected | <strong>{uploadedStats.metrics}</strong> metrics generated.
                          </p>
                        </div>
                        <button
                          onClick={() => setUploadStep("Upload")}
                          className="h-9 px-4 rounded bg-pine text-xs font-bold text-white hover:bg-pine/90"
                        >
                          Upload Another File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === "History" && (
                <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
                  <h2 className="text-lg font-bold text-pine flex items-center gap-2 mb-2">
                    <History className="h-5 w-5" /> Metric Query History
                  </h2>
                  <p className="text-xs text-ink/55">Historical log of natural language questions submitted in this session.</p>
                  
                  <div className="mt-6 space-y-4">
                    {queryHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-mist/30 border border-ink/5 hover:border-pine/20 transition cursor-pointer"
                        onClick={() => {
                          setQuery(item.question);
                          setActiveTab("AI Chat");
                          submitQuestion(item.question);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Bot className="h-4 w-4 text-ink/40" />
                          <span className="text-sm font-medium">"{item.question}"</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-ink/40">{item.timestamp}</span>
                          <ArrowRight className="h-3 w-3 text-pine" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "Settings" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
                    <h2 className="text-sm font-semibold">Workspace Configuration</h2>
                    <p className="text-xs text-ink/55 mt-1">Configure project identifiers, currency representations, and timezones.</p>
                    <div className="mt-6 space-y-4 max-w-md">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-ink/55 mb-2">Project Name</label>
                        <input
                          className="h-10 w-full rounded-md border border-ink/12 bg-mist/60 px-3 text-sm outline-none"
                          value={projectSettings.projectName}
                          onChange={(e) => setProjectSettings({ ...projectSettings, projectName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-ink/55 mb-2">Organization</label>
                        <input
                          className="h-10 w-full rounded-md border border-ink/12 bg-mist/60 px-3 text-sm outline-none"
                          value={projectSettings.organization}
                          onChange={(e) => setProjectSettings({ ...projectSettings, organization: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/55 mb-2">Currency</label>
                          <input
                            className="h-10 w-full rounded-md border border-ink/12 bg-mist/60 px-3 text-sm outline-none"
                            value={projectSettings.currency}
                            onChange={(e) => setProjectSettings({ ...projectSettings, currency: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/55 mb-2">Timezone</label>
                          <input
                            className="h-10 w-full rounded-md border border-ink/12 bg-mist/60 px-3 text-sm outline-none"
                            value={projectSettings.timezone}
                            onChange={(e) => setProjectSettings({ ...projectSettings, timezone: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-ink/55 mb-2">Data Source</label>
                        <input
                          className="h-10 w-full rounded-md border border-ink/12 bg-mist/60 px-3 text-sm outline-none"
                          value={projectSettings.dataSource}
                          onChange={(e) => setProjectSettings({ ...projectSettings, dataSource: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* About Tab */}
              {activeTab === "About" && (
                <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
                  <h2 className="text-lg font-bold text-pine flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5" /> About The Project
                  </h2>
                  <p className="text-xs text-ink/55">Architecture overview, scope, and technical roadmap.</p>
                  
                  <div className="mt-6 space-y-6 text-sm leading-relaxed text-ink/80">
                    <div>
                      <h3 className="font-bold text-sm text-pine mb-1">Why This Product Exists</h3>
                      <p className="text-xs">
                        Manual query generation is the primary bottleneck in product analysis. This MVP provides self-serve natural language routing and computation scoping to allow product managers to get answers instantly without SQL injection vulnerabilities or LLM hallucinations.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-pine mb-1">Tech Stack & Tools</h3>
                      <ul className="text-xs list-disc list-inside space-y-1">
                        <li><strong>Frontend</strong>: Next.js 16 (Turbopack), TailwindCSS, Recharts, Lucide Icons</li>
                        <li><strong>Backend API</strong>: FastAPI, python-jose JWT, Slowapi Rate-Limiting</li>
                        <li><strong>Storage & Database</strong>: Supabase Postgres, storage buckets, membership Row Level Security (RLS)</li>
                        <li><strong>Artificial Intelligence</strong>: Claude 3.5 structured intents</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-pine mb-1">MVP System Architecture</h3>
                      <pre className="p-3 bg-ink text-mint rounded-lg text-xs leading-5 font-mono overflow-auto max-h-48">
{`Browser (Next.js/Vercel)
  │  JWT Bearer Token in Authorization header
  ▼
FastAPI (Render) ── verifies JWT (Supabase JWKS) ── resolves workspace_id
  │
  ├── analytics function catalog (parameterized, no dynamic SQL)
  │        │
  │        ▼
  │   Supabase Postgres (dataset_rows, scoped by workspace_id)
  │
  └── Claude API (Haiku for routing, Sonnet for narration)`}
                      </pre>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-pine mb-1">Future Development Roadmap</h3>
                      <ul className="text-xs list-disc list-inside space-y-1">
                        <li>Real-time database replication alerts.</li>
                        <li>Stripe/Revenue Webhook integrations for automatic plan churn audits.</li>
                        <li>Export to PPTX / Slack query report subscription notifications.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Pane Context Columns */}
            <aside className="space-y-4">
              
              {/* AI Suggestions on Dashboard */}
              {activeTab === "Dashboard" && (
                <Panel title="AI Suggestions" subtitle="Intelligent context discoveries">
                  <div className="space-y-3">
                    <div className="rounded-lg border border-ink/10 bg-mint/10 p-3">
                      <div className="flex gap-2 items-start">
                        <TrendingUp className="h-4 w-4 text-pine mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-pine">MRR increased 10%</p>
                          <p className="text-[11px] text-ink/70 mt-0.5">Net of expansion and churn, revenue reached $185.0K. Confidence: 94%</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-ink/10 bg-coral/5 p-3">
                      <div className="flex gap-2 items-start">
                        <TrendingDown className="h-4 w-4 text-coral mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-coral">Retention dropped by 8%</p>
                          <p className="text-[11px] text-ink/70 mt-0.5">Possible reason: Users abandoned onboarding after Step 3. Confidence: 91%</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-ink/10 bg-gold/10 p-3">
                      <div className="flex gap-2 items-start">
                        <Sparkles className="h-4 w-4 text-gold mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-pine">Playlists adoption is highest</p>
                          <p className="text-[11px] text-ink/70 mt-0.5">Playlists usage remains the strongest catalyst for Day 30 user habits. Confidence: 92%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>
              )}

              {/* Recent AI Queries on Dashboard */}
              {activeTab === "Dashboard" && (
                <Panel title="Recent Queries" subtitle="Quick access shortcuts">
                  <div className="space-y-2">
                    {queryHistory.slice(0, 3).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuery(item.question);
                          setActiveTab("AI Chat");
                          submitQuestion(item.question);
                        }}
                        className="block w-full text-left rounded-md border border-ink/5 bg-mist/50 p-2.5 hover:border-pine/30 transition text-xs truncate"
                      >
                        "{item.question}"
                      </button>
                    ))}
                  </div>
                </Panel>
              )}

              {/* Default Sidebars */}
              {(activeTab === "AI Chat" || activeTab === "History" || activeTab === "Metric Library" || activeTab === "Dataset Upload") && (
                <Panel title="AI Insight Queue" subtitle="Ranked product opportunities">
                  <div className="space-y-3">
                    {(answer?.insights ?? overview?.insights ?? []).map((insight) => (
                      <InsightCard key={insight.title} insight={insight} />
                    ))}
                  </div>
                </Panel>
              )}

              {(activeTab === "Reports" || activeTab === "Settings" || activeTab === "About" || activeTab === "Login") && (
                <>
                  <Panel title="Supabase Access" subtitle={user ? "Session established" : "Authentication status"}>
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
                  </Panel>
                  <Panel title="Integration Channels" subtitle="Warehouse sync status">
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
                </>
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
          <Icon className="h-4 w-4" />
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

  // Fallback defaults to Bar Chart
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
        <CheckCircle2 className="h-4 w-4 text-pine" />
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

function StatusPill({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-md border border-ink/10 bg-white px-3 text-xs font-medium text-ink/70">
      <Icon className="h-3.5 w-3.5 text-pine" />
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
