"use client";

import { useMemo } from "react";
import type { Company } from "../lib/types";
import { RESULTS, RESULT_CONFIG } from "../lib/types";

interface Props {
  companies: Company[];
}

export default function Analytics({ companies }: Props) {
  const allRecords = useMemo(() =>
    companies.flatMap((c) =>
      c.callHistory.map((h) => ({ ...h, industry: c.industry, companyName: c.company }))
    ), [companies]);

  const total = allRecords.length;

  // 結果別集計
  const resultCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    RESULTS.forEach((r) => (counts[r] = 0));
    allRecords.forEach((r) => { counts[r.result] = (counts[r.result] || 0) + 1; });
    return counts;
  }, [allRecords]);

  // 業種別集計
  const byIndustry = useMemo(() => {
    const map: Record<string, { total: number; appo: number }> = {};
    allRecords.forEach((r) => {
      const ind = r.industry || "不明";
      if (!map[ind]) map[ind] = { total: 0, appo: 0 };
      map[ind].total++;
      if (r.result === "アポ獲得") map[ind].appo++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);
  }, [allRecords]);

  // 担当者別集計
  const byAssignee = useMemo(() => {
    const map: Record<string, { total: number; counts: Record<string, number> }> = {};
    allRecords.forEach((r) => {
      const name = r.assignee || "未設定";
      if (!map[name]) map[name] = { total: 0, counts: {} };
      map[name].total++;
      map[name].counts[r.result] = (map[name].counts[r.result] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [allRecords]);

  // 直近7日のトレンド
  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days.map((date) => ({
      date,
      label: new Date(date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
      total: allRecords.filter((r) => r.date === date).length,
      appo: allRecords.filter((r) => r.date === date && r.result === "アポ獲得").length,
    }));
  }, [allRecords]);

  const maxDay = Math.max(...last7Days.map((d) => d.total), 1);

  if (total === 0) {
    return (
      <div className="text-center py-20 text-white/20">
        <p className="text-lg">まだデータがありません</p>
        <p className="text-sm mt-2">コールを記録すると分析が表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "総コール数", value: total, sub: "" },
          { label: "アポ獲得", value: resultCounts["アポ獲得"], sub: `${total > 0 ? Math.round((resultCounts["アポ獲得"] / total) * 100) : 0}%` },
          { label: "資料送付", value: resultCounts["資料送付"], sub: "" },
          { label: "NG合計", value: (resultCounts["担当NG"] || 0) + (resultCounts["受付NG"] || 0), sub: "" },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
            <div className="text-3xl font-bold">{s.value}</div>
            {s.sub && <div className="text-sm text-violet-400 font-semibold">{s.sub}</div>}
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trend (7 days) */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-5 text-white/70">直近7日のコール推移</h3>
        <div className="flex items-end gap-2 h-32">
          {last7Days.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-white/40">{d.total || ""}</span>
              <div className="w-full flex flex-col gap-0.5" style={{ height: "80px" }}>
                <div
                  className="w-full bg-violet-700 rounded-t transition-all"
                  style={{ height: `${(d.total / maxDay) * 80}px` }}
                />
              </div>
              <span className="text-xs text-white/30">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Result breakdown */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 text-white/70">結果別内訳（累計）</h3>
        <div className="space-y-3">
          {RESULTS.filter((r) => resultCounts[r] > 0).map((r) => (
            <div key={r} className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium w-24 text-center shrink-0 ${RESULT_CONFIG[r].badge}`}>
                {r}
              </span>
              <div className="flex-1 bg-white/5 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${RESULT_CONFIG[r].darkBg}`}
                  style={{ width: `${(resultCounts[r] / total) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold w-8 text-right">{resultCounts[r]}</span>
              <span className="text-xs text-white/30 w-10">
                {Math.round((resultCounts[r] / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* By industry */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-white/70">業種別アポ率</h3>
          <div className="space-y-3">
            {byIndustry.map(([ind, data]) => (
              <div key={ind}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/70 truncate">{ind}</span>
                  <span className="text-xs text-white/40 shrink-0 ml-2">
                    {data.total}件 / アポ{data.appo}
                  </span>
                </div>
                <div className="bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${data.total > 0 ? (data.appo / data.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By assignee */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-white/70">担当者別成績</h3>
          <div className="space-y-4">
            {byAssignee.map(([name, data]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-xs text-white/40">{data.total}件</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {RESULTS.filter((r) => data.counts[r]).map((r) => (
                    <span key={r} className={`px-2 py-0.5 rounded-full text-xs ${RESULT_CONFIG[r].badge}`}>
                      {r} {data.counts[r]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
