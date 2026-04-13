"use client";

import { useState, useMemo, useEffect } from "react";
import type { Company, Tab, TagConfig, CallList } from "./lib/types";
import { RESULT_CONFIG, DEFAULT_TAGS } from "./lib/types";
import ImportModal from "./components/ImportModal";
import ResultModal from "./components/ResultModal";
import DailyReport from "./components/DailyReport";
import Analytics from "./components/Analytics";

const LISTS_KEY = "techlead_lists";
const TAGS_KEY = "techlead_tags";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function Home() {
  const [lists, setLists] = useState<CallList[]>([]);
  const [tagConfig, setTagConfig] = useState<TagConfig>(DEFAULT_TAGS);
  const [tab, setTab] = useState<Tab>("list");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Company | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState<string>("すべて");

  useEffect(() => {
    const savedLists = load<CallList[]>(LISTS_KEY, []);
    setLists(savedLists);
    setTagConfig(load(TAGS_KEY, DEFAULT_TAGS));
    if (savedLists.length > 0) setSelectedListId(savedLists[0].id);
  }, []);

  function saveLists(next: CallList[]) {
    setLists(next);
    localStorage.setItem(LISTS_KEY, JSON.stringify(next));
  }

  function updateTags(next: TagConfig) {
    setTagConfig(next);
    localStorage.setItem(TAGS_KEY, JSON.stringify(next));
  }

  function handleImport(name: string, companies: Company[]) {
    const newList: CallList = {
      id: `list-${Date.now()}`,
      name,
      companies,
      createdAt: new Date().toISOString(),
    };
    const next = [...lists, newList];
    saveLists(next);
    setSelectedListId(newList.id);
    setShowImport(false);
  }

  function handleSaveResult(updated: Company) {
    const next = lists.map((l) => ({
      ...l,
      companies: l.companies.map((c) => (c.id === updated.id ? updated : c)),
    }));
    saveLists(next);
    setSelected(null);
  }

  function handleDeleteList(id: string) {
    if (!confirm("このリストを削除しますか？")) return;
    const next = lists.filter((l) => l.id !== id);
    saveLists(next);
    if (selectedListId === id) {
      setSelectedListId(next.length > 0 ? next[0].id : null);
    }
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

  const todayCallCount = allCompanies.flatMap((c) =>
    c.callHistory.filter((h) => h.date === today)
  ).length;

  const todayNextCount = currentList?.companies.filter((c) => c.nextDate === today).length ?? 0;
  const appoCount = currentList?.companies.filter((c) => c.latestResult === "アポ獲得").length ?? 0;

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-4 flex items-center justify-between sticky top-0 bg-[#0d0d0f]/95 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
            TL
          </div>
          <span className="text-lg font-semibold tracking-wide">TechLead</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {[
            { id: "list" as Tab, label: "コールリスト" },
            { id: "report" as Tab, label: `日報${todayCallCount > 0 ? ` (${todayCallCount})` : ""}` },
            { id: "analytics" as Tab, label: "分析" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-white text-black" : "text-white/50 hover:text-white/80"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-all">
          ＋ リストを取込
        </button>
      </header>

      <div className="px-8 py-6 max-w-7xl mx-auto">
        {tab === "list" && (
          <>
            {lists.length === 0 ? (
              /* 空の状態 */
              <div className="rounded-xl border border-dashed border-white/10 py-32 text-center">
                <p className="text-white/20 text-lg mb-2">リストがありません</p>
                <p className="text-white/10 text-sm mb-6">「リストを取込」ボタンでSansanから企業を追加してください</p>
                <button onClick={() => setShowImport(true)}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-all">
                  ＋ リストを取込
                </button>
              </div>
            ) : (
              <>
                {/* リスト一覧（横スクロール） */}
                <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                  {lists.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedListId(l.id); setFilterResult("すべて"); setSearch(""); }}
                      className={`flex-shrink-0 rounded-xl px-5 py-3.5 text-left transition-all border group relative ${
                        selectedListId === l.id
                          ? "bg-violet-900/40 border-violet-500/50"
                          : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="text-sm font-semibold mb-1 pr-5">{l.name}</div>
                      <div className="text-xs text-white/40">{l.companies.length}件</div>
                      {/* 削除ボタン */}
                      <span
                        onClick={(e) => { e.stopPropagation(); handleDeleteList(l.id); }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all text-xs px-1 cursor-pointer"
                      >
                        ✕
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowImport(true)}
                    className="flex-shrink-0 rounded-xl px-5 py-3.5 border border-dashed border-white/10 hover:border-violet-500/50 text-white/30 hover:text-violet-400 transition-all text-sm"
                  >
                    ＋ 追加
                  </button>
                </div>

                {currentList && (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      {[
                        { label: "総件数", value: currentList.companies.length, highlight: false },
                        { label: "本日ネクスト", value: todayNextCount, highlight: todayNextCount > 0 },
                        { label: "本日コール数", value: todayCallCount, highlight: false },
                        { label: "アポ獲得（累計）", value: appoCount, highlight: appoCount > 0 },
                      ].map((s) => (
                        <div key={s.label} className={`rounded-xl p-5 border ${
                          s.highlight
                            ? "bg-violet-900/30 border-violet-700/40"
                            : "bg-white/[0.03] border-white/10"
                        }`}>
                          <div className="text-3xl font-bold">{s.value}</div>
                          <div className="text-xs text-white/40 mt-1">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Filter + Search */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <div className="flex gap-1.5 flex-wrap">
                        {FILTER_OPTIONS.map((f) => (
                          <button key={f} onClick={() => setFilterResult(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              filterResult === f
                                ? "bg-white text-black"
                                : f === "本日ネクスト" && todayNextCount > 0
                                ? "bg-violet-800/50 text-violet-300 hover:bg-violet-700/50"
                                : "bg-white/5 text-white/50 hover:bg-white/10"
                            }`}>
                            {f}{f === "本日ネクスト" && todayNextCount > 0 ? ` ${todayNextCount}` : ""}
                          </button>
                        ))}
                      </div>
                      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="企業名・電話番号で検索..."
                        className="ml-auto bg-white/5 border border-white/10 rounded-lg px-4 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 transition-colors w-56" />
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-white/5 text-white/40 text-xs">
                            <th className="text-left px-4 py-3 font-medium">会社名</th>
                            <th className="text-left px-4 py-3 font-medium">電話番号</th>
                            <th className="text-left px-4 py-3 font-medium">業種</th>
                            <th className="text-left px-4 py-3 font-medium">従業員数</th>
                            <th className="text-left px-4 py-3 font-medium">結果</th>
                            <th className="text-left px-4 py-3 font-medium">次回連絡日</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((company, i) => {
                            const isNextToday = company.nextDate === today;
                            return (
                              <tr key={company.id} onClick={() => setSelected(company)}
                                className={`cursor-pointer border-t transition-colors ${
                                  isNextToday
                                    ? "border-violet-800/30 bg-violet-900/10 hover:bg-violet-800/20"
                                    : "border-white/5 hover:bg-white/[0.04]" + (i % 2 !== 0 ? " bg-white/[0.015]" : "")
                                }`}>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    {isNextToday && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />}
                                    <span className="font-medium">{company.company}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  {company.phone ? (
                                    <a href={`tel:${company.phone}`} onClick={(e) => e.stopPropagation()}
                                      className="text-white/50 text-xs font-mono hover:text-violet-400 transition-colors">
                                      {company.phone}
                                    </a>
                                  ) : <span className="text-white/20 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3.5 text-white/50 text-xs">{company.industry || "—"}</td>
                                <td className="px-4 py-3.5 text-white/40 text-xs">{company.employees || "—"}</td>
                                <td className="px-4 py-3.5">
                                  {company.latestResult ? (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${RESULT_CONFIG[company.latestResult].badge}`}>
                                      {company.latestResult}
                                    </span>
                                  ) : (
                                    <span className="text-white/20 text-xs">未コール</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`text-xs ${isNextToday ? "text-violet-400 font-semibold" : "text-white/40"}`}>
                                    {company.nextDate || "—"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {filtered.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-5 py-12 text-center text-white/20 text-sm">
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

        {tab === "report" && <DailyReport companies={allCompanies} />}
        {tab === "analytics" && <Analytics companies={allCompanies} />}
      </div>

      {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}

      {selected && (
        <ResultModal
          company={selected}
          tagConfig={tagConfig}
          onSave={handleSaveResult}
          onUpdateTags={updateTags}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
