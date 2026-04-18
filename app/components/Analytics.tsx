"use client";

import { useState, useMemo } from "react";
import type { Company, CallList, GoalConfig } from "../lib/types";
import { RESULTS, RESULT_CONFIG } from "../lib/types";

interface ListAnalysis {
  list_name: string;
  grade: string;
  headline: string;
  numbers: string;
  bottleneck: string;
  verdict: "continue" | "refine" | "pivot" | "drop";
  verdict_reason: string;
  next_sansan: string;
  pitch_hint?: string;
}

interface AnalysisResult {
  overall_diagnosis: string;
  list_analyses: ListAnalysis[];
  best_list: { name: string; reason: string; replicate: string };
  ng_pattern_insight: string;
  priority_actions: { priority: string; action: string; expected_impact: string }[];
}

interface Props {
  lists: CallList[];
  companies: Company[];
  goalConfig: GoalConfig;
  onUpdateGoals: (goals: GoalConfig) => void;
}

function ProgressBar({ value, max, color = "bg-violet-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Analytics({ lists, companies, goalConfig, onUpdateGoals }: Props) {
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [editGoals, setEditGoals] = useState(goalConfig);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"overall" | "list">("overall");

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.substring(0, 7);
  const daysInMonth = new Date(parseInt(thisMonth.split("-")[0]), parseInt(thisMonth.split("-")[1]), 0).getDate();
  const dayOfMonth = new Date().getDate();
  const remainingDays = daysInMonth - dayOfMonth;
  const workingDays = 20; // 月の稼働日数

  const allRecords = useMemo(() =>
    companies.flatMap((c) =>
      c.callHistory.map((h) => ({ ...h, industry: c.industry, companyName: c.company }))
    ), [companies]);

  const todayRecords = useMemo(() => allRecords.filter(r => r.date === today), [allRecords, today]);
  const monthRecords = useMemo(() => allRecords.filter(r => r.date.startsWith(thisMonth)), [allRecords, thisMonth]);
  const total = allRecords.length;

  // 担当者一覧（今日 or 今月にコールした人）
  const assignees = useMemo(() => {
    const set = new Set<string>();
    [...todayRecords, ...monthRecords].forEach(r => { if (r.assignee) set.add(r.assignee); });
    return Array.from(set);
  }, [todayRecords, monthRecords]);

  // 担当者別 今日
  const todayByAssignee = useMemo(() => {
    const map: Record<string, { calls: number; appo: number; material: number }> = {};
    assignees.forEach(a => { map[a] = { calls: 0, appo: 0, material: 0 }; });
    todayRecords.forEach(r => {
      if (!r.assignee) return;
      if (!map[r.assignee]) map[r.assignee] = { calls: 0, appo: 0, material: 0 };
      map[r.assignee].calls++;
      if (r.result === "アポ獲得") map[r.assignee].appo++;
      if (r.result === "資料送付") map[r.assignee].material++;
    });
    return Object.entries(map).sort((a, b) => b[1].calls - a[1].calls);
  }, [todayRecords, assignees]);

  // 担当者別 今月
  const monthByAssignee = useMemo(() => {
    const map: Record<string, { calls: number; appo: number }> = {};
    assignees.forEach(a => { map[a] = { calls: 0, appo: 0 }; });
    monthRecords.forEach(r => {
      if (!r.assignee) return;
      if (!map[r.assignee]) map[r.assignee] = { calls: 0, appo: 0 };
      map[r.assignee].calls++;
      if (r.result === "アポ獲得") map[r.assignee].appo++;
    });
    return map;
  }, [monthRecords, assignees]);

  const teamToday = {
    calls: todayRecords.length,
    appo: todayRecords.filter(r => r.result === "アポ獲得").length,
  };
  const teamMonth = {
    calls: monthRecords.length,
    appo: monthRecords.filter(r => r.result === "アポ獲得").length,
  };
  const monthlyCallGoal = goalConfig.teamDailyCalls * workingDays;

  // 業界傾向
  const byIndustry = useMemo(() => {
    const map: Record<string, { total: number; appo: number; material: number }> = {};
    allRecords.forEach(r => {
      const ind = r.industry || "不明";
      if (!map[ind]) map[ind] = { total: 0, appo: 0, material: 0 };
      map[ind].total++;
      if (r.result === "アポ獲得") map[ind].appo++;
      if (r.result === "資料送付") map[ind].material++;
    });
    return Object.entries(map).sort((a, b) => b[1].appo - a[1].appo).slice(0, 8);
  }, [allRecords]);

  // 結果別集計
  const resultCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    RESULTS.forEach(r => (counts[r] = 0));
    allRecords.forEach(r => { counts[r.result] = (counts[r.result] || 0) + 1; });
    return counts;
  }, [allRecords]);

  // 直近7日
  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days.map(date => ({
      date,
      label: new Date(date + "T00:00:00").toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
      total: allRecords.filter(r => r.date === date).length,
      appo: allRecords.filter(r => r.date === date && r.result === "アポ獲得").length,
    }));
  }, [allRecords]);
  const maxDay = Math.max(...last7Days.map(d => d.total), 1);

  async function runAnalysis() {
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult(null);

    // リスト別サマリーを構築
    const listSummaries = lists.map((list) => {
      const totalCompanies = list.companies.length;
      const calledCompanies = list.companies.filter((c) => c.callHistory.length > 0).length;
      const callCoverage = totalCompanies > 0
        ? `${Math.round((calledCompanies / totalCompanies) * 100)}%`
        : "0%";

      const results: Record<string, number> = {};
      RESULTS.forEach((r) => { results[r] = 0; });
      list.companies.forEach((c) => {
        if (c.latestResult) results[c.latestResult] = (results[c.latestResult] || 0) + 1;
      });

      const totalCalled = Object.values(results).reduce((a, b) => a + b, 0);
      const appoRate = totalCalled > 0
        ? `${((results["アポ獲得"] / totalCalled) * 100).toFixed(1)}%`
        : "0%";

      const ngReasons: Record<string, number> = {};
      list.companies.forEach((c) => {
        c.callHistory.forEach((h) => {
          if (h.ngReason) ngReasons[h.ngReason] = (ngReasons[h.ngReason] || 0) + 1;
        });
      });

      const totalCallCount = list.companies.reduce((sum, c) => sum + c.callHistory.length, 0);
      const avgCallsPerCompany = calledCompanies > 0
        ? (totalCallCount / calledCompanies).toFixed(1)
        : "0";

      // 業界の内訳（このリスト内）
      const industryBreakdown: Record<string, { count: number; appo: number }> = {};
      list.companies.forEach((c) => {
        const ind = c.industry || "不明";
        if (!industryBreakdown[ind]) industryBreakdown[ind] = { count: 0, appo: 0 };
        industryBreakdown[ind].count++;
        if (c.latestResult === "アポ獲得") industryBreakdown[ind].appo++;
      });

      return {
        list_name: list.industry || list.name,
        meta: {
          sansan_conditions: [
            list.industry ? `業界: ${list.industry}` : null,
            list.fiscalMonthFrom || list.fiscalMonthTo
              ? `決算月: ${list.fiscalMonthFrom || "?"}〜${list.fiscalMonthTo || "?"}月`
              : null,
            list.revenueFrom || list.revenueTo
              ? `売上: ${list.revenueFrom || "?"}〜${list.revenueTo || "?"}`
              : null,
          ].filter(Boolean),
        },
        total_companies: totalCompanies,
        called_companies: calledCompanies,
        uncalled_companies: totalCompanies - calledCompanies,
        call_coverage: callCoverage,
        results,
        appo_rate: appoRate,
        ng_reasons: ngReasons,
        avg_calls_per_company: avgCallsPerCompany,
        industry_breakdown: industryBreakdown,
      };
    });

    // 全体NGパターン
    const allNgReasons: Record<string, number> = {};
    companies.forEach((c) => {
      c.callHistory.forEach((h) => {
        if (h.ngReason) allNgReasons[h.ngReason] = (allNgReasons[h.ngReason] || 0) + 1;
      });
    });

    const summary = {
      total_lists: lists.length,
      total_companies: companies.length,
      total_calls: allRecords.length,
      overall_appo_rate: allRecords.length > 0
        ? `${((allRecords.filter(r => r.result === "アポ獲得").length / allRecords.length) * 100).toFixed(1)}%`
        : "0%",
      lists: listSummaries,
      all_ng_reasons: allNgReasons,
    };

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      const data = await res.json();
      if (data.error) {
        setAnalysisError(data.error);
      } else {
        setAnalysisResult(data.result);
      }
    } catch {
      setAnalysisError("通信エラーが発生しました");
    } finally {
      setAnalyzing(false);
    }
  }

  if (total === 0) {
    return (
      <div className="text-center py-20 text-slate-300">
        <p className="text-lg">まだデータがありません</p>
        <p className="text-sm mt-2">コールを記録すると分析が表示されます</p>
      </div>
    );
  }

  const gradeStyle: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-700 border-emerald-200",
    B: "bg-blue-100 text-blue-700 border-blue-200",
    C: "bg-amber-100 text-amber-700 border-amber-200",
    D: "bg-red-100 text-red-600 border-red-200",
  };

  const verdictLabel: Record<string, { label: string; style: string }> = {
    continue: { label: "継続", style: "bg-emerald-100 text-emerald-700" },
    refine:   { label: "絞り直し", style: "bg-blue-100 text-blue-700" },
    pivot:    { label: "業界変更", style: "bg-amber-100 text-amber-700" },
    drop:     { label: "廃棄を検討", style: "bg-red-100 text-red-600" },
  };

  const priorityColor: Record<string, string> = {
    高: "bg-red-100 text-red-700",
    中: "bg-amber-100 text-amber-700",
    低: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="space-y-8">

      {/* ── AIリスト分析 ── */}
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">AIリスト分析</h2>
            <p className="text-xs text-slate-400 mt-0.5">コール結果からSansan絞り条件・次のアクションをAIが提案します</p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            {analyzing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                分析中...
              </>
            ) : (
              <>✦ 分析する</>
            )}
          </button>
        </div>

        {/* モード切替タブ（分析結果があるときだけ表示） */}
        {analysisResult && (
          <div className="flex gap-1 bg-white/70 rounded-xl p-1 mb-4 w-fit">
            {([["overall", "全体分析"], ["list", "リスト別分析"]] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setAnalysisMode(mode)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  analysisMode === mode
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {!analysisResult && !analyzing && (
          <p className="text-xs text-slate-400 mt-1">
            ※ コールを記録してから実行するほど精度が上がります
          </p>
        )}

        {analysisError && (
          <div className="text-xs text-red-500 bg-red-50 rounded-lg px-4 py-3 mt-3">{analysisError}</div>
        )}

        {analysisResult && (
          <div className="space-y-5">

            {/* ===== 全体分析モード ===== */}
            {analysisMode === "overall" && (
              <>
                {/* 全体診断 */}
                <div className="bg-white rounded-xl p-4 border border-violet-100">
                  <div className="text-xs text-violet-500 font-semibold mb-1.5">全体診断</div>
                  <p className="text-sm text-slate-700 leading-relaxed">{analysisResult.overall_diagnosis}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 最もROIが高いリスト */}
                  {analysisResult.best_list && (
                    <div className="bg-white rounded-xl p-4 border border-emerald-100">
                      <div className="text-xs text-emerald-600 font-semibold mb-2">最も効果的なリスト</div>
                      <p className="text-sm font-semibold text-slate-800 mb-1">{analysisResult.best_list.name}</p>
                      <p className="text-xs text-slate-500 mb-2">{analysisResult.best_list.reason}</p>
                      <div className="bg-emerald-50 rounded-lg px-3 py-2 text-xs text-slate-700">
                        <span className="text-emerald-600 font-semibold">横展開：</span> {analysisResult.best_list.replicate}
                      </div>
                    </div>
                  )}

                  {/* NGパターン */}
                  {analysisResult.ng_pattern_insight && (
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <div className="text-xs text-slate-500 font-semibold mb-2">NG理由から見えること</div>
                      <p className="text-xs text-slate-600 leading-relaxed">{analysisResult.ng_pattern_insight}</p>
                    </div>
                  )}
                </div>

                {/* 優先アクション */}
                {analysisResult.priority_actions?.length > 0 && (
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <div className="text-xs text-slate-500 font-semibold mb-3">今週やるべきアクション</div>
                    <div className="space-y-3">
                      {analysisResult.priority_actions.map((item, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${priorityColor[item.priority] ?? "bg-slate-100 text-slate-500"}`}>
                            {item.priority}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{item.action}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{item.expected_impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===== リスト別分析モード ===== */}
            {analysisMode === "list" && analysisResult.list_analyses?.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 font-semibold mb-2">リスト別診断</div>
                <div className="space-y-3">
                  {analysisResult.list_analyses.map((la, i) => {
                    const v = verdictLabel[la.verdict] ?? { label: la.verdict, style: "bg-slate-100 text-slate-500" };
                    const g = gradeStyle[la.grade] ?? "bg-slate-100 text-slate-500 border-slate-200";
                    return (
                      <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                        {/* ヘッダー */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                          <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg border ${g}`}>
                            {la.grade}
                          </span>
                          <span className="font-semibold text-slate-800 text-sm flex-1">{la.list_name}</span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${v.style}`}>
                            {v.label}
                          </span>
                        </div>

                        <div className="p-4 space-y-3">
                          {/* 一言評価 */}
                          <p className="text-sm font-medium text-slate-700">{la.headline}</p>

                          {/* 数字の解釈 */}
                          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                            {la.numbers}
                          </div>

                          {/* ボトルネック */}
                          <div>
                            <span className="text-[11px] text-amber-600 font-semibold">ボトルネック：</span>
                            <span className="text-xs text-slate-600 ml-1">{la.bottleneck}</span>
                          </div>

                          {/* 判断理由 */}
                          <div>
                            <span className="text-[11px] text-slate-400 font-semibold">判断根拠：</span>
                            <span className="text-xs text-slate-500 ml-1">{la.verdict_reason}</span>
                          </div>

                          {/* 次のSansan条件 */}
                          <div className="bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-100">
                            <div className="text-[11px] text-blue-600 font-semibold mb-1">次のSansan絞り条件</div>
                            <p className="text-xs text-slate-700 leading-relaxed">{la.next_sansan}</p>
                          </div>

                          {/* トークヒント */}
                          {la.pitch_hint && (
                            <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                              <div className="text-[11px] text-amber-600 font-semibold mb-1">トーク改善のヒント</div>
                              <p className="text-xs text-slate-700 leading-relaxed">{la.pitch_hint}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── 目標設定エディタ ── */}
      {showGoalEditor && (
        <div className="bg-white border border-violet-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">目標を編集</h3>
            <button onClick={() => setShowGoalEditor(false)} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "dailyCallsPerPerson", label: "1人あたり 1日コール目標" },
              { key: "monthlyAppoPerPerson", label: "1人あたり 月間アポ目標" },
              { key: "teamDailyCalls", label: "チーム全体 1日コール目標" },
              { key: "teamMonthlyAppo", label: "チーム全体 月間アポ目標" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-slate-500 mb-1.5 block">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={1}
                    value={editGoals[key as keyof GoalConfig]}
                    onChange={e => setEditGoals({ ...editGoals, [key]: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-violet-500"
                  />
                  <span className="text-sm text-slate-400 shrink-0">件</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => { onUpdateGoals(editGoals); setShowGoalEditor(false); }}
            className="mt-4 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-all"
          >
            保存する
          </button>
        </div>
      )}

      {/* ── 今日の進捗 ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">今日の進捗</h2>
          <button
            onClick={() => { setEditGoals(goalConfig); setShowGoalEditor(!showGoalEditor); }}
            className="text-xs text-slate-400 hover:text-violet-600 border border-slate-200 hover:border-violet-300 px-3 py-1.5 rounded-lg transition-all"
          >
            目標を設定
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">チーム コール数</div>
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold text-slate-900">
                {teamToday.calls}
                <span className="text-base font-normal text-slate-400 ml-1">/ {goalConfig.teamDailyCalls}件</span>
              </div>
              {teamToday.calls >= goalConfig.teamDailyCalls
                ? <span className="text-emerald-600 text-sm font-semibold mb-1">達成！</span>
                : <span className="text-slate-400 text-sm mb-1">あと<span className="text-slate-700 font-bold text-lg mx-1">{goalConfig.teamDailyCalls - teamToday.calls}</span>件</span>
              }
            </div>
            <ProgressBar value={teamToday.calls} max={goalConfig.teamDailyCalls} color="bg-violet-500" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">チーム アポ獲得（本日）</div>
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold text-slate-900">
                {teamToday.appo}
                <span className="text-base font-normal text-slate-400 ml-1">件</span>
              </div>
              {teamToday.appo > 0
                ? <span className="text-emerald-600 text-sm font-semibold mb-1">+{teamToday.appo}件獲得</span>
                : <span className="text-slate-300 text-sm mb-1">まだなし</span>
              }
            </div>
            <ProgressBar value={teamToday.appo} max={Math.max(Math.ceil(goalConfig.teamMonthlyAppo / workingDays), 1)} color="bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* ── 担当者別 今日の状況 ── */}
      {todayByAssignee.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3">担当者別 今日の状況</h2>
          <div className="grid grid-cols-2 gap-3">
            {todayByAssignee.map(([name, data], i) => {
              const isGoalMet = data.calls >= goalConfig.dailyCallsPerPerson;
              const RANK_COLORS = ["bg-amber-400", "bg-slate-400", "bg-orange-300"];
              return (
                <div key={name} className={`bg-white border rounded-xl p-4 shadow-sm ${isGoalMet ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${RANK_COLORS[i] ?? "bg-slate-300"}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate flex-1">{name}</span>
                    {isGoalMet && <span className="text-xs text-emerald-600 font-semibold">達成</span>}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <ProgressBar
                      value={data.calls}
                      max={goalConfig.dailyCallsPerPerson}
                      color={isGoalMet ? "bg-emerald-500" : "bg-violet-500"}
                    />
                    <span className="text-xs text-slate-600 shrink-0">{data.calls}/{goalConfig.dailyCallsPerPerson}件</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    {data.appo > 0 && <span className="text-emerald-600 font-medium">アポ {data.appo}件</span>}
                    {data.material > 0 && <span className="text-purple-600 font-medium">資料 {data.material}件</span>}
                    {data.appo === 0 && data.material === 0 && <span className="text-slate-300">成果なし</span>}
                    {!isGoalMet && (
                      <span className="ml-auto text-slate-400">あと{goalConfig.dailyCallsPerPerson - data.calls}件</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 今月の進捗 ── */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          今月の進捗
          <span className="text-xs font-normal text-slate-400 ml-2">残{remainingDays}日</span>
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">チーム コール（月間）</div>
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold text-slate-900">
                {teamMonth.calls}
                <span className="text-base font-normal text-slate-400 ml-1">/ {monthlyCallGoal}件</span>
              </div>
              {teamMonth.calls >= monthlyCallGoal
                ? <span className="text-emerald-600 text-sm font-semibold mb-1">達成！</span>
                : <span className="text-slate-400 text-sm mb-1">あと<span className="text-slate-700 font-bold text-lg mx-1">{monthlyCallGoal - teamMonth.calls}</span>件</span>
              }
            </div>
            <ProgressBar value={teamMonth.calls} max={monthlyCallGoal} color="bg-violet-500" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">チーム アポ獲得（月間）</div>
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold text-slate-900">
                {teamMonth.appo}
                <span className="text-base font-normal text-slate-400 ml-1">/ {goalConfig.teamMonthlyAppo}件</span>
              </div>
              {teamMonth.appo >= goalConfig.teamMonthlyAppo
                ? <span className="text-emerald-600 text-sm font-semibold mb-1">達成！</span>
                : <span className="text-slate-400 text-sm mb-1">あと<span className="text-slate-700 font-bold text-lg mx-1">{goalConfig.teamMonthlyAppo - teamMonth.appo}</span>件</span>
              }
            </div>
            <ProgressBar value={teamMonth.appo} max={goalConfig.teamMonthlyAppo} color="bg-emerald-500" />
          </div>
        </div>

        {/* 担当者別 月間テーブル */}
        {assignees.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-medium">担当者</th>
                  <th className="text-center px-3 py-3 font-medium">コール</th>
                  <th className="text-center px-3 py-3 font-medium">目標</th>
                  <th className="text-center px-3 py-3 font-medium">アポ</th>
                  <th className="text-center px-3 py-3 font-medium">目標</th>
                  <th className="text-center px-3 py-3 font-medium">アポ率</th>
                  <th className="px-4 py-3 font-medium w-36">進捗</th>
                </tr>
              </thead>
              <tbody>
                {assignees
                  .map(name => ({ name, d: monthByAssignee[name] || { calls: 0, appo: 0 } }))
                  .sort((a, b) => b.d.appo - a.d.appo)
                  .map(({ name, d }) => {
                    const callGoal = goalConfig.dailyCallsPerPerson * workingDays;
                    const appoGoal = goalConfig.monthlyAppoPerPerson;
                    const callPct = callGoal > 0 ? Math.min((d.calls / callGoal) * 100, 100) : 0;
                    const appoRate = d.calls > 0 ? Math.round((d.appo / d.calls) * 100) : 0;
                    const isCallMet = d.calls >= callGoal;
                    const isAppoMet = d.appo >= appoGoal;
                    return (
                      <tr key={name} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{name}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={isCallMet ? "text-emerald-600 font-semibold" : "text-slate-700"}>{d.calls}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-400 text-xs">{callGoal}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={isAppoMet ? "text-emerald-600 font-semibold" : "text-slate-700"}>{d.appo}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-400 text-xs">{appoGoal}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            appoRate >= 10 ? "bg-emerald-100 text-emerald-700"
                            : appoRate >= 5 ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                          }`}>{appoRate}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCallMet ? "bg-emerald-500" : "bg-violet-500"}`}
                                style={{ width: `${callPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 w-8 shrink-0 text-right">{Math.round(callPct)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 業界傾向 ── */}
      {byIndustry.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3">業界傾向</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            {byIndustry.map(([ind, data], i) => {
              const appoRate = data.total > 0 ? (data.appo / data.total) * 100 : 0;
              const maxTotal = byIndustry[0][1].total;
              return (
                <div key={ind}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 w-4 shrink-0">{i + 1}</span>
                      <span className="text-sm text-slate-700 font-medium">{ind}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="text-slate-400">{data.total}件</span>
                      {data.appo > 0 && <span className="text-emerald-600 font-semibold">アポ {data.appo}件</span>}
                      <span className={`font-bold w-9 text-right ${
                        appoRate >= 10 ? "text-emerald-600"
                        : appoRate >= 5 ? "text-amber-600"
                        : "text-slate-400"
                      }`}>{Math.round(appoRate)}%</span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-slate-200 rounded-full"
                      style={{ width: `${(data.total / maxTotal) * 100}%` }}
                    />
                    {data.appo > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                        style={{ width: `${(data.appo / maxTotal) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-4 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-slate-200 inline-block" />コール数</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-emerald-500 inline-block" />アポ数</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 直近7日のトレンド ── */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">直近7日のトレンド</h2>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-end gap-3" style={{ height: "120px" }}>
            {last7Days.map(d => {
              const barH = maxDay > 0 ? Math.max((d.total / maxDay) * 88, d.total > 0 ? 8 : 0) : 0;
              const appoH = d.total > 0 ? (d.appo / d.total) * barH : 0;
              const restH = barH - appoH;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-400 h-4 flex items-center">{d.total || ""}</span>
                  <div className="w-full flex flex-col justify-end rounded-t-md overflow-hidden" style={{ height: "88px" }}>
                    {d.total > 0 ? (
                      <>
                        <div className="w-full bg-violet-400 rounded-t-md" style={{ height: `${restH}px` }} />
                        {appoH > 0 && <div className="w-full bg-emerald-500" style={{ height: `${appoH}px` }} />}
                      </>
                    ) : (
                      <div className="w-full bg-slate-100 rounded-t-md" style={{ height: "4px" }} />
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{d.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-violet-400 inline-block" />コール</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-emerald-500 inline-block" />アポ</span>
          </div>
        </div>
      </div>

      {/* ── 全期間 結果内訳 ── */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          全期間 結果内訳
          <span className="text-xs font-normal text-slate-400 ml-2">計{total}件</span>
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
          {RESULTS.filter(r => resultCounts[r] > 0).map(r => (
            <div key={r} className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium w-24 text-center shrink-0 ${RESULT_CONFIG[r].badge}`}>{r}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full ${RESULT_CONFIG[r].darkBg}`}
                  style={{ width: `${(resultCounts[r] / total) * 100}%` }} />
              </div>
              <span className="text-sm font-bold text-slate-800 w-8 text-right">{resultCounts[r]}</span>
              <span className="text-xs text-slate-400 w-10">{Math.round((resultCounts[r] / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
