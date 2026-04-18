"use client";

import { useState, useMemo } from "react";
import type { CallList, Company } from "../lib/types";
import { RESULTS } from "../lib/types";

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
}

export default function StrategyTab({ lists, companies }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"overall" | "list">("overall");

  const allRecords = useMemo(() =>
    companies.flatMap((c) => c.callHistory.map((h) => ({ ...h }))),
    [companies]
  );

  async function runAnalysis() {
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult(null);

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
        setAnalysisMode("overall");
      }
    } catch {
      setAnalysisError("通信エラーが発生しました");
    } finally {
      setAnalyzing(false);
    }
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
    <div className="space-y-6">

      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-base font-semibold text-slate-800">AI戦略分析</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              リストごとの継続・廃棄判断と次のSansan条件をAIが提案します。<br />
              コールデータが多いほど精度が上がります。
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shrink-0 ml-4"
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

        {/* データ概要（分析前の参考情報） */}
        {!analysisResult && !analyzing && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-violet-100">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-800">{lists.length}</div>
              <div className="text-[11px] text-slate-400">リスト数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-slate-800">{companies.length}</div>
              <div className="text-[11px] text-slate-400">総企業数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-slate-800">{allRecords.length}</div>
              <div className="text-[11px] text-slate-400">総コール数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-violet-600">
                {allRecords.length > 0
                  ? `${((allRecords.filter(r => r.result === "アポ獲得").length / allRecords.length) * 100).toFixed(1)}%`
                  : "—"}
              </div>
              <div className="text-[11px] text-slate-400">全体アポ率</div>
            </div>
          </div>
        )}

        {analysisError && (
          <div className="text-xs text-red-500 bg-red-50 rounded-lg px-4 py-3 mt-3">{analysisError}</div>
        )}
      </div>

      {/* 分析結果 */}
      {analysisResult && (
        <div className="space-y-4">

          {/* モード切替 */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
            {([["overall", "全体分析"], ["list", "リスト別"]] as const).map(([mode, label]) => (
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

          {/* ===== 全体分析 ===== */}
          {analysisMode === "overall" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border border-violet-100 shadow-sm">
                <div className="text-xs text-violet-500 font-semibold mb-2">全体診断</div>
                <p className="text-sm text-slate-700 leading-relaxed">{analysisResult.overall_diagnosis}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisResult.best_list && (
                  <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-sm">
                    <div className="text-xs text-emerald-600 font-semibold mb-2">最も効果的なリスト</div>
                    <p className="text-sm font-semibold text-slate-800 mb-1">{analysisResult.best_list.name}</p>
                    <p className="text-xs text-slate-500 mb-3">{analysisResult.best_list.reason}</p>
                    <div className="bg-emerald-50 rounded-lg px-3 py-2 text-xs text-slate-700">
                      <span className="text-emerald-600 font-semibold">横展開：</span> {analysisResult.best_list.replicate}
                    </div>
                  </div>
                )}
                {analysisResult.ng_pattern_insight && (
                  <div className="bg-white rounded-xl p-5 border border-amber-100 shadow-sm">
                    <div className="text-xs text-amber-600 font-semibold mb-2">NG理由から見えること</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{analysisResult.ng_pattern_insight}</p>
                  </div>
                )}
              </div>

              {analysisResult.priority_actions?.length > 0 && (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
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
            </div>
          )}

          {/* ===== リスト別分析 ===== */}
          {analysisMode === "list" && analysisResult.list_analyses?.length > 0 && (
            <div className="space-y-3">
              {analysisResult.list_analyses.map((la, i) => {
                const v = verdictLabel[la.verdict] ?? { label: la.verdict, style: "bg-slate-100 text-slate-500" };
                const g = gradeStyle[la.grade] ?? "bg-slate-100 text-slate-500 border-slate-200";
                return (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                      <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg border ${g}`}>{la.grade}</span>
                      <span className="font-semibold text-slate-800 text-sm flex-1">{la.list_name}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${v.style}`}>{v.label}</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="text-sm font-medium text-slate-700">{la.headline}</p>
                      <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">{la.numbers}</div>
                      <div>
                        <span className="text-[11px] text-amber-600 font-semibold">ボトルネック：</span>
                        <span className="text-xs text-slate-600 ml-1">{la.bottleneck}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold">判断根拠：</span>
                        <span className="text-xs text-slate-500 ml-1">{la.verdict_reason}</span>
                      </div>
                      <div className="bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-100">
                        <div className="text-[11px] text-blue-600 font-semibold mb-1">次のSansan絞り条件</div>
                        <p className="text-xs text-slate-700 leading-relaxed">{la.next_sansan}</p>
                      </div>
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
          )}

        </div>
      )}
    </div>
  );
}
