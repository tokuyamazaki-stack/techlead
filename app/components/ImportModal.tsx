"use client";

import { useState } from "react";
import type { Company } from "../lib/types";

interface Props {
  onImport: (name: string, companies: Company[]) => void;
  onClose: () => void;
}

export default function ImportModal({ onImport, onClose }: Props) {
  const [listName, setListName] = useState("");
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
        revenue: "",
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
    const name = listName.trim() || `リスト ${new Date().toLocaleDateString("ja-JP")}`;
    onImport(name, preview);
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}>
      <div className="bg-[#16161a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>

        {/* ヘッダー */}
        <div className="flex items-start justify-between px-7 pt-7 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold">コールリストを取込</h2>
            <p className="text-xs text-white/40 mt-1">SansanのリストをコピーしてAIが自動で解析します</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xl leading-none">✕</button>
        </div>

        {/* スクロール可能エリア */}
        <div className="overflow-y-auto flex-1 px-7">

          {/* リスト名 */}
          <div className="mb-4">
            <label className="text-xs text-white/40 mb-1.5 block">リスト名（例：製造業・大手、IT・中小企業）</label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="例：製造業 300億以上"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* 取込手順 */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-4 text-xs text-white/50 space-y-1">
            <p className="text-white/70 font-medium mb-2">取込手順</p>
            <p>① Sansanの企業リスト画面を開く</p>
            <p>② ページ上で Ctrl+A（全選択）→ Ctrl+C（コピー）</p>
            <p>③ 下のテキストエリアに貼り付け（Ctrl+V）</p>
            <p>④「AIで解析」ボタンを押す ※AIが自動で企業だけ抽出します</p>
          </div>

          {/* テキストエリア */}
          <textarea
            className="w-full h-40 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 transition-colors resize-none font-mono mb-3"
            placeholder="ここにSansanのデータを貼り付けてください..."
            value={text}
            onChange={(e) => { setText(e.target.value); setPreview([]); setError(""); }}
          />

          {error && (
            <div className="mb-3 px-4 py-2.5 bg-red-900/30 border border-red-700/30 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          {preview.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-white/50">解析結果：</span>
                <span className="text-sm font-bold text-emerald-400">{preview.length}件</span>
              </div>
              <div className="rounded-xl border border-white/10 overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#1a1a1f]">
                    <tr className="text-white/40">
                      <th className="text-left px-4 py-2">会社名</th>
                      <th className="text-left px-4 py-2">電話番号</th>
                      <th className="text-left px-4 py-2">業種</th>
                      <th className="text-left px-4 py-2">従業員数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((c, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-4 py-2 text-white/80 font-medium">{c.company}</td>
                        <td className="px-4 py-2 text-white/50 font-mono text-[11px]">{c.phone || "—"}</td>
                        <td className="px-4 py-2 text-white/50">{c.industry || "—"}</td>
                        <td className="px-4 py-2 text-white/40">{c.employees || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ボタン */}
        <div className="flex gap-3 px-7 py-5 border-t border-white/5 shrink-0">
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
              {preview.length}件を「{listName.trim() || "新しいリスト"}」に追加
            </button>
          )}
          <button onClick={onClose}
            className="px-5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl py-3 text-sm transition-all">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
