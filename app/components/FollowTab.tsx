"use client";

import type { Company, CallList } from "../lib/types";
import { RESULT_CONFIG } from "../lib/types";

const FOLLOW_RESULTS = ["資料送付", "再コール", "担当者不在"] as const;

interface FollowItem {
  company: Company;
  list: CallList;
  urgency: "overdue" | "today" | "soon" | "unset";
}

interface Props {
  lists: CallList[];
  today: string;
  onOpen: (company: Company, list: CallList) => void;
}

function urgencyOrder(u: FollowItem["urgency"]) {
  return { overdue: 0, today: 1, soon: 2, unset: 3 }[u];
}

export default function FollowTab({ lists, today, onOpen }: Props) {
  // フォロー対象：資料送付・再コール・担当者不在 かつ（次回日が今日以前 OR 次回日未設定）
  const allItems: FollowItem[] = lists.flatMap((list) =>
    list.companies
      .filter((c) => c.latestResult && (FOLLOW_RESULTS as readonly string[]).includes(c.latestResult))
      .map((c) => {
        let urgency: FollowItem["urgency"] = "unset";
        if (c.nextDate) {
          if (c.nextDate < today) urgency = "overdue";
          else if (c.nextDate === today) urgency = "today";
          else urgency = "soon";
        }
        return { company: c, list, urgency };
      })
  );

  const overdueCount = allItems.filter((i) => i.urgency === "overdue").length;
  const todayCount   = allItems.filter((i) => i.urgency === "today").length;
  const unsetCount   = allItems.filter((i) => i.urgency === "unset").length;

  // リスト別にグループ化 → 各グループ内は期限順
  const grouped = lists
    .map((list) => ({
      list,
      items: allItems
        .filter((i) => i.list.id === list.id)
        .sort((a, b) => {
          const od = urgencyOrder(a.urgency) - urgencyOrder(b.urgency);
          if (od !== 0) return od;
          if (!a.company.nextDate) return 1;
          if (!b.company.nextDate) return -1;
          return a.company.nextDate.localeCompare(b.company.nextDate);
        }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <div className="text-xs text-slate-400 mb-1">フォロー合計</div>
          <div className="text-2xl font-bold text-slate-900">
            {allItems.length}<span className="text-sm font-normal text-slate-400 ml-1">件</span>
          </div>
        </div>
        <div className={`rounded-xl border px-5 py-4 ${overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
          <div className="text-xs text-slate-400 mb-1">期限超過</div>
          <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-slate-900"}`}>
            {overdueCount}<span className="text-sm font-normal text-slate-400 ml-1">件</span>
          </div>
        </div>
        <div className={`rounded-xl border px-5 py-4 ${todayCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
          <div className="text-xs text-slate-400 mb-1">本日が期日</div>
          <div className={`text-2xl font-bold ${todayCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
            {todayCount}<span className="text-sm font-normal text-slate-400 ml-1">件</span>
          </div>
        </div>
        <div className={`rounded-xl border px-5 py-4 ${unsetCount > 0 ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200"}`}>
          <div className="text-xs text-slate-400 mb-1">次回日未設定</div>
          <div className={`text-2xl font-bold ${unsetCount > 0 ? "text-slate-600" : "text-slate-900"}`}>
            {unsetCount}<span className="text-sm font-normal text-slate-400 ml-1">件</span>
          </div>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-24 text-center bg-white">
          <div className="text-3xl mb-3">✓</div>
          <p className="text-slate-400 text-base">フォローが必要な企業はありません</p>
          <p className="text-slate-300 text-sm mt-1">資料送付・再コール・担当者不在を記録すると自動でここに表示されます</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ list, items }) => (
            <div key={list.id}>
              {/* リストヘッダー */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-sm font-semibold text-slate-700">{list.name}</span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length}件</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400 bg-slate-50">
                      <th className="text-left px-4 py-2.5 font-medium">企業名</th>
                      <th className="text-left px-4 py-2.5 font-medium">次回連絡日</th>
                      <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">前回結果</th>
                      <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">担当</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ company: c, urgency }) => (
                      <tr
                        key={c.id}
                        className={`border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${
                          urgency === "overdue" ? "bg-red-50/40" : ""
                        }`}
                        onClick={() => onOpen(c, list)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{c.company}</div>
                          {c.industry && <div className="text-xs text-slate-400 mt-0.5">{c.industry}</div>}
                        </td>
                        <td className="px-4 py-3">
                          {c.nextDate ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              urgency === "overdue"
                                ? "bg-red-100 text-red-700"
                                : urgency === "today"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {urgency === "overdue" && "⚠ "}
                              {urgency === "today" && "今日 "}
                              {c.nextDate}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-400">
                              未設定
                            </span>
                          )}
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
                            onClick={(e) => { e.stopPropagation(); onOpen(c, list); }}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-all"
                          >
                            コール
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
