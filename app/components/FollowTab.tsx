"use client";

import { useState } from "react";
import type { Company, CallList } from "../lib/types";
import { RESULT_CONFIG } from "../lib/types";

const FOLLOW_RESULTS = ["資料送付", "再コール", "担当者不在"] as const;

interface FollowItem {
  company: Company;
  urgency: "overdue" | "today" | "soon" | "unset";
}

interface Props {
  lists: CallList[];
  today: string;
  onOpen: (company: Company, list: CallList, allItems: Array<{company: Company, list: CallList}>) => void;
}

function urgencyOrder(u: FollowItem["urgency"]) {
  return { overdue: 0, today: 1, soon: 2, unset: 3 }[u];
}

export default function FollowTab({ lists, today, onOpen }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allFollowItems: Array<{company: Company, list: CallList}> = [];

  const grouped = lists.map((list) => {
    const items: FollowItem[] = list.companies
      .filter((c) => c.latestResult && (FOLLOW_RESULTS as readonly string[]).includes(c.latestResult))
      .filter((c) => !c.nextDate || c.nextDate <= today)
      .map((c) => {
        let urgency: FollowItem["urgency"] = "unset";
        if (c.nextDate) {
          if (c.nextDate < today) urgency = "overdue";
          else if (c.nextDate === today) urgency = "today";
          else urgency = "soon";
        }
        return { company: c, urgency };
      })
      .sort((a, b) => {
        const od = urgencyOrder(a.urgency) - urgencyOrder(b.urgency);
        if (od !== 0) return od;
        if (!a.company.nextDate) return 1;
        if (!b.company.nextDate) return -1;
        return a.company.nextDate.localeCompare(b.company.nextDate);
      });
    return { list, items };
  }).filter((g) => g.items.length > 0);

  grouped.forEach(({ list, items }) => {
    items.forEach(({ company }) => allFollowItems.push({ company, list }));
  });

  const totalFollow  = grouped.reduce((s, g) => s + g.items.length, 0);
  const totalOverdue = grouped.reduce((s, g) => s + g.items.filter((i) => i.urgency === "overdue").length, 0);
  const totalToday   = grouped.reduce((s, g) => s + g.items.filter((i) => i.urgency === "today").length, 0);
  const totalUnset   = grouped.reduce((s, g) => s + g.items.filter((i) => i.urgency === "unset").length, 0);

  return (
    <div>
      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#12141f] rounded-xl border border-white/8 px-5 py-4">
          <div className="text-xs text-slate-500 mb-1">フォロー合計</div>
          <div className="text-2xl font-bold text-slate-100">{totalFollow}<span className="text-sm font-normal text-slate-500 ml-1">件</span></div>
        </div>
        <div className={`rounded-xl border px-5 py-4 ${totalOverdue > 0 ? "bg-red-500/10 border-red-500/30" : "bg-[#12141f] border-white/8"}`}>
          <div className="text-xs text-slate-500 mb-1">期限超過</div>
          <div className={`text-2xl font-bold ${totalOverdue > 0 ? "text-red-400" : "text-slate-100"}`}>{totalOverdue}<span className="text-sm font-normal text-slate-500 ml-1">件</span></div>
        </div>
        <div className={`rounded-xl border px-5 py-4 ${totalToday > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-[#12141f] border-white/8"}`}>
          <div className="text-xs text-slate-500 mb-1">本日が期日</div>
          <div className={`text-2xl font-bold ${totalToday > 0 ? "text-amber-400" : "text-slate-100"}`}>{totalToday}<span className="text-sm font-normal text-slate-500 ml-1">件</span></div>
        </div>
        <div className={`rounded-xl border px-5 py-4 ${totalUnset > 0 ? "bg-white/5 border-white/12" : "bg-[#12141f] border-white/8"}`}>
          <div className="text-xs text-slate-500 mb-1">次回日未設定</div>
          <div className={`text-2xl font-bold ${totalUnset > 0 ? "text-slate-300" : "text-slate-100"}`}>{totalUnset}<span className="text-sm font-normal text-slate-500 ml-1">件</span></div>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-24 text-center bg-[#12141f]">
          <div className="text-3xl mb-3">✓</div>
          <p className="text-slate-400 text-base">フォローが必要な企業はありません</p>
          <p className="text-slate-600 text-sm mt-1">資料送付・再コール・担当者不在を記録すると自動でここに表示されます</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ list, items }) => {
            const isOpen = openIds.has(list.id);
            const overdue = items.filter((i) => i.urgency === "overdue").length;
            const todayCnt = items.filter((i) => i.urgency === "today").length;
            const unset = items.filter((i) => i.urgency === "unset").length;

            return (
              <div key={list.id} className="bg-[#12141f] rounded-xl border border-white/8 overflow-hidden">
                {/* アコーディオンヘッダー */}
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/4 transition-colors text-left"
                  onClick={() => toggle(list.id)}
                >
                  <span className="text-sm font-semibold text-slate-200 flex-1">{list.name}</span>

                  {/* バッジ */}
                  <div className="flex items-center gap-2 shrink-0">
                    {overdue > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        ⚠ 超過 {overdue}
                      </span>
                    )}
                    {todayCnt > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        今日 {todayCnt}
                      </span>
                    )}
                    {unset > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                        未設定 {unset}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {items.length}件
                    </span>
                    <span className={`text-slate-400 text-sm transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
                  </div>
                </button>

                {/* 展開時テーブル */}
                {isOpen && (
                  <div className="border-t border-white/6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500 bg-white/3 border-b border-white/6">
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
                            className={`border-b border-white/4 hover:bg-white/4 transition-colors cursor-pointer last:border-none ${
                              urgency === "overdue" ? "bg-red-500/5" : ""
                            }`}
                            onClick={() => onOpen(c, list, allFollowItems)}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-200">{c.company}</div>
                              {c.industry && <div className="text-xs text-slate-500 mt-0.5">{c.industry}</div>}
                            </td>
                            <td className="px-4 py-3">
                              {c.nextDate ? (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  urgency === "overdue" ? "bg-red-500/20 text-red-400"
                                  : urgency === "today" ? "bg-amber-500/20 text-amber-400"
                                  : "bg-white/8 text-slate-400"
                                }`}>
                                  {urgency === "overdue" && "⚠ "}
                                  {urgency === "today" && "今日 "}
                                  {c.nextDate}
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/6 text-slate-500">未設定</span>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              {c.latestResult ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${RESULT_CONFIG[c.latestResult].badge}`}>
                                  {c.latestResult}
                                </span>
                              ) : <span className="text-slate-600 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{c.assignee || "—"}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={(e) => { e.stopPropagation(); onOpen(c, list, allFollowItems); }}
                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-violet-600/30"
                              >
                                コール
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
