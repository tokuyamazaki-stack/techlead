"use client";

import { useState, useMemo } from "react";
import type { Company } from "../lib/types";
import { RESULTS, RESULT_CONFIG } from "../lib/types";
import { today } from "../lib/parser";

interface Props {
  companies: Company[];
}

export default function DailyReport({ companies }: Props) {
  const [reportMemo, setReportMemo] = useState("");
  const [copied, setCopied] = useState(false);
  const t = today();

  // 今日コールした結果を全社から集計
  const todayRecords = useMemo(() => {
    return companies.flatMap((c) =>
      c.callHistory
        .filter((h) => h.date === t)
        .map((h) => ({ ...h, companyName: c.company, industry: c.industry }))
    );
  }, [companies, t]);

  const resultCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    RESULTS.forEach((r) => (counts[r] = 0));
    todayRecords.forEach((r) => {
      counts[r.result] = (counts[r.result] || 0) + 1;
    });
    return counts;
  }, [todayRecords]);

  // 担当者別集計
  const byAssignee = useMemo(() => {
    const map: Record<string, { total: number; counts: Record<string, number> }> = {};
    todayRecords.forEach((r) => {
      const name = r.assignee || "未設定";
      if (!map[name]) map[name] = { total: 0, counts: {} };
      map[name].total++;
      map[name].counts[r.result] = (map[name].counts[r.result] || 0) + 1;
    });
    return map;
  }, [todayRecords]);

  const totalCalls = todayRecords.length;
  const appo = resultCounts["アポ獲得"] || 0;

  function generateText() {
    const dateStr = new Date().toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric",
    });

    const resultLines = RESULTS.filter((r) => resultCounts[r] > 0)
      .map((r) => `  ${r}：${resultCounts[r]}件`)
      .join("\n");

    const assigneeLines = Object.entries(byAssignee)
      .map(([name, data]) => {
        const detail = RESULTS.filter((r) => data.counts[r])
          .map((r) => `${r}${data.counts[r]}`)
          .join("・");
        return `  ${name}：${data.total}件（${detail}）`;
      })
      .join("\n");

    const companyLines = todayRecords
      .filter((r) => r.result === "アポ獲得")
      .map((r) => `  ・${r.companyName}`)
      .join("\n");

    return `【日報】${dateStr}

■ コール結果
総コール数：${totalCalls}件
${resultLines}

■ 担当者別
${assigneeLines || "  データなし"}
${companyLines ? `\n■ アポ獲得企業\n${companyLines}` : ""}
${reportMemo ? `\n■ 所感・メモ\n${reportMemo}` : ""}`.trim();
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generateText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
          <div className="text-3xl font-bold">{totalCalls}</div>
          <div className="text-xs text-white/40 mt-1">本日の総コール数</div>
        </div>
        <div className="bg-emerald-900/30 border border-emerald-800/30 rounded-xl p-5">
          <div className="text-3xl font-bold text-emerald-400">{appo}</div>
          <div className="text-xs text-white/40 mt-1">アポ獲得</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
          <div className="text-3xl font-bold">
            {totalCalls > 0 ? Math.round((appo / totalCalls) * 100) : 0}%
          </div>
          <div className="text-xs text-white/40 mt-1">アポ率</div>
        </div>
      </div>

      {/* Result breakdown */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 text-white/70">結果内訳</h3>
        {totalCalls === 0 ? (
          <p className="text-white/20 text-sm text-center py-4">
            今日の記録がまだありません。<br/>コールリストから結果を記録してください。
          </p>
        ) : (
          <div className="space-y-3">
            {RESULTS.filter((r) => resultCounts[r] > 0).map((r) => (
              <div key={r} className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium w-24 text-center ${RESULT_CONFIG[r].badge}`}>
                  {r}
                </span>
                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${RESULT_CONFIG[r].darkBg}`}
                    style={{ width: `${(resultCounts[r] / totalCalls) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold w-8 text-right">{resultCounts[r]}</span>
                <span className="text-xs text-white/30 w-10">
                  {Math.round((resultCounts[r] / totalCalls) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By assignee */}
      {Object.keys(byAssignee).length > 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-white/70">担当者別</h3>
          <div className="space-y-3">
            {Object.entries(byAssignee).map(([name, data]) => (
              <div key={name} className="flex items-center gap-4">
                <span className="text-sm text-white/80 w-20 shrink-0">{name}</span>
                <span className="text-xl font-bold w-10 shrink-0">{data.total}</span>
                <div className="flex gap-1.5 flex-wrap">
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
      )}

      {/* Today's call list */}
      {todayRecords.length > 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-white/70">本日のコール一覧</h3>
          <div className="space-y-2">
            {todayRecords.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${RESULT_CONFIG[r.result].badge}`}>
                  {r.result}
                </span>
                <span className="text-white/80 font-medium">{r.companyName}</span>
                {r.industry && <span className="text-white/30 text-xs">{r.industry}</span>}
                {r.memo && <span className="text-white/40 text-xs truncate">{r.memo}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memo + export */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-3 text-white/70">所感・メモ（任意）</h3>
        <textarea
          value={reportMemo}
          onChange={(e) => setReportMemo(e.target.value)}
          rows={3}
          placeholder="今日の気づき、明日への改善点など..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 transition-colors resize-none mb-4"
        />
        <button
          onClick={copyToClipboard}
          disabled={totalCalls === 0}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-all"
        >
          {copied ? "✓ コピーしました！" : "日報テキストをコピー"}
        </button>
        {totalCalls === 0 && (
          <p className="text-xs text-white/30 text-center mt-2">コールを記録すると日報が生成されます</p>
        )}
      </div>
    </div>
  );
}
