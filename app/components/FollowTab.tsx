"use client";

import type { Company, CallList } from "../lib/types";
import { RESULT_CONFIG } from "../lib/types";

interface Props {
  lists: CallList[];
  today: string;
  onOpen: (company: Company) => void;
}

export default function FollowTab({ lists, today, onOpen }: Props) {
  // 全リストから「次回連絡日が今日以前」の企業を抽出
  const followItems = lists
    .flatMap((l) =>
      l.companies
        .filter((c) => c.nextDate && c.nextDate <= today)
        .map((c) => ({ company: c, listName: l.industry || l.name }))
    )
    .sort((a, b) => a.company.nextDate.localeCompare(b.company.nextDate));

  const overdueCount = followItems.filter((item) => item.company.nextDate < today).length;
  const todayCount = followItems.filter((item) => item.company.nextDate === today).length;

  return (
    <div>
      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <div className="text-xs text-slate-400 mb-1">フォロー合計</div>
          <div className="text-2xl font-bold text-slate-900">{followItems.length}<span className="text-sm font-normal text-slate-400 ml-1">件</span></div>
        </div>
        <div className={`rounded-xl border px-5 py-4 ${todayCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
          <div className="text-xs text-slate-400 mb-1">本日が期日</div>
          <div className={`text-2xl font-bold ${todayCount > 0 ? "text-amber-600" : "text-slate-900"}`}>{todayCount}<span className="text-sm font-normal text-slate-400 ml-1">件</span></div>
        </div>
        <div className={`rounded-xl border px-5 py-4 ${overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
          <div className="text-xs text-slate-400 mb-1">期限超過</div>
          <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-slate-900"}`}>{overdueCount}<span className="text-sm font-normal text-slate-400 ml-1">件</span></div>
        </div>
      </div>

      {followItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-24 text-center bg-white">
          <div className="text-3xl mb-3">✓</div>
          <p className="text-slate-400 text-base">フォローが必要な企業はありません</p>
          <p className="text-slate-300 text-sm mt-1">再コール・資料送付を記録すると自動でここに表示されます</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="text-left px-4 py-3 font-medium">企業名</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">リスト</th>
                <th className="text-left px-4 py-3 font-medium">次回連絡日</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">前回結果</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">担当</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {followItems.map(({ company: c, listName }) => {
                const isOverdue = c.nextDate < today;
                const isToday = c.nextDate === today;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onOpen(c)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.company}</div>
                      {c.industry && <div className="text-xs text-slate-400 mt-0.5">{c.industry}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">{listName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isOverdue
                          ? "bg-red-100 text-red-700"
                          : isToday
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {isOverdue && "⚠ "}
                        {isToday && "今日 "}
                        {c.nextDate}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {c.latestResult ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${RESULT_CONFIG[c.latestResult].badge}`}>
                          {c.latestResult}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">{c.assignee || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpen(c); }}
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        コール
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
