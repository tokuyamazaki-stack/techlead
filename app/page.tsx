"use client";

import { useState, useMemo, useEffect } from "react";
import type { Company, Tab, TagConfig, CallList, UserSettings, GoalConfig } from "./lib/types";
import { RESULT_CONFIG, DEFAULT_TAGS, DEFAULT_GOALS } from "./lib/types";
import ImportModal from "./components/ImportModal";
import ResultModal from "./components/ResultModal";
import SettingsModal from "./components/SettingsModal";
import ProgressTab from "./components/ProgressTab";
import StrategyTab from "./components/StrategyTab";
import FollowTab from "./components/FollowTab";
import AuthModal from "./components/AuthModal";
import WorkspaceSetup from "./components/WorkspaceSetup";
import { DEMO_LISTS, DEMO_USER, DEMO_GOALS } from "./lib/demoData";
import type { ReportFormField } from "./lib/types";
import { supabase } from "./lib/supabase";
import * as db from "./lib/db";
import type { Workspace, WorkspaceMember, ActiveCallInfo, WorkingHoursRecord } from "./lib/db";
import type { User } from "@supabase/supabase-js";

// フォームURLのIDをキーに、既知の項目マッピングを定義
const KNOWN_FORM_CONFIGS: Record<string, ReportFormField[]> = {
  "1FAIpQLSegAjKpn-PTVwRyRA6FfdflVNKdD0TNxi5ledYAonwlA9dHUw": [
    { entryId: "entry.1181361572", dataType: "assignee" },
    { entryId: "entry.637469353",  dataType: "date" },
    { entryId: "entry.349857007",  dataType: "totalCalls" },
    { entryId: "entry.235601849",  dataType: "material" },
    { entryId: "entry.1279150079", dataType: "appo" },
  ],
};

const DEFAULT_USER: UserSettings = { name: "", calendarUrl: "", reportFormUrl: "", phone: "", email: "" };

// メンバーごとの色パレット（自分=緑、他メンバー用）
const MEMBER_ROW_COLORS = [
  { border: "border-l-blue-400",   bg: "bg-blue-50/60",   badge: "bg-blue-100 text-blue-700" },
  { border: "border-l-amber-400",  bg: "bg-amber-50/60",  badge: "bg-amber-100 text-amber-700" },
  { border: "border-l-pink-400",   bg: "bg-pink-50/60",   badge: "bg-pink-100 text-pink-700" },
  { border: "border-l-cyan-400",   bg: "bg-cyan-50/60",   badge: "bg-cyan-100 text-cyan-700" },
  { border: "border-l-orange-400", bg: "bg-orange-50/60", badge: "bg-orange-100 text-orange-700" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function applyKnownFormConfig(user: UserSettings): UserSettings {
  if (!user.reportFormUrl) return user;
  if (user.reportFormFields && user.reportFormFields.length > 0) return user;
  const formId = user.reportFormUrl.match(/\/e\/([^/]+)\//)?.[1];
  if (formId && KNOWN_FORM_CONFIGS[formId]) {
    return { ...user, reportFormFields: KNOWN_FORM_CONFIGS[formId] };
  }
  return user;
}

// ── サイドバーのナビアイテム ──
const NAV_ITEMS: { id: Tab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  {
    id: "list",
    label: "コールリスト",
    shortLabel: "リスト",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="9" x2="9" y2="21" />
      </svg>
    ),
  },
  {
    id: "follow",
    label: "フォロー",
    shortLabel: "フォロー",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: "progress",
    label: "進捗",
    shortLabel: "進捗",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: "strategy",
    label: "AI戦略",
    shortLabel: "AI",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const [lists, setLists] = useState<CallList[]>([]);
  const [tagConfig, setTagConfig] = useState<TagConfig>(DEFAULT_TAGS);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER);
  const [goalConfig, setGoalConfig] = useState<GoalConfig>(DEFAULT_GOALS);
  const [tab, setTab] = useState<Tab>("list");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [appendingToListId, setAppendingToListId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState<string>("すべて");
  const [filterBarOpen, setFilterBarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeCalls, setActiveCalls] = useState<ActiveCallInfo[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHoursRecord[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 認証状態の監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ログイン後にワークスペースを確認してからデータを読み込む
  useEffect(() => {
    if (!user) return;
    initWorkspace(user.id);
  }, [user]);

  // リアルタイム同期（他のメンバーの操作を自動反映）
  useEffect(() => {
    if (!workspace || !user) return;

    // 架電状況の初期取得
    db.getActiveCalls(workspace.id).then(setActiveCalls);

    const channel = supabase
      .channel(`workspace-${workspace.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "call_records" }, async () => {
        const updated = await db.loadAllLists(workspace.id);
        if (updated.length > 0) setLists(updated);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "companies" }, async () => {
        const updated = await db.loadAllLists(workspace.id);
        if (updated.length > 0) setLists(updated);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "call_lists" }, async () => {
        const updated = await db.loadAllLists(workspace.id);
        if (updated.length > 0) setLists(updated);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "active_calls" }, async () => {
        const updated = await db.getActiveCalls(workspace.id);
        setActiveCalls(updated);
      })
      .subscribe((status, err) => {
        console.log("[Realtime] status:", status, err ?? "");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id]);

  async function initWorkspace(userId: string) {
    setLoading(true);
    const ws = await db.getMyWorkspace(userId);
    if (ws) {
      setWorkspace(ws);
      await loadData(userId, ws.id);
    } else {
      setLoading(false);
    }
  }

  async function handleWorkspaceReady(ws: Workspace) {
    if (!user) return;
    setWorkspace(ws);
    await loadData(user.id, ws.id);
  }

  async function loadData(userId: string, workspaceId: string) {
    setLoading(true);
    const now = new Date();
    const thisMonth = now.toISOString().substring(0, 7);
    const monthStart = `${thisMonth}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthEnd = `${thisMonth}-${String(lastDay).padStart(2, "0")}`;
    const [loadedLists, loadedSettings, loadedTags, loadedGoals, loadedMembers, loadedHours] = await Promise.all([
      db.loadAllLists(workspaceId),
      db.loadUserSettings(userId),
      db.loadTagConfig(userId),
      db.loadGoalConfig(userId),
      db.getWorkspaceMembers(workspaceId),
      db.getWorkingHours(workspaceId, monthStart, monthEnd),
    ]);

    setMembers(loadedMembers);
    setWorkingHours(loadedHours);

    if (loadedLists.length === 0) {
      for (const list of DEMO_LISTS) {
        await db.saveList(userId, workspaceId, list);
      }
      setLists(DEMO_LISTS);
      setSelectedListId(DEMO_LISTS[0].id);
    } else {
      setLists(loadedLists);
      setSelectedListId(loadedLists[0].id);
    }

    if (loadedSettings) {
      const migrated = applyKnownFormConfig(loadedSettings);
      setUserSettings(migrated);
      if (!loadedSettings.name) setTimeout(() => setShowSettings(true), 300);
    } else {
      await db.saveUserSettings(userId, DEMO_USER);
      setUserSettings(DEMO_USER);
      setTimeout(() => setShowSettings(true), 300);
    }

    setTagConfig(loadedTags ?? DEFAULT_TAGS);
    setGoalConfig(loadedGoals ?? DEMO_GOALS);
    setLoading(false);
  }

  async function handleSaveLists(next: CallList[]) {
    setLists(next);
  }

  async function handleUpdateTags(next: TagConfig) {
    setTagConfig(next);
    if (user) await db.saveTagConfig(user.id, next);
  }

  async function handleSaveUserSettings(next: UserSettings) {
    setUserSettings(next);
    if (user) await db.saveUserSettings(user.id, next);
  }

  async function handleUpdateGoals(next: GoalConfig) {
    setGoalConfig(next);
    if (user) await db.saveGoalConfig(user.id, next);
  }

  async function resetToDemo() {
    if (!user || !workspace) return;
    for (const list of DEMO_LISTS) {
      await db.saveList(user.id, workspace.id, list);
    }
    await db.saveUserSettings(user.id, DEMO_USER);
    await db.saveTagConfig(user.id, DEFAULT_TAGS);
    await db.saveGoalConfig(user.id, DEMO_GOALS);
    setLists(DEMO_LISTS);
    setUserSettings(DEMO_USER);
    setTagConfig(DEFAULT_TAGS);
    setGoalConfig(DEMO_GOALS);
    setSelectedListId(DEMO_LISTS[0].id);
    setSelectedIndex(null);
    setSearch("");
    setFilterResult("すべて");
  }

  async function handleImport(meta: Omit<CallList, "id" | "companies" | "createdAt">, companies: Company[]) {
    const newList: CallList = {
      id: `list-${Date.now()}`,
      ...meta,
      companies,
      createdAt: new Date().toISOString(),
    };
    const next = [...lists, newList];
    setLists(next);
    setSelectedListId(newList.id);
    setShowImport(false);
    if (user && workspace) await db.saveList(user.id, workspace.id, newList);
  }

  async function handleAppend(companies: Company[]) {
    if (!appendingToListId) return;
    const next = lists.map((l) =>
      l.id === appendingToListId ? { ...l, companies: [...l.companies, ...companies] } : l
    );
    setLists(next);
    setAppendingToListId(null);
    if (user) {
      const updatedList = next.find((l) => l.id === appendingToListId);
      if (updatedList) {
        for (const c of companies) {
          await db.saveCompany(user.id, appendingToListId, c);
        }
      }
    }
  }

  async function handleSaveResult(updated: Company) {
    const next = lists.map((l) => ({
      ...l,
      companies: l.companies.map((c) => (c.id === updated.id ? updated : c)),
    }));
    setLists(next);
    setSelectedIndex(null);
    if (user) {
      const listId = lists.find((l) => l.companies.some((c) => c.id === updated.id))?.id;
      if (listId) await db.saveCompany(user.id, listId, updated);
    }
  }

  async function handleDeleteList(id: string) {
    if (!confirm("このリストを削除しますか？")) return;
    const next = lists.filter((l) => l.id !== id);
    setLists(next);
    setSelectedListId(next.length > 0 ? next[0].id : null);
    await db.deleteList(id);
  }

  function startEditListName(list: CallList) {
    setEditingListId(list.id);
    setEditingName(list.name);
  }

  async function saveListName(id: string) {
    if (!editingName.trim()) return;
    const next = lists.map((l) => l.id === id ? { ...l, name: editingName.trim() } : l);
    setLists(next);
    setEditingListId(null);
    await db.updateListName(id, editingName.trim());
  }

  async function handleLogHours(hours: number) {
    if (!user || !workspace) return;
    const today = todayStr();
    await db.logWorkingHours(workspace.id, user.id, userSettings.name || user.email || "", today, hours);
    const thisMonth = today.substring(0, 7);
    const now2 = new Date();
    const lastDay2 = new Date(now2.getFullYear(), now2.getMonth() + 1, 0).getDate();
    const updated = await db.getWorkingHours(workspace.id, `${thisMonth}-01`, `${thisMonth}-${String(lastDay2).padStart(2, "0")}`);
    setWorkingHours(updated);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setLists([]);
    setUserSettings(DEFAULT_USER);
  }

  // 自分以外のメンバーに安定した色インデックスを割り当て
  const memberColorMap = useMemo(() => {
    const others = members.filter((m) => m.userId !== user?.id);
    return new Map(others.map((m, i) => [m.userId, i % MEMBER_ROW_COLORS.length]));
  }, [members, user?.id]);

  const today = todayStr();
  const currentList = lists.find((l) => l.id === selectedListId) ?? null;
  const allCompanies = lists.flatMap((l) => l.companies);

  const FILTER_OPTIONS = ["すべて", "未コール", "本日ネクスト", "アポ獲得", "資料送付", "再コール", "担当者不在", "担当NG", "受付NG"];

  // 全担当者一覧（現在のリスト）
  const assigneeOptions = useMemo(() => {
    const names = new Set<string>();
    (currentList?.companies ?? []).forEach(c => { if (c.assignee) names.add(c.assignee); });
    return [...names].sort();
  }, [currentList]);

  const [filterAssignee, setFilterAssignee] = useState<string>("すべて");

  // 2文字以上で全リスト横断検索、それ以外は現在のリスト内フィルター
  type FilteredCompany = Company & { _listName?: string };
  const isGlobalSearch = search.trim().length >= 2;

  const filtered = useMemo((): FilteredCompany[] => {
    const q = search.trim();
    const source: FilteredCompany[] = isGlobalSearch
      ? lists.flatMap(l => l.companies.map(c => ({ ...c, _listName: l.name })))
      : (currentList?.companies ?? []).map(c => ({ ...c }));

    return source
      .filter((c) => {
        const matchFilter =
          filterResult === "すべて" ||
          (filterResult === "未コール" && !c.latestResult) ||
          (filterResult === "本日ネクスト" && c.nextDate === today) ||
          c.latestResult === filterResult;
        const matchAssignee =
          filterAssignee === "すべて" || c.assignee === filterAssignee;
        const matchSearch =
          !q ||
          c.company.includes(q) ||
          (c.industry || "").includes(q) ||
          (c.phone || "").includes(q) ||
          (c.contactName || "").includes(q) ||
          (c.assignee || "").includes(q);
        return matchFilter && matchAssignee && matchSearch;
      })
      .sort((a, b) => {
        const aToday = a.nextDate === today ? -1 : 0;
        const bToday = b.nextDate === today ? -1 : 0;
        return aToday - bToday;
      });
  }, [lists, currentList, filterResult, filterAssignee, search, today, isGlobalSearch]);

  const selected = selectedIndex !== null ? filtered[selectedIndex] ?? null : null;

  const todayCallCount = allCompanies.flatMap((c) =>
    c.callHistory.filter((h) => h.date === today)
  ).length;
  const todayNextCount = currentList?.companies.filter((c) => c.nextDate === today).length ?? 0;
  const appoCount = currentList?.companies.filter((c) => c.latestResult === "アポ獲得").length ?? 0;

  const followCount = allCompanies.filter((c) =>
    c.latestResult && ["資料送付", "再コール", "担当者不在"].includes(c.latestResult) &&
    (!c.nextDate || c.nextDate <= today)
  ).length;

  // 認証チェック中
  if (!authChecked) return null;

  // 未ログイン
  if (!user) return <AuthModal onAuth={() => {}} />;

  // ワークスペース未設定
  if (!workspace) return <WorkspaceSetup userId={user.id} onReady={handleWorkspaceReady} />;

  // データ読み込み中
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white mx-auto mb-5 shadow-lg shadow-violet-500/30">
            TL
          </div>
          <p className="text-slate-400 text-sm tracking-wide">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* ── デスクトップレイアウト ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── ダークサイドバー（デスクトップのみ） ── */}
        <aside className={`hidden md:flex flex-col bg-slate-900 shrink-0 sticky top-0 h-screen z-40 transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.35)] ${sidebarCollapsed ? "w-16" : "w-60"}`}>
          {/* ロゴ + トグルボタン */}
          <div className={`px-3 py-5 border-b border-slate-800 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-500/40 shrink-0">
                  TL
                </div>
                <div>
                  <div className="text-white font-bold text-base tracking-tight leading-none">TechLead</div>
                  <div className="text-slate-500 text-[10px] mt-0.5 tracking-wide">Inside Sales</div>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-500/40">
                TL
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`text-slate-500 hover:text-white transition-all p-1.5 rounded-lg hover:bg-slate-800 ${sidebarCollapsed ? "mt-3 mx-auto" : ""}`}
              title={sidebarCollapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {sidebarCollapsed
                  ? <path d="M9 18l6-6-6-6" />
                  : <path d="M15 18l-6-6 6-6" />}
              </svg>
            </button>
          </div>

          {/* ナビゲーション */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = tab === item.id;
              const badge = item.id === "follow" && followCount > 0 ? followCount : null;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                    sidebarCollapsed ? "justify-center" : ""
                  } ${
                    isActive
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className={`shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-violet-400"}`}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                  {!sidebarCollapsed && badge && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-violet-500/20 text-violet-400"
                    }`}>
                      {badge}
                    </span>
                  )}
                  {sidebarCollapsed && badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-violet-400" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* ユーザー + アクション */}
          <div className="px-2 py-4 border-t border-slate-800 space-y-2">
            <button
              onClick={() => setShowImport(true)}
              title={sidebarCollapsed ? "リストを取込" : undefined}
              className={`w-full flex items-center gap-2 px-3 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-violet-600/30 ${sidebarCollapsed ? "justify-center" : "justify-center"}`}
            >
              <span className="text-base leading-none">＋</span>
              {!sidebarCollapsed && <span>リストを取込</span>}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              title={sidebarCollapsed ? (userSettings.name || "設定") : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
            >
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                {userSettings.name ? userSettings.name[0] : "?"}
              </span>
              {!sidebarCollapsed && (
                <>
                  <span className="text-slate-300 text-xs truncate flex-1 text-left">
                    {userSettings.name || "名前を設定"}
                  </span>
                  <svg className="w-4 h-4 text-slate-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </>
              )}
            </button>
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-slate-600 hover:text-slate-400 text-xs rounded-lg hover:bg-slate-800/50 transition-all"
              >
                ログアウト
              </button>
            )}
          </div>
        </aside>

        {/* ── モバイルヘッダー（md未満のみ） ── */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-500/30">
              TL
            </div>
            <span className="text-white font-bold text-base tracking-tight">TechLead</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shadow"
            >
              {userSettings.name ? userSettings.name[0] : "?"}
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-all"
            >
              ＋ 取込
            </button>
          </div>
        </div>

        {/* ── メインコンテンツエリア ── */}
        <main className="flex-1 overflow-y-auto">
          {/* モバイルヘッダー分の余白 */}
          <div className="md:hidden h-14" />

          <div className="px-4 md:px-8 py-5 md:py-7 max-w-6xl mx-auto">
            {tab === "list" && (
              <>
                {/* チーム架電状況（リアルタイム） */}
                {members.length > 1 && (
                  <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-sm font-semibold text-slate-800">チーム架電状況</span>
                      <span className="text-[11px] text-slate-400 ml-1 bg-slate-100 px-2 py-0.5 rounded-full">リアルタイム</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] text-slate-400 border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left px-5 py-2.5 font-semibold tracking-wide">担当者</th>
                            <th className="text-left px-4 py-2.5 font-semibold tracking-wide">状態</th>
                            <th className="text-left px-4 py-2.5 font-semibold tracking-wide">コール先</th>
                            <th className="text-left px-5 py-2.5 font-semibold tracking-wide">開始時刻</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((m) => {
                            const active = activeCalls.find((a) => a.userId === m.userId);
                            return (
                              <tr key={m.userId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-3.5 text-xs font-medium text-slate-700">{m.name || m.email}</td>
                                <td className="px-4 py-3.5">
                                  {active ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      コール中
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">待機中</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-xs text-slate-600">
                                  {active ? active.companyName : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                                  {active
                                    ? new Date(active.startedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
                                    : <span className="text-slate-300">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {lists.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 py-32 text-center bg-white shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="9" x2="9" y2="21" />
                      </svg>
                    </div>
                    <p className="text-slate-600 text-base font-semibold mb-1">リストがありません</p>
                    <p className="text-slate-400 text-sm mb-6">「リストを取込」ボタンでSansanから企業を追加してください</p>
                    <button onClick={() => setShowImport(true)}
                      className="px-7 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-violet-500/20">
                      ＋ リストを取込
                    </button>
                  </div>
                ) : (
                  <>
                    {/* リスト一覧 */}
                    <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                      {lists.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => { setSelectedListId(l.id); setFilterResult("すべて"); setSearch(""); }}
                          className={`flex-shrink-0 rounded-2xl px-5 py-4 min-w-[152px] text-left transition-all border group relative cursor-pointer ${
                            selectedListId === l.id
                              ? "bg-gradient-to-br from-violet-600 to-indigo-600 border-transparent shadow-lg shadow-violet-500/25 text-white"
                              : "bg-white border-slate-200 hover:border-violet-300 hover:shadow-md shadow-sm"
                          }`}
                        >
                          {editingListId === l.id ? (
                            <input
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => saveListName(l.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveListName(l.id);
                                if (e.key === "Escape") setEditingListId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-transparent border-b border-white/60 text-base font-bold text-white focus:outline-none w-32 mb-1"
                            />
                          ) : (
                            <>
                              <div
                                className={`text-sm font-bold mb-2 pr-10 leading-tight ${selectedListId === l.id ? "text-white" : "text-slate-800"}`}
                                onDoubleClick={(e) => { e.stopPropagation(); startEditListName(l); }}
                                title="ダブルクリックで名前を編集"
                              >
                                {l.industry || l.name}
                              </div>
                              <div className="space-y-0.5">
                                {(l.fiscalMonthFrom || l.fiscalMonthTo) && (
                                  <div className={`text-[11px] ${selectedListId === l.id ? "text-violet-200" : "text-slate-400"}`}>
                                    決算 {l.fiscalMonthFrom ? `${l.fiscalMonthFrom}月` : "—"}〜{l.fiscalMonthTo ? `${l.fiscalMonthTo}月` : "—"}
                                  </div>
                                )}
                                {(l.revenueFrom || l.revenueTo) && (
                                  <div className={`text-[11px] ${selectedListId === l.id ? "text-violet-200" : "text-slate-400"}`}>
                                    売上 {l.revenueFrom || "—"}〜{l.revenueTo || "—"}
                                  </div>
                                )}
                                {l.industry && l.name !== l.industry && (
                                  <div className={`text-[10px] ${selectedListId === l.id ? "text-violet-300" : "text-slate-300"}`}>{l.name}</div>
                                )}
                                <div className={`text-xs font-semibold pt-1 ${selectedListId === l.id ? "text-white" : "text-slate-500"}`}>
                                  {l.companies.length}<span className={`font-normal ml-0.5 ${selectedListId === l.id ? "text-violet-200" : "text-slate-400"}`}>件</span>
                                </div>
                              </div>
                            </>
                          )}
                          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                            <span onClick={(e) => { e.stopPropagation(); startEditListName(l); }}
                              className={`text-xs px-1 cursor-pointer transition-colors ${selectedListId === l.id ? "text-violet-200 hover:text-white" : "text-slate-300 hover:text-violet-500"}`} title="名前を編集">✎</span>
                            <span onClick={(e) => { e.stopPropagation(); handleDeleteList(l.id); }}
                              className={`text-xs px-1 cursor-pointer transition-colors ${selectedListId === l.id ? "text-violet-200 hover:text-red-300" : "text-slate-300 hover:text-red-500"}`} title="削除">✕</span>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowImport(true)}
                        className="flex-shrink-0 rounded-2xl px-5 py-4 border border-dashed border-slate-300 hover:border-violet-400 text-slate-400 hover:text-violet-500 transition-all text-sm bg-white shadow-sm hover:shadow-md"
                      >
                        ＋ 追加
                      </button>
                    </div>

                    {currentList && (
                      <>
                        {/* ── Stats Cards ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                          {[
                            {
                              label: "総件数",
                              value: currentList.companies.length,
                              highlight: false,
                              icon: (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="9" x2="9" y2="21" />
                                </svg>
                              ),
                              gradient: "from-slate-700 to-slate-800",
                              iconBg: "bg-white/10",
                              textColor: "text-white",
                              subColor: "text-slate-300",
                            },
                            {
                              label: "本日ネクスト",
                              value: todayNextCount,
                              highlight: todayNextCount > 0,
                              icon: (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                              ),
                              gradient: todayNextCount > 0 ? "from-violet-600 to-indigo-600" : "from-slate-100 to-slate-100",
                              iconBg: todayNextCount > 0 ? "bg-white/15" : "bg-slate-200",
                              textColor: todayNextCount > 0 ? "text-white" : "text-slate-700",
                              subColor: todayNextCount > 0 ? "text-violet-200" : "text-slate-400",
                            },
                            {
                              label: "本日コール",
                              value: todayCallCount,
                              highlight: false,
                              icon: (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.75a16 16 0 0 0 6 6z" />
                                </svg>
                              ),
                              gradient: "from-emerald-600 to-teal-600",
                              iconBg: "bg-white/15",
                              textColor: "text-white",
                              subColor: "text-emerald-200",
                            },
                            {
                              label: "アポ（累計）",
                              value: appoCount,
                              highlight: appoCount > 0,
                              icon: (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                </svg>
                              ),
                              gradient: appoCount > 0 ? "from-amber-500 to-orange-500" : "from-slate-100 to-slate-100",
                              iconBg: appoCount > 0 ? "bg-white/15" : "bg-slate-200",
                              textColor: appoCount > 0 ? "text-white" : "text-slate-700",
                              subColor: appoCount > 0 ? "text-amber-200" : "text-slate-400",
                            },
                          ].map((s) => (
                            <div
                              key={s.label}
                              className={`rounded-2xl p-4 md:p-5 bg-gradient-to-br ${s.gradient} shadow-sm relative overflow-hidden`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.iconBg} ${s.textColor}`}>
                                  {s.icon}
                                </div>
                              </div>
                              <div className={`text-3xl md:text-4xl font-bold tracking-tight ${s.textColor}`}>{s.value}</div>
                              <div className={`text-xs mt-1 font-medium ${s.subColor}`}>{s.label}</div>
                              {/* 装飾的な円 */}
                              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
                              <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
                            </div>
                          ))}
                        </div>

                        {/* Filter + Search */}
                        <div className="space-y-2.5 mb-5">
                          {/* 検索欄 */}
                          <div className="flex items-center gap-2.5">
                            <div className="relative flex-1">
                              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                              </svg>
                              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setSelectedIndex(null); }}
                                placeholder="企業名・業種・担当者名で検索..."
                                className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all shadow-sm" />
                              {search && (
                                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-base">✕</button>
                              )}
                            </div>
                            <button
                              onClick={() => setAppendingToListId(currentList.id)}
                              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-slate-500 hover:text-violet-600 rounded-xl text-xs font-medium transition-all shadow-sm"
                            >
                              <span className="hidden sm:inline">＋ 企業を追加</span>
                              <span className="sm:hidden text-base leading-none">＋</span>
                            </button>
                          </div>

                          {isGlobalSearch && (
                            <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 px-3.5 py-2 rounded-xl font-medium flex items-center gap-2">
                              <svg className="w-3.5 h-3.5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                              全リスト検索中 · {filtered.length}件ヒット
                            </div>
                          )}

                          {/* フィルターバー：折りたたみ可能 */}
                          <div className="sticky top-0 z-10 bg-slate-50 pb-1">
                            <div className="flex items-center gap-2">
                              <div className={`flex gap-1.5 overflow-x-auto pb-1 flex-1 transition-all duration-200 ${filterBarOpen ? "" : "hidden"}`} style={{ scrollbarWidth: "none" }}>
                                {FILTER_OPTIONS.map((f) => (
                                  <button key={f} onClick={() => setFilterResult(f)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                                      filterResult === f
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : f === "本日ネクスト" && todayNextCount > 0
                                        ? "bg-violet-100 text-violet-700 border border-violet-200"
                                        : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    }`}>
                                    {f}{f === "本日ネクスト" && todayNextCount > 0 ? ` ${todayNextCount}` : ""}
                                  </button>
                                ))}
                              </div>
                              {!filterBarOpen && (
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-xs text-slate-500">
                                    絞込：<span className="font-semibold text-slate-800">{filterResult}</span>
                                    {filterResult !== "すべて" && (
                                      <button onClick={() => setFilterResult("すべて")} className="ml-1.5 text-slate-400 hover:text-slate-600">✕</button>
                                    )}
                                  </span>
                                </div>
                              )}
                              {assigneeOptions.length > 0 && filterBarOpen && (
                                <select
                                  value={filterAssignee}
                                  onChange={(e) => setFilterAssignee(e.target.value)}
                                  className="shrink-0 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:border-violet-400 transition-all cursor-pointer shadow-sm"
                                >
                                  <option value="すべて">担当：全員</option>
                                  {assigneeOptions.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                  ))}
                                </select>
                              )}
                              <button
                                onClick={() => setFilterBarOpen(!filterBarOpen)}
                                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-xs transition-all shadow-sm"
                                title={filterBarOpen ? "フィルターを閉じる" : "フィルターを開く"}
                              >
                                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${filterBarOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M6 9l6 6 6-6" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* ── モバイル：カード表示 ── */}
                        <div className="sm:hidden space-y-2.5">
                          {filtered.length === 0 ? (
                            <div className="py-16 text-center text-slate-400 text-sm">条件に一致する企業がありません</div>
                          ) : filtered.map((company, i) => {
                            const isNextToday = company.nextDate === today;
                            const activeCall = activeCalls.find((a) => a.companyId === company.id);
                            const isMyCall = activeCall?.userId === user?.id;
                            const otherColorIdx = activeCall && !isMyCall ? memberColorMap.get(activeCall.userId) : undefined;
                            const otherColor = otherColorIdx !== undefined ? MEMBER_ROW_COLORS[otherColorIdx] : undefined;

                            const cardBorder = isMyCall
                              ? "border-l-4 border-l-emerald-500 bg-emerald-50/40"
                              : otherColor
                              ? `border-l-4 ${otherColor.border} ${otherColor.bg}`
                              : isNextToday
                              ? "border-l-4 border-l-violet-500 bg-violet-50/30"
                              : "border-slate-200/80";

                            return (
                              <div key={company.id} onClick={() => setSelectedIndex(i)}
                                className={`bg-white rounded-2xl border px-4 py-4 cursor-pointer active:bg-slate-50 transition-all shadow-sm hover:shadow-md ${cardBorder}`}>
                                {/* 1行目: 会社名 + 結果バッジ */}
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    {isNextToday && !activeCall && <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />}
                                    <span className="font-bold text-slate-900 text-base leading-tight">{company.company}</span>
                                    {isMyCall && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 shrink-0">架電中</span>}
                                    {otherColor && activeCall && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${otherColor.badge}`}>{activeCall.userName}</span>}
                                    {isGlobalSearch && (company as FilteredCompany)._listName && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 shrink-0">{(company as FilteredCompany)._listName}</span>
                                    )}
                                  </div>
                                  {company.latestResult ? (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${RESULT_CONFIG[company.latestResult].badge}`}>
                                      {company.latestResult}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-300 shrink-0">未コール</span>
                                  )}
                                </div>

                                {/* 2行目: 業種・従業員 */}
                                <div className="text-xs text-slate-400 mb-3">
                                  {[company.industry, company.employees ? `${company.employees}` : null].filter(Boolean).join(" · ")}
                                </div>

                                {/* 電話番号（大きいタップターゲット） */}
                                {company.phone && (
                                  <a href={`tel:${company.phone}`} onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 mb-3 active:bg-violet-100 transition-colors">
                                    <svg className="w-4 h-4 text-violet-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.75a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/>
                                    </svg>
                                    <span className="text-sm font-bold text-violet-700 font-mono">{company.phone}</span>
                                    <span className="text-xs text-violet-400 ml-auto">タップで発信</span>
                                  </a>
                                )}

                                {/* 担当・次回連絡日 */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`${company.assignee ? "text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full" : "text-slate-300"}`}>
                                    {company.assignee || "担当未設定"}
                                  </span>
                                  {company.nextDate ? (
                                    <span className={`font-semibold ${isNextToday ? "text-violet-600" : "text-slate-400"}`}>
                                      {isNextToday ? "📅 今日" : company.nextDate}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">次回日未設定</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* ── デスクトップ：テーブル表示 ── */}
                        <div className="hidden sm:block rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                          <table className="w-full text-sm min-w-[900px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">会社名</th>
                                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">電話番号</th>
                                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">業種</th>
                                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">従業員数</th>
                                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">売上</th>
                                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">住所</th>
                                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">担当</th>
                                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">結果</th>
                                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">次回連絡日</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filtered.map((company, i) => {
                                const isNextToday = company.nextDate === today;
                                const activeCall = activeCalls.find((a) => a.companyId === company.id);
                                const isMyCall = activeCall?.userId === user?.id;
                                const otherColorIdx = activeCall && !isMyCall
                                  ? memberColorMap.get(activeCall.userId)
                                  : undefined;
                                const otherColor = otherColorIdx !== undefined
                                  ? MEMBER_ROW_COLORS[otherColorIdx]
                                  : undefined;

                                const rowClass = isMyCall
                                  ? "border-l-[3px] border-l-emerald-500 bg-emerald-50/50 hover:bg-emerald-50"
                                  : otherColor
                                  ? `border-l-[3px] ${otherColor.border} ${otherColor.bg} hover:opacity-90`
                                  : isNextToday
                                  ? "border-l-[3px] border-l-violet-500 bg-violet-50/40 hover:bg-violet-50/70"
                                  : `border-l-[3px] border-l-transparent hover:bg-slate-50/80 ${i % 2 !== 0 ? "bg-slate-50/30" : ""}`;

                                return (
                                  <tr key={company.id} onClick={() => setSelectedIndex(i)}
                                    className={`cursor-pointer transition-colors ${rowClass}`}>
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {isNextToday && !activeCall && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                                        <span className="font-semibold text-slate-800">{company.company}</span>
                                        {isMyCall && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-700 shrink-0">あなた</span>
                                        )}
                                        {otherColor && activeCall && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${otherColor.badge}`}>{activeCall.userName}</span>
                                        )}
                                        {isGlobalSearch && (company as FilteredCompany)._listName && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{(company as FilteredCompany)._listName}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      {company.phone ? (
                                        <a href={`tel:${company.phone}`} onClick={(e) => e.stopPropagation()}
                                          className="text-slate-500 text-xs font-mono hover:text-violet-600 transition-colors hover:underline">
                                          {company.phone}
                                        </a>
                                      ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                    <td className="px-4 py-4 text-slate-500 text-xs">{company.industry || "—"}</td>
                                    <td className="px-4 py-4 text-slate-400 text-xs">{company.employees || "—"}</td>
                                    <td className="px-4 py-4 text-slate-400 text-xs">{company.revenue || "—"}</td>
                                    <td className="px-4 py-4 text-slate-400 text-xs max-w-[160px] truncate" title={company.address}>{company.address || "—"}</td>
                                    <td className="px-4 py-4">
                                      {company.assignee ? (
                                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{company.assignee}</span>
                                      ) : (
                                        <span className="text-slate-300 text-xs">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      {company.latestResult ? (
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${RESULT_CONFIG[company.latestResult].badge}`}>
                                          {company.latestResult}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 text-xs">未コール</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4">
                                      <span className={`text-xs font-medium ${isNextToday ? "text-violet-600" : "text-slate-400"}`}>
                                        {company.nextDate || "—"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                              {filtered.length === 0 && (
                                <tr>
                                  <td colSpan={9} className="px-5 py-16 text-center text-slate-400 text-sm">
                                    条件に一致する企業がありません
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {tab === "follow" && (
              <FollowTab
                lists={lists}
                today={today}
                onOpen={(company, list) => {
                  setSelectedListId(list.id);
                  const idx = list.companies.findIndex((c) => c.id === company.id);
                  setSelectedIndex(idx >= 0 ? idx : null);
                  setTab("list");
                }}
              />
            )}
            {tab === "progress" && (
              <ProgressTab
                companies={allCompanies}
                goalConfig={goalConfig}
                onUpdateGoals={handleUpdateGoals}
                workingHours={workingHours}
                onLogHours={handleLogHours}
                currentUserName={userSettings.name}
              />
            )}
            {tab === "strategy" && (
              <StrategyTab lists={lists} companies={allCompanies} />
            )}
          </div>
        </main>
      </div>

      {/* ── モバイル ボトムナビゲーション ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex items-stretch">
          {NAV_ITEMS.map((item) => {
            const isActive = tab === item.id;
            const badge = item.id === "follow" && followCount > 0 ? followCount : null;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors ${
                  isActive ? "text-violet-600" : "text-slate-400"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-violet-500 rounded-full" />
                )}
                <span className={`transition-transform ${isActive ? "scale-110" : ""}`}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium">{item.shortLabel}</span>
                {badge && (
                  <span className="absolute top-1.5 right-1/4 w-4 h-4 text-[9px] font-bold bg-violet-500 text-white rounded-full flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* iOS home indicator 余白 */}
        <div className="h-safe-bottom" />
      </nav>

      {/* モバイルボトムナビ分の余白 */}
      <div className="md:hidden h-16" />

      {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}

      {appendingToListId && (
        <ImportModal
          appendMode
          appendListName={lists.find((l) => l.id === appendingToListId)?.name ?? ""}
          onAppend={handleAppend}
          onImport={handleImport}
          onClose={() => setAppendingToListId(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          current={userSettings}
          onSave={handleSaveUserSettings}
          onClose={() => setShowSettings(false)}
          onResetDemo={resetToDemo}
          workspace={workspace}
          userId={user.id}
          members={members}
        />
      )}

      {selected && selectedIndex !== null && (
        <ResultModal
          key={selectedIndex}
          company={selected}
          tagConfig={tagConfig}
          userSettings={userSettings}
          onSave={handleSaveResult}
          onUpdateTags={handleUpdateTags}
          onClose={() => setSelectedIndex(null)}
          currentIndex={selectedIndex}
          totalCount={filtered.length}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < filtered.length - 1}
          onPrev={() => setSelectedIndex(selectedIndex - 1)}
          onNext={() => setSelectedIndex(selectedIndex + 1)}
          workspaceId={workspace?.id}
          userId={user?.id}
        />
      )}
    </div>
  );
}
