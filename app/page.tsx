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
  const [loading, setLoading] = useState(false);
  const [activeCalls, setActiveCalls] = useState<ActiveCallInfo[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHoursRecord[]>([]);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white mx-auto mb-4">TL</div>
          <p className="text-slate-400 text-sm">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-30 shadow-sm gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            TL
          </div>
          <span className="text-base md:text-lg font-bold tracking-tight text-slate-800 hidden sm:block">TechLead</span>
        </div>

        <div className="flex gap-0.5 md:gap-1 bg-slate-100 rounded-xl p-1">
          {[
            { id: "list" as Tab, label: "リスト", labelFull: "コールリスト" },
            { id: "follow" as Tab, label: `フォロー${followCount > 0 ? `(${followCount})` : ""}`, labelFull: `フォロー${followCount > 0 ? ` (${followCount})` : ""}` },
            { id: "progress" as Tab, label: "進捗", labelFull: "進捗" },
            { id: "strategy" as Tab, label: "AI戦略", labelFull: "AI戦略" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-2.5 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <span className="sm:hidden">{t.label}</span>
              <span className="hidden sm:inline">{t.labelFull}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-2 md:px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm transition-all"
          >
            <span className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {userSettings.name ? userSettings.name[0] : "?"}
            </span>
            <span className="text-slate-600 text-xs hidden md:block">
              {userSettings.name || "名前を設定"}
            </span>
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs md:text-sm font-medium transition-all shadow-sm">
            <span>＋</span>
            <span className="hidden sm:inline">リストを取込</span>
          </button>
          <button onClick={handleLogout}
            className="px-2 md:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs transition-all hidden sm:block">
            ログアウト
          </button>
        </div>
      </header>

      <div className="px-3 sm:px-4 md:px-8 py-3 md:py-6 max-w-7xl mx-auto">
        {tab === "list" && (
          <>
            {/* チーム架電状況（リアルタイム） */}
            {members.length > 1 && (
              <div className="mb-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-semibold text-slate-800">チーム架電状況</span>
                  <span className="text-xs text-slate-400 ml-1">リアルタイム</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] text-slate-400 border-b border-slate-100">
                        <th className="text-left px-5 py-2 font-semibold">担当者</th>
                        <th className="text-left px-4 py-2 font-semibold">状態</th>
                        <th className="text-left px-4 py-2 font-semibold">コール先</th>
                        <th className="text-left px-5 py-2 font-semibold">開始時刻</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => {
                        const active = activeCalls.find((a) => a.userId === m.userId);
                        return (
                          <tr key={m.userId} className="border-b border-slate-50 last:border-0">
                            <td className="px-5 py-3 text-xs font-medium text-slate-700">{m.name || m.email}</td>
                            <td className="px-4 py-3">
                              {active ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  コール中
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">待機中</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {active ? active.companyName : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-400">
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
              <div className="rounded-xl border border-dashed border-slate-300 py-32 text-center bg-white">
                <p className="text-slate-400 text-lg mb-2">リストがありません</p>
                <p className="text-slate-300 text-sm mb-6">「リストを取込」ボタンでSansanから企業を追加してください</p>
                <button onClick={() => setShowImport(true)}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
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
                      className={`flex-shrink-0 rounded-xl px-5 py-4 min-w-[148px] text-left transition-all border group relative cursor-pointer ${
                        selectedListId === l.id
                          ? "bg-violet-50 border-violet-300 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
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
                          className="bg-transparent border-b border-violet-400 text-base font-bold text-slate-900 focus:outline-none w-32 mb-1"
                        />
                      ) : (
                        <>
                          <div
                            className="text-base font-bold mb-2 pr-10 leading-tight text-slate-800"
                            onDoubleClick={(e) => { e.stopPropagation(); startEditListName(l); }}
                            title="ダブルクリックで名前を編集"
                          >
                            {l.industry || l.name}
                          </div>
                          <div className="space-y-0.5">
                            {(l.fiscalMonthFrom || l.fiscalMonthTo) && (
                              <div className="text-xs text-slate-400">
                                決算 {l.fiscalMonthFrom ? `${l.fiscalMonthFrom}月` : "—"}〜{l.fiscalMonthTo ? `${l.fiscalMonthTo}月` : "—"}
                              </div>
                            )}
                            {(l.revenueFrom || l.revenueTo) && (
                              <div className="text-xs text-slate-400">
                                売上 {l.revenueFrom || "—"}〜{l.revenueTo || "—"}
                              </div>
                            )}
                            {l.industry && l.name !== l.industry && (
                              <div className="text-[10px] text-slate-300">{l.name}</div>
                            )}
                            <div className="text-xs text-slate-400 pt-1">{l.companies.length}件</div>
                          </div>
                        </>
                      )}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                        <span onClick={(e) => { e.stopPropagation(); startEditListName(l); }}
                          className="text-slate-300 hover:text-violet-500 text-xs px-1 cursor-pointer" title="名前を編集">✎</span>
                        <span onClick={(e) => { e.stopPropagation(); handleDeleteList(l.id); }}
                          className="text-slate-300 hover:text-red-500 text-xs px-1 cursor-pointer" title="削除">✕</span>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowImport(true)}
                    className="flex-shrink-0 rounded-xl px-5 py-3.5 border border-dashed border-slate-300 hover:border-violet-400 text-slate-400 hover:text-violet-500 transition-all text-sm bg-white"
                  >
                    ＋ 追加
                  </button>
                </div>

                {currentList && (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                      {[
                        { label: "総件数", value: currentList.companies.length, highlight: false },
                        { label: "本日ネクスト", value: todayNextCount, highlight: todayNextCount > 0 },
                        { label: "本日コール", value: todayCallCount, highlight: false },
                        { label: "アポ（累計）", value: appoCount, highlight: appoCount > 0 },
                      ].map((s) => (
                        <div key={s.label} className={`rounded-xl px-4 py-3 md:p-5 border shadow-sm ${
                          s.highlight ? "bg-violet-50 border-violet-200" : "bg-white border-slate-200"
                        }`}>
                          <div className={`text-2xl md:text-3xl font-bold ${s.highlight ? "text-violet-600" : "text-slate-900"}`}>{s.value}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Filter + Search */}
                    <div className="space-y-2 mb-4">
                      {/* 検索欄 */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                          </svg>
                          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setSelectedIndex(null); }}
                            placeholder="企業名・業種・担当者名で検索..."
                            className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 transition-all" />
                          {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-base">✕</button>
                          )}
                        </div>
                        <button
                          onClick={() => setAppendingToListId(currentList.id)}
                          className="shrink-0 flex items-center gap-1 px-3 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-violet-300 text-slate-500 hover:text-violet-600 rounded-xl text-xs transition-all"
                        >
                          <span className="hidden sm:inline">＋ 企業を追加</span>
                          <span className="sm:hidden text-base leading-none">＋</span>
                        </button>
                      </div>

                      {isGlobalSearch && (
                        <div className="text-xs text-violet-600 bg-violet-50 border border-violet-200 px-3 py-2 rounded-lg font-medium">
                          全リスト検索中 · {filtered.length}件ヒット
                        </div>
                      )}

                      {/* フィルターバー：横スクロール */}
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                          {FILTER_OPTIONS.map((f) => (
                            <button key={f} onClick={() => setFilterResult(f)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                                filterResult === f ? "bg-slate-800 text-white"
                                : f === "本日ネクスト" && todayNextCount > 0 ? "bg-violet-100 text-violet-700"
                                : "bg-white text-slate-600 border border-slate-200"
                              }`}>
                              {f}{f === "本日ネクスト" && todayNextCount > 0 ? ` ${todayNextCount}` : ""}
                            </button>
                          ))}
                        </div>
                        {assigneeOptions.length > 0 && (
                          <select
                            value={filterAssignee}
                            onChange={(e) => setFilterAssignee(e.target.value)}
                            className="shrink-0 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:border-violet-400 transition-all cursor-pointer"
                          >
                            <option value="すべて">担当：全員</option>
                            {assigneeOptions.map(a => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* ── モバイル：カード表示 ── */}
                    <div className="sm:hidden space-y-2">
                      {filtered.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">条件に一致する企業がありません</div>
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
                          ? "border-l-4 border-l-violet-400 bg-violet-50/40"
                          : "border-slate-200";

                        return (
                          <div key={company.id} onClick={() => setSelectedIndex(i)}
                            className={`bg-white rounded-2xl border px-4 py-4 cursor-pointer active:bg-slate-50 transition-colors ${cardBorder}`}>
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
                    <div className="hidden sm:block rounded-xl border border-slate-200 overflow-x-auto shadow-sm bg-white">
                      <table className="w-full text-sm min-w-[900px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-semibold">会社名</th>
                            <th className="text-left px-4 py-3 font-semibold">電話番号</th>
                            <th className="text-left px-4 py-3 font-semibold">業種</th>
                            <th className="text-left px-4 py-3 font-semibold">従業員数</th>
                            <th className="text-left px-4 py-3 font-semibold">売上</th>
                            <th className="text-left px-4 py-3 font-semibold">住所</th>
                            <th className="text-left px-4 py-3 font-semibold">担当</th>
                            <th className="text-left px-4 py-3 font-semibold">結果</th>
                            <th className="text-left px-4 py-3 font-semibold">次回連絡日</th>
                          </tr>
                        </thead>
                        <tbody>
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
                              ? "border-l-4 border-l-emerald-500 bg-emerald-50/60 hover:bg-emerald-50"
                              : otherColor
                              ? `border-l-4 ${otherColor.border} ${otherColor.bg}`
                              : isNextToday
                              ? "border-l-4 border-l-transparent border-violet-100 bg-violet-50/60 hover:bg-violet-50"
                              : "border-l-4 border-l-transparent border-slate-100 hover:bg-slate-50" + (i % 2 !== 0 ? " bg-slate-50/40" : "");

                            return (
                              <tr key={company.id} onClick={() => setSelectedIndex(i)}
                                className={`cursor-pointer border-t transition-colors ${rowClass}`}>
                                <td className="px-4 py-3.5">
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
                                <td className="px-4 py-3.5">
                                  {company.phone ? (
                                    <a href={`tel:${company.phone}`} onClick={(e) => e.stopPropagation()}
                                      className="text-slate-500 text-xs font-mono hover:text-violet-600 transition-colors">
                                      {company.phone}
                                    </a>
                                  ) : <span className="text-slate-300 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 text-xs">{company.industry || "—"}</td>
                                <td className="px-4 py-3.5 text-slate-400 text-xs">{company.employees || "—"}</td>
                                <td className="px-4 py-3.5 text-slate-400 text-xs">{company.revenue || "—"}</td>
                                <td className="px-4 py-3.5 text-slate-400 text-xs max-w-[160px] truncate" title={company.address}>{company.address || "—"}</td>
                                <td className="px-4 py-3.5">
                                  {company.assignee ? (
                                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{company.assignee}</span>
                                  ) : (
                                    <span className="text-slate-300 text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  {company.latestResult ? (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${RESULT_CONFIG[company.latestResult].badge}`}>
                                      {company.latestResult}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 text-xs">未コール</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`text-xs ${isNextToday ? "text-violet-600 font-semibold" : "text-slate-400"}`}>
                                    {company.nextDate || "—"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {filtered.length === 0 && (
                            <tr>
                              <td colSpan={8} className="px-5 py-12 text-center text-slate-400 text-sm">
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
