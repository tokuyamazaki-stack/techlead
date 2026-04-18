"use client";

import { useState, useMemo, useEffect } from "react";
import type { Company, Tab, TagConfig, CallList, UserSettings, GoalConfig } from "./lib/types";
import { RESULT_CONFIG, DEFAULT_TAGS, DEFAULT_GOALS } from "./lib/types";
import ImportModal from "./components/ImportModal";
import ResultModal from "./components/ResultModal";
import SettingsModal from "./components/SettingsModal";
import DailyReport from "./components/DailyReport";
import Analytics from "./components/Analytics";
import ReviewTab from "./components/ReviewTab";
import AuthModal from "./components/AuthModal";
import WorkspaceSetup from "./components/WorkspaceSetup";
import { DEMO_LISTS, DEMO_USER, DEMO_GOALS } from "./lib/demoData";
import type { ReportFormField } from "./lib/types";
import { supabase } from "./lib/supabase";
import * as db from "./lib/db";
import type { Workspace, WorkspaceMember } from "./lib/db";
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
      .subscribe();

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
    const [loadedLists, loadedSettings, loadedTags, loadedGoals, loadedMembers] = await Promise.all([
      db.loadAllLists(workspaceId),
      db.loadUserSettings(userId),
      db.loadTagConfig(userId),
      db.loadGoalConfig(userId),
      db.getWorkspaceMembers(workspaceId),
    ]);

    setMembers(loadedMembers);

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

  async function handleLogout() {
    await supabase.auth.signOut();
    setLists([]);
    setUserSettings(DEFAULT_USER);
  }

  const today = todayStr();
  const currentList = lists.find((l) => l.id === selectedListId) ?? null;
  const allCompanies = lists.flatMap((l) => l.companies);

  const FILTER_OPTIONS = ["すべて", "未コール", "本日ネクスト", "アポ獲得", "資料送付", "再コール", "担当者不在", "担当NG", "受付NG"];

  const filtered = useMemo(() => {
    const companies = currentList?.companies ?? [];
    return companies
      .filter((c) => {
        const matchFilter =
          filterResult === "すべて" ||
          (filterResult === "未コール" && !c.latestResult) ||
          (filterResult === "本日ネクスト" && c.nextDate === today) ||
          c.latestResult === filterResult;
        const matchSearch =
          !search ||
          c.company.includes(search) ||
          (c.industry || "").includes(search) ||
          (c.phone || "").includes(search);
        return matchFilter && matchSearch;
      })
      .sort((a, b) => {
        const aToday = a.nextDate === today ? -1 : 0;
        const bToday = b.nextDate === today ? -1 : 0;
        return aToday - bToday;
      });
  }, [currentList, filterResult, search, today]);

  const selected = selectedIndex !== null ? filtered[selectedIndex] ?? null : null;

  const todayCallCount = allCompanies.flatMap((c) =>
    c.callHistory.filter((h) => h.date === today)
  ).length;
  const todayNextCount = currentList?.companies.filter((c) => c.nextDate === today).length ?? 0;
  const appoCount = currentList?.companies.filter((c) => c.latestResult === "アポ獲得").length ?? 0;

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
            { id: "report" as Tab, label: `日報${todayCallCount > 0 ? `(${todayCallCount})` : ""}`, labelFull: `日報${todayCallCount > 0 ? ` (${todayCallCount})` : ""}` },
            { id: "analytics" as Tab, label: "分析", labelFull: "分析" },
            { id: "review" as Tab, label: "振り返り", labelFull: "振り返り" },
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

      <div className="px-4 md:px-8 py-4 md:py-6 max-w-7xl mx-auto">
        {tab === "list" && (
          <>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                      {[
                        { label: "総件数", value: currentList.companies.length, highlight: false },
                        { label: "本日ネクスト", value: todayNextCount, highlight: todayNextCount > 0 },
                        { label: "本日コール数", value: todayCallCount, highlight: false },
                        { label: "アポ獲得（累計）", value: appoCount, highlight: appoCount > 0 },
                      ].map((s) => (
                        <div key={s.label} className={`rounded-xl p-5 border shadow-sm ${
                          s.highlight ? "bg-violet-50 border-violet-200" : "bg-white border-slate-200"
                        }`}>
                          <div className={`text-3xl font-bold ${s.highlight ? "text-violet-600" : "text-slate-900"}`}>{s.value}</div>
                          <div className="text-xs text-slate-400 mt-1">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Filter + Search */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <div className="flex gap-1.5 flex-wrap">
                        {FILTER_OPTIONS.map((f) => (
                          <button key={f} onClick={() => setFilterResult(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              filterResult === f ? "bg-slate-800 text-white"
                              : f === "本日ネクスト" && todayNextCount > 0 ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}>
                            {f}{f === "本日ネクスト" && todayNextCount > 0 ? ` ${todayNextCount}` : ""}
                          </button>
                        ))}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => setAppendingToListId(currentList.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-violet-300 text-slate-500 hover:text-violet-600 rounded-lg text-xs transition-all"
                        >
                          ＋ 企業を追加
                        </button>
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                          placeholder="企業名・電話番号で検索..."
                          className="bg-white border border-slate-200 rounded-lg px-4 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all w-56" />
                      </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border border-slate-200 overflow-x-auto shadow-sm bg-white">
                      <table className="w-full text-sm min-w-[900px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-semibold">会社名</th>
                            <th className="text-left px-4 py-3 font-semibold">電話番号</th>
                            <th className="text-left px-4 py-3 font-semibold">業種</th>
                            <th className="text-left px-4 py-3 font-semibold">従業員数</th>
                            <th className="text-left px-4 py-3 font-semibold">売上</th>
                            <th className="text-left px-4 py-3 font-semibold">住所</th>
                            <th className="text-left px-4 py-3 font-semibold">結果</th>
                            <th className="text-left px-4 py-3 font-semibold">次回連絡日</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((company, i) => {
                            const isNextToday = company.nextDate === today;
                            return (
                              <tr key={company.id} onClick={() => setSelectedIndex(i)}
                                className={`cursor-pointer border-t transition-colors ${
                                  isNextToday
                                    ? "border-violet-100 bg-violet-50/60 hover:bg-violet-50"
                                    : "border-slate-100 hover:bg-slate-50" + (i % 2 !== 0 ? " bg-slate-50/40" : "")
                                }`}>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    {isNextToday && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                                    <span className="font-semibold text-slate-800">{company.company}</span>
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

        {tab === "report" && <DailyReport companies={allCompanies} userSettings={userSettings} />}
        {tab === "analytics" && <Analytics companies={allCompanies} goalConfig={goalConfig} onUpdateGoals={handleUpdateGoals} />}
        {tab === "review" && (
          <ReviewTab
            lists={lists}
            onSelectCompany={(companyId, listId) => {
              const targetList = lists.find((l) => l.id === listId);
              const targetCompany = targetList?.companies.find((c) => c.id === companyId);
              setSelectedListId(listId);
              setFilterResult("すべて");
              setSearch(targetCompany?.company ?? "");
              setSelectedIndex(0);
              setTab("list");
            }}
          />
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
        />
      )}
    </div>
  );
}
