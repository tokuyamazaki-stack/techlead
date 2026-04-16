"use client";

import { useState, useMemo } from "react";
import type { Company, UserSettings, FormFieldType } from "../lib/types";
import { RESULTS, RESULT_CONFIG } from "../lib/types";
import { today } from "../lib/parser";

interface Props {
  companies: Company[];
  userSettings: UserSettings;
}

export default function DailyReport({ companies, userSettings }: Props) {
  const reportFormUrl = userSettings.reportFormUrl;
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

  function openReportForm() {
    if (!reportFormUrl) return;
    const fields = userSettings.reportFormFields;
    if (!fields || fields.length === 0) {
      window.open(reportFormUrl, "_blank");
      return;
    }

    // 入力する値のマップ
    const dateStr = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "/");
    const ngTotal = (resultCounts["担当NG"] || 0) + (resultCounts["受付NG"] || 0);
    const appoRate = totalCalls > 0 ? Math.round((appo / totalCalls) * 100) : 0;

    const valueMap: Record<FormFieldType, string> = {
      none:       "",
      date:       dateStr,
      assignee:   userSettings.name || "",
      totalCalls: String(totalCalls),
      appo:       String(appo),
      material:   String(resultCounts["資料送付"] || 0),
      recall:     String(resultCounts["再コール"] || 0),
      absent:     String(resultCounts["担当者不在"] || 0),
      ngTotal:    String(ngTotal),
      appoRate:   String(appoRate),
    };

    try {
      const url = new URL(reportFormUrl);
      const now = new Date();
      fields.forEach(f => {
        if (f.dataType === "none") return;
        // 日付フィールドは年・月・日を別パラメータで渡す
        if (f.dataType === "date") {
          url.searchParams.set(f.entryId + "_year",  String(now.getFullYear()));
          url.searchParams.set(f.entryId + "_month", String(now.getMonth() + 1));
          url.searchParams.set(f.entryId + "_day",   String(now.getDate()));
          return;
        }
        const value = valueMap[f.dataType];
        if (value !== undefined && value !== "") url.searchParams.set(f.entryId, value);
      });
      window.open(url.toString(), "_blank");
    } catch {
      window.open(reportFormUrl, "_blank");
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{totalCalls}</div>
          <div className="text-xs text-slate-500 mt-1">本日の総コール数</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="text-3xl font-bold text-emerald-600">{appo}</div>
          <div className="text-xs text-slate-500 mt-1">アポ獲得</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">
            {totalCalls > 0 ? Math.round((appo / totalCalls) * 100) : 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">アポ率</div>
        </div>
      </div>

      {/* Result breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold mb-4 text-slate-700">結果内訳</h3>
        {totalCalls === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">
            今日の記録がまだありません。<br/>コールリストから結果を記録してください。
          </p>
        ) : (
          <div className="space-y-3">
            {RESULTS.filter((r) => resultCounts[r] > 0).map((r) => (
              <div key={r} className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium w-24 text-center ${RESULT_CONFIG[r].badge}`}>
                  {r}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${RESULT_CONFIG[r].darkBg}`}
                    style={{ width: `${(resultCounts[r] / totalCalls) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-800 w-8 text-right">{resultCounts[r]}</span>
                <span className="text-xs text-slate-400 w-10">
                  {Math.round((resultCounts[r] / totalCalls) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By assignee */}
      {Object.keys(byAssignee).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-slate-700">担当者別</h3>
          <div className="space-y-3">
            {Object.entries(byAssignee).map(([name, data]) => (
              <div key={name} className="flex items-center gap-4">
                <span className="text-sm text-slate-800 w-20 shrink-0">{name}</span>
                <span className="text-xl font-bold text-slate-900 w-10 shrink-0">{data.total}</span>
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
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-slate-700">本日のコール一覧</h3>
          <div className="space-y-2">
            {todayRecords.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${RESULT_CONFIG[r.result].badge}`}>
                  {r.result}
                </span>
                <span className="text-slate-800 font-medium">{r.companyName}</span>
                {r.industry && <span className="text-slate-400 text-xs">{r.industry}</span>}
                {r.memo && <span className="text-slate-500 text-xs truncate">{r.memo}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Googleフォームボタン */}
      {reportFormUrl && (
        <button
          onClick={openReportForm}
          className="flex items-center justify-center gap-2 w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-700 rounded-xl py-4 text-sm font-semibold transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
          </svg>
          {userSettings.reportFormFields && userSettings.reportFormFields.filter(f => f.dataType !== "none").length > 0
            ? "Googleフォームに自動入力して開く"
            : "Googleフォームで日報を記入する"
          }
          <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </button>
      )}

      {/* Memo + export */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold mb-3 text-slate-700">所感・メモ（任意）</h3>
        <textarea
          value={reportMemo}
          onChange={(e) => setReportMemo(e.target.value)}
          rows={3}
          placeholder="今日の気づき、明日への改善点など..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors resize-none mb-4"
        />
        <button
          onClick={copyToClipboard}
          disabled={totalCalls === 0}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-all"
        >
          {copied ? "✓ コピーしました！" : "日報テキストをコピー"}
        </button>
        {totalCalls === 0 && (
          <p className="text-xs text-slate-400 text-center mt-2">コールを記録すると日報が生成されます</p>
        )}
      </div>
    </div>
  );
}
