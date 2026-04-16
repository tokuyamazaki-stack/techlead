"use client";

import { useState } from "react";
import type { Company, CallList } from "../lib/types";

interface Props {
  onImport: (meta: Omit<CallList, "id" | "companies" | "createdAt">, companies: Company[]) => void;
  onClose: () => void;
  appendMode?: boolean;
  appendListName?: string;
  onAppend?: (companies: Company[]) => void;
}

export default function ImportModal({ onImport, onClose, appendMode, appendListName, onAppend }: Props) {
  const [listName, setListName] = useState("");
  const [industry, setIndustry] = useState("");
  const [fiscalMonthFrom, setFiscalMonthFrom] = useState("");
  const [fiscalMonthTo, setFiscalMonthTo] = useState("");
  const [revenueFrom, setRevenueFrom] = useState("");
  const [revenueTo, setRevenueTo] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Company[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!text.trim()) return;
    setError("");
    setPreview([]);
    setLoading(true);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "解析に失敗しました");
        return;
      }

      const companies: Company[] = data.companies.map((c: Record<string, string>, i: number) => ({
        id: `${Date.now()}-${i}`,
        company: c.company || "",
        phone: c.phone || "",
        address: c.address || "",
        industry: c.industry || "",
        subIndustry: c.subIndustry || "",
        employees: c.employees || "",
        revenue: c.revenue || "",
        contactName: "",
        directPhone: "",
        contactEmail: "",
        assignee: "",
        latestResult: null,
        nextDate: "",
        callHistory: [],
        importedAt: new Date().toISOString(),
      }));

      if (companies.length === 0) {
        setError("企業データが見つかりませんでした。もう一度コピーし直してみてください。");
        return;
      }

      setPreview(companies);
    } catch {
      setError("通信エラーが発生しました。インターネット接続を確認してください。");
    } finally {
      setLoading(false);
    }
  }

  function doImport() {
    if (preview.length === 0) return;
    if (appendMode && onAppend) {
      onAppend(preview);
    } else {
      const name = listName.trim() || `リスト ${new Date().toLocaleDateString("ja-JP")}`;
      onImport({ name, industry, fiscalMonthFrom, fiscalMonthTo, revenueFrom, revenueTo }, preview);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>

        {/* ヘッダー */}
        <div className="flex items-start justify-between px-7 pt-7 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {appendMode ? `「${appendListName}」に企業を追加` : "コールリストを取込"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">SansanのリストをコピーしてAIが自動で解析します</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
        </div>

        {/* スクロール可能エリア */}
        <div className="overflow-y-auto flex-1 px-7">

          {/* リスト名・メタデータ（新規作成時のみ） */}
          {!appendMode && (
            <>
              <div className="mb-4">
                <label className="text-xs text-slate-500 mb-1.5 block">リスト名（任意）</label>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="例：不動産仲介 大手"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4 space-y-3">
                <p className="text-xs text-slate-600 font-medium">Sansanの絞り込み条件（任意）</p>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">業界</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="例：不動産仲介"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">決算月</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number" min={1} max={12}
                        value={fiscalMonthFrom}
                        onChange={(e) => setFiscalMonthFrom(e.target.value)}
                        placeholder="3"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">月</span>
                    </div>
                    <span className="text-slate-400 text-xs shrink-0">〜</span>
                    <div className="flex-1 relative">
                      <input
                        type="number" min={1} max={12}
                        value={fiscalMonthTo}
                        onChange={(e) => setFiscalMonthTo(e.target.value)}
                        placeholder="9"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">月</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">売上規模</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={revenueFrom}
                      onChange={(e) => setRevenueFrom(e.target.value)}
                      placeholder="10億"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                    <span className="text-slate-400 text-xs shrink-0">〜</span>
                    <input
                      type="text"
                      value={revenueTo}
                      onChange={(e) => setRevenueTo(e.target.value)}
                      placeholder="100億"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 取込手順 */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4 text-xs text-slate-500 space-y-1">
            <p className="text-slate-700 font-medium mb-2">取込手順</p>
            <p>① Sansanの企業リスト画面を開く</p>
            <p>② ページ上で Ctrl+A（全選択）→ Ctrl+C（コピー）</p>
            <p>③ 下のテキストエリアに貼り付け（Ctrl+V）</p>
            <p>④「AIで解析」ボタンを押す ※AIが自動で企業だけ抽出します</p>
          </div>

          {/* テキストエリア */}
          <textarea
            className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors resize-none font-mono mb-3"
            placeholder="ここにSansanのデータを貼り付けてください..."
            value={text}
            onChange={(e) => { setText(e.target.value); setPreview([]); setError(""); }}
          />

          {error && (
            <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}

          {preview.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-500">解析結果：</span>
                <span className="text-sm font-bold text-emerald-600">{preview.length}件</span>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-slate-500">
                      <th className="text-left px-4 py-2">会社名</th>
                      <th className="text-left px-4 py-2">電話番号</th>
                      <th className="text-left px-4 py-2">業種</th>
                      <th className="text-left px-4 py-2">従業員数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((c, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-800 font-medium">{c.company}</td>
                        <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">{c.phone || "—"}</td>
                        <td className="px-4 py-2 text-slate-500">{c.industry || "—"}</td>
                        <td className="px-4 py-2 text-slate-500">{c.employees || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ボタン */}
        <div className="flex gap-3 px-7 py-5 border-t border-slate-100 shrink-0">
          {preview.length === 0 ? (
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || loading}
              className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-all"
            >
              {loading ? "AIが解析中..." : "AIで解析"}
            </button>
          ) : (
            <button
              onClick={doImport}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl py-3 text-sm font-semibold transition-all"
            >
              {appendMode
                ? `${preview.length}件を「${appendListName}」に追加`
                : `${preview.length}件を「${listName.trim() || "新しいリスト"}」に追加`}
            </button>
          )}
          <button onClick={onClose}
            className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-3 text-sm transition-all">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
