"use client";

import { useState } from "react";
import type { Company, ResultType, CallRecord, TagConfig } from "../lib/types";
import { RESULTS, RESULT_CONFIG, DETAIL_RESULTS, DEFAULT_TAGS } from "../lib/types";
import { today } from "../lib/parser";

interface Props {
  company: Company;
  tagConfig: TagConfig;
  onSave: (updated: Company) => void;
  onUpdateTags: (updated: TagConfig) => void;
  onClose: () => void;
}

// タグ選択 + 追加・削除できるコンポーネント
function TagSelector({
  label,
  allTags,
  selected,
  onToggle,
  onAdd,
  onDelete,
}: {
  label: string;
  allTags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  onAdd: (tag: string) => void;
  onDelete: (tag: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");

  function submitAdd() {
    const t = newTag.trim();
    if (t && !allTags.includes(t)) {
      onAdd(t);
    }
    setNewTag("");
    setAdding(false);
  }

  return (
    <div className="mb-4">
      <label className="text-xs text-white/40 mb-2 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => {
          const isSelected = selected.includes(tag);
          return (
            <div key={tag} className="relative group/tag">
              <button
                onClick={() => onToggle(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-violet-600 text-white ring-1 ring-violet-400"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {tag}
              </button>
              {/* 削除ボタン（ホバーで表示） */}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(tag); }}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] items-center justify-center hidden group-hover/tag:flex leading-none"
              >
                ✕
              </button>
            </div>
          );
        })}

        {/* 追加ボタン */}
        {adding ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); if (e.key === "Escape") setAdding(false); }}
              placeholder="タグ名を入力..."
              className="bg-white/10 border border-violet-500 rounded-full px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none w-28"
            />
            <button onClick={submitAdd} className="text-xs text-violet-400 hover:text-violet-300 px-1">追加</button>
            <button onClick={() => setAdding(false)} className="text-xs text-white/30 hover:text-white/50 px-1">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-full text-xs text-white/30 border border-white/10 hover:border-white/30 hover:text-white/60 transition-all"
          >
            ＋ 追加
          </button>
        )}
      </div>
    </div>
  );
}

export default function ResultModal({ company, tagConfig, onSave, onUpdateTags, onClose }: Props) {
  const [selectedResult, setSelectedResult] = useState<ResultType | null>(company.latestResult ?? null);
  const [memo, setMemo] = useState("");
  const [assignee, setAssignee] = useState(company.assignee || "");
  const [nextDate, setNextDate] = useState(company.nextDate || "");

  // 担当者情報
  const [contactName, setContactName] = useState(company.contactName || "");
  const [directPhone, setDirectPhone] = useState(company.directPhone || "");
  const [contactEmail, setContactEmail] = useState(company.contactEmail || "");

  // タグ選択
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"call" | "info">("call");

  const showDetailTags = selectedResult && DETAIL_RESULTS.includes(selectedResult);

  function toggleTag(list: string[], setList: (v: string[]) => void, tag: string) {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  function addTag(category: keyof TagConfig, tag: string) {
    onUpdateTags({ ...tagConfig, [category]: [...tagConfig[category], tag] });
  }

  function deleteTag(category: keyof TagConfig, tag: string) {
    onUpdateTags({ ...tagConfig, [category]: tagConfig[category].filter((t) => t !== tag) });
    // 選択中なら解除
    if (category === "products") setSelectedProducts((p) => p.filter((t) => t !== tag));
    if (category === "challenges") setSelectedChallenges((p) => p.filter((t) => t !== tag));
    if (category === "interests") setSelectedInterests((p) => p.filter((t) => t !== tag));
  }

  function logResult() {
    if (!selectedResult) return;

    const record: CallRecord = {
      id: `${Date.now()}`,
      date: today(),
      result: selectedResult,
      memo,
      assignee,
      products: selectedProducts,
      challenges: selectedChallenges,
      interests: selectedInterests,
    };

    const updated: Company = {
      ...company,
      latestResult: selectedResult,
      assignee,
      nextDate,
      contactName,
      directPhone,
      contactEmail,
      callHistory: [record, ...company.callHistory],
    };

    onSave(updated);
    setSaved(true);
    setTimeout(() => onClose(), 700);
  }

  function saveInfoOnly() {
    const updated: Company = {
      ...company,
      contactName,
      directPhone,
      contactEmail,
      assignee,
      nextDate,
    };
    onSave(updated);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#16161a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 企業情報ヘッダー */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-white/30 mb-0.5">
                {company.industry}{company.employees && ` · ${company.employees}人`}
              </div>
              <h2 className="text-xl font-semibold leading-tight">{company.company}</h2>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {company.phone && (
                  <a href={`tel:${company.phone}`} onClick={(e) => e.stopPropagation()}
                    className="text-white/50 text-sm font-mono hover:text-violet-400 transition-colors">
                    📞 {company.phone}
                  </a>
                )}
                {company.latestResult && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${RESULT_CONFIG[company.latestResult].badge}`}>
                    {company.latestResult}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xl leading-none mt-1 shrink-0">✕</button>
          </div>

          {/* タブ切り替え */}
          <div className="flex gap-1 mt-3 bg-white/5 rounded-lg p-1 w-fit">
            {[{ id: "call", label: "コール記録" }, { id: "info", label: "担当者情報" }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id as "call" | "info")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tab === t.id ? "bg-white text-black" : "text-white/40 hover:text-white/70"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* スクロール可能な本文 */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {saved ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">✓</div>
              <div className="text-white/60">記録しました</div>
            </div>
          ) : tab === "call" ? (
            <>
              {/* 結果ボタン */}
              <div className="mb-5">
                <label className="text-xs text-white/40 mb-2.5 block">今日の結果を選択</label>
                <div className="grid grid-cols-3 gap-2">
                  {RESULTS.map((r) => (
                    <button key={r} onClick={() => setSelectedResult(r)}
                      className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                        selectedResult === r
                          ? RESULT_CONFIG[r].bg + " text-white ring-2 ring-white/20 scale-[1.03]"
                          : "bg-white/5 text-white/50 hover:bg-white/10"
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 詳細タグ（アポ・資料送付・再コールのみ表示） */}
              {showDetailTags && (
                <div className="bg-white/[0.02] rounded-xl p-4 mb-4 border border-white/5 space-y-1">
                  <p className="text-xs text-violet-400 mb-3 font-medium">詳細を記録（任意）</p>
                  <TagSelector
                    label="提案した商材"
                    allTags={tagConfig.products}
                    selected={selectedProducts}
                    onToggle={(t) => toggleTag(selectedProducts, setSelectedProducts, t)}
                    onAdd={(t) => addTag("products", t)}
                    onDelete={(t) => deleteTag("products", t)}
                  />
                  <TagSelector
                    label="相手の課題"
                    allTags={tagConfig.challenges}
                    selected={selectedChallenges}
                    onToggle={(t) => toggleTag(selectedChallenges, setSelectedChallenges, t)}
                    onAdd={(t) => addTag("challenges", t)}
                    onDelete={(t) => deleteTag("challenges", t)}
                  />
                  <TagSelector
                    label="興味を持ってくれたポイント"
                    allTags={tagConfig.interests}
                    selected={selectedInterests}
                    onToggle={(t) => toggleTag(selectedInterests, setSelectedInterests, t)}
                    onAdd={(t) => addTag("interests", t)}
                    onDelete={(t) => deleteTag("interests", t)}
                  />
                </div>
              )}

              {/* 次回連絡日 + 担当 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">次回連絡日</label>
                  <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">コール担当</label>
                  <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)}
                    placeholder="例：山崎"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
              </div>

              {/* メモ */}
              <div className="mb-5">
                <label className="text-xs text-white/40 mb-1.5 block">フリーメモ（任意）</label>
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2}
                  placeholder="その他、気になった点や次回のポイントなど..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
              </div>

              <button onClick={logResult} disabled={!selectedResult}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-all">
                {selectedResult ? `「${selectedResult}」を記録する` : "↑ 結果を選択してください"}
              </button>
            </>
          ) : (
            /* 担当者情報タブ */
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">担当者名</label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                    placeholder="例：田中 太郎"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">直通電話番号</label>
                  <input type="tel" value={directPhone} onChange={(e) => setDirectPhone(e.target.value)}
                    placeholder="例：03-1234-5678"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">メールアドレス</label>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="例：tanaka@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">次回連絡日</label>
                  <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
              </div>
              <button onClick={saveInfoOnly}
                className="w-full mt-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl py-3 text-sm font-semibold transition-all">
                保存する
              </button>
            </>
          )}
        </div>

        {/* コール履歴 */}
        {company.callHistory.length > 0 && (
          <div className="border-t border-white/5 px-6 py-4 shrink-0 max-h-44 overflow-y-auto">
            <div className="text-xs text-white/30 mb-2">コール履歴</div>
            <div className="space-y-2">
              {company.callHistory.map((h) => (
                <div key={h.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 font-mono shrink-0">{h.date}</span>
                    <span className={`px-2 py-0.5 rounded-full shrink-0 ${RESULT_CONFIG[h.result].badge}`}>{h.result}</span>
                    {h.assignee && <span className="text-white/30 shrink-0">{h.assignee}</span>}
                    {h.memo && <span className="text-white/40 truncate">{h.memo}</span>}
                  </div>
                  {/* タグ表示 */}
                  {(h.products?.length > 0 || h.challenges?.length > 0 || h.interests?.length > 0) && (
                    <div className="flex gap-1 flex-wrap mt-1 ml-24">
                      {h.products?.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-violet-900/50 text-violet-300 rounded text-[10px]">{t}</span>
                      ))}
                      {h.challenges?.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-amber-900/50 text-amber-300 rounded text-[10px]">{t}</span>
                      ))}
                      {h.interests?.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 rounded text-[10px]">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
