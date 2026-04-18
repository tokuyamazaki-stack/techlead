"use client";

import { useState, useMemo } from "react";
import type { CallList } from "../lib/types";
import { RESULT_CONFIG } from "../lib/types";

interface Props {
  lists: CallList[];
  onSelectCompany: (companyId: string, listId: string) => void;
}

const FILTER_OPTIONS = ["すべて", "未コール", "アポ獲得", "資料送付", "再コール", "担当者不在", "担当NG", "受付NG"];

export default function ReviewTab({ lists, onSelectCompany }: Props) {
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("すべて");

  // 全リストの企業をフラットに展開し、最新コール情報を付加
  const allRows = useMemo(() => {
    return lists.flatMap((list) =>
      list.companies.map((company) => {
        // 最新コール履歴を日付順で取得
        const sortedHistory = [...company.callHistory].sort(
          (a, b) => b.date.localeCompare(a.date)
        );
        const latestCall = sortedHistory[0] ?? null;

        return {
          company,
          listId: list.id,
          listName: list.industry || list.name,
          latestCallDate: latestCall?.date ?? "",
          latestCallAssignee: latestCall?.assignee ?? "",
          callCount: company.callHistory.length,
        };
      })
    );
  }, [lists]);

  const filtered = useMemo(() => {
    return allRows
      .filter((row) => {
        const matchFilter =
          filterResult === "すべて" ||
          (filterResult === "未コール" && !row.company.latestResult) ||
          row.company.latestResult === filterResult;

        const matchSearch =
          !search ||
          row.company.company.includes(search) ||
          (row.company.industry || "").includes(search) ||
          (row.company.phone || "").includes(search) ||
          (row.company.assignee || "").includes(search) ||
          row.listName.includes(search);

        return matchFilter && matchSearch;
      })
      .sort((a, b) => {
        // 最新コール日の新しい順
        if (b.latestCallDate && a.latestCallDate) {
          return b.latestCallDate.localeCompare(a.latestCallDate);
        }
        if (b.latestCallDate) return 1;
        if (a.latestCallDate) return -1;
        return 0;
      });
  }, [allRows, filterResult, search]);

  const totalCount = allRows.length;
  const calledCount = allRows.filter((r) => r.company.latestResult).length;
  const appoCount = allRows.filter((r) => r.company.latestResult === "アポ獲得").length;
  const uncalledCount = allRows.filter((r) => !r.company.latestResult).length;

  return (
    <div>
      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "全企業（全リスト合計）", value: totalCount, highlight: false },
          { label: "コール済み", value: calledCount, highlight: false },
          { label: "未コール", value: uncalledCount, highlight: uncalledCount > 0 },
          { label: "アポ獲得（累計）", value: appoCount, highlight: appoCount > 0 },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl p-5 border shadow-sm ${
              s.highlight ? "bg-violet-50 border-violet-200" : "bg-white border-slate-200"
            }`}
          >
            <div className={`text-3xl font-bold ${s.highlight ? "text-violet-600" : "text-slate-900"}`}>
              {s.value}
            </div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* フィルター + 検索 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFilterResult(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterResult === f
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="会社名・リスト名・担当者で検索..."
            className="bg-white border border-slate-200 rounded-lg px-4 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all w-64"
          />
        </div>
      </div>

      <div className="text-xs text-slate-400 mb-2">
        {filtered.length}件 / 全{totalCount}件
      </div>

      {/* テーブル */}
      <div className="rounded-xl border border-slate-200 overflow-x-auto shadow-sm bg-white">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold">会社名</th>
              <th className="text-left px-4 py-3 font-semibold">リスト</th>
              <th className="text-left px-4 py-3 font-semibold">最新結果</th>
              <th className="text-left px-4 py-3 font-semibold">最終コール日</th>
              <th className="text-left px-4 py-3 font-semibold">担当者</th>
              <th className="text-left px-4 py-3 font-semibold">コール回数</th>
              <th className="text-left px-4 py-3 font-semibold">次回連絡日</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const { company } = row;
              return (
                <tr
                  key={company.id}
                  onClick={() => onSelectCompany(company.id, row.listId)}
                  className={`cursor-pointer border-t transition-colors border-slate-100 hover:bg-slate-50 ${
                    i % 2 !== 0 ? "bg-slate-50/40" : ""
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-slate-800">{company.company}</span>
                    {company.industry && (
                      <div className="text-[11px] text-slate-400">{company.industry}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {row.listName}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {company.latestResult ? (
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          RESULT_CONFIG[company.latestResult].badge
                        }`}
                      >
                        {company.latestResult}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">未コール</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {row.latestCallDate || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {row.latestCallAssignee || company.assignee || (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {row.callCount > 0 ? (
                      <span className="font-medium">{row.callCount}回</span>
                    ) : (
                      <span className="text-slate-300">0回</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">
                    {company.nextDate || <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                  条件に一致する企業がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
