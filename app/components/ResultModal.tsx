"use client";

import { useState, useRef, useEffect } from "react";
import type { Company, ResultType, CallRecord, TagConfig, UserSettings } from "../lib/types";
import * as db from "../lib/db";
import { RESULTS, RESULT_CONFIG, DETAIL_RESULTS, DEFAULT_TAGS, NG_REASONS } from "../lib/types";
import { today } from "../lib/parser";
import { addBusinessDays } from "../lib/dateUtils";
import MailModal from "./MailModal";

interface Props {
  company: Company;
  tagConfig: TagConfig;
  userSettings: UserSettings;
  onSave: (updated: Company) => void;
  onUpdateTags: (updated: TagConfig) => void;
  onClose: () => void;
  currentIndex?: number;
  totalCount?: number;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  // リアルタイム架電状況用
  workspaceId?: string;
  userId?: string;
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
      <label className="text-xs text-slate-500 mb-2 block">{label}</label>
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
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
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
              className="bg-slate-50 border border-violet-500 rounded-full px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none w-28"
            />
            <button onClick={submitAdd} className="text-xs text-violet-600 hover:text-violet-500 px-1">追加</button>
            <button onClick={() => setAdding(false)} className="text-xs text-slate-400 hover:text-slate-600 px-1">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-full text-xs text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-all"
          >
            ＋ 追加
          </button>
        )}
      </div>
    </div>
  );
}

export default function ResultModal({ company, tagConfig, userSettings, onSave, onUpdateTags, onClose, currentIndex, totalCount, hasPrev, hasNext, onPrev, onNext, workspaceId, userId }: Props) {
  const [selectedResult, setSelectedResult] = useState<ResultType | null>(company.latestResult ?? null);
  const [memo, setMemo] = useState("");
  const [assignee, setAssignee] = useState(company.assignee || userSettings.name || "");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [nextDate, setNextDate] = useState(company.nextDate || "");

  const activeScript = userSettings.scripts?.find((s) => s.id === userSettings.selectedScriptId) ?? null;

  // 担当者情報
  const [contactName, setContactName] = useState(company.contactName || "");
  const [directPhone, setDirectPhone] = useState(company.directPhone || "");
  const [contactEmail, setContactEmail] = useState(company.contactEmail || "");

  // タグ選択
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // NG理由
  const [ngReason, setNgReason] = useState("");

  const [saved, setSaved] = useState(false);
  const [savedResult, setSavedResult] = useState<ResultType | null>(null);
  const [showMailModal, setShowMailModal] = useState(false);
  const [tab, setTab] = useState<"call" | "info">("call");

  // リアルタイム架電状況の登録・解除
  useEffect(() => {
    if (!workspaceId || !userId) return;
    const userName = userSettings.name || "不明";
    db.setActiveCall(workspaceId, userId, userName, company.id, company.company);
    return () => {
      db.clearActiveCall(workspaceId, userId);
    };
  // company.idが変わったとき（前後ナビ）も再登録する
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, userId, company.id]);

  // スワイプ検知
  const touchStartX = useRef<number | null>(null);
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60 && hasNext && onNext) onNext();
    if (diff < -60 && hasPrev && onPrev) onPrev();
    touchStartX.current = null;
  }

  const showDetailTags = selectedResult && DETAIL_RESULTS.includes(selectedResult);
  const isNgResult = selectedResult === "担当NG" || selectedResult === "受付NG";
  const ngPresets = isNgResult ? NG_REASONS[selectedResult] : [];

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

    // 次回連絡日が未入力なら結果に応じて自動セット（土日祝スキップ）
    let finalNextDate = nextDate;
    if (!nextDate) {
      if (selectedResult === "資料送付") {
        finalNextDate = addBusinessDays(7);
      } else if (selectedResult === "再コール" || selectedResult === "担当者不在") {
        finalNextDate = addBusinessDays(3);
      }
    }

    const record: CallRecord = {
      id: `${Date.now()}`,
      date: today(),
      result: selectedResult,
      memo,
      assignee,
      products: selectedProducts,
      challenges: selectedChallenges,
      interests: selectedInterests,
      ...(ngReason.trim() && { ngReason: ngReason.trim() }),
      ...(activeScript && { scriptName: activeScript.name }),
    };

    const updated: Company = {
      ...company,
      latestResult: selectedResult,
      assignee,
      nextDate: finalNextDate,
      contactName,
      directPhone,
      contactEmail,
      callHistory: [record, ...company.callHistory],
    };

    onSave(updated);
    setSavedResult(selectedResult);
    setSaved(true);
    // アポ獲得・資料送付はメール送信ボタンを表示するため自動クローズしない
    if (selectedResult !== "アポ獲得" && selectedResult !== "資料送付") {
      setTimeout(() => onClose(), 700);
    }
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
    <>
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className={`bg-white border border-slate-200 rounded-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex transition-all duration-300 ${
          (showCalendar || showScript) ? "max-w-5xl flex-row" : "max-w-lg flex-col"
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 左カラム：フォーム */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden max-h-[90vh]">
        {/* 企業情報ヘッダー */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400 mb-0.5">
                {company.industry}{company.employees && ` · ${company.employees}人`}
              </div>
              <h2 className="text-xl font-semibold text-slate-900 leading-tight">{company.company}</h2>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {company.phone && (
                  <a href={`tel:${company.phone}`} onClick={(e) => e.stopPropagation()}
                    className="text-slate-500 text-sm font-mono hover:text-violet-600 transition-colors">
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
            <div className="flex items-center gap-1 ml-3 shrink-0">
              {/* 前後ナビゲーション */}
              {totalCount !== undefined && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={onPrev}
                    disabled={!hasPrev}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-slate-600 text-sm"
                    title="前の会社"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-slate-400 w-12 text-center tabular-nums">
                    {(currentIndex ?? 0) + 1} / {totalCount}
                  </span>
                  <button
                    onClick={onNext}
                    disabled={!hasNext}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-slate-600 text-sm"
                    title="次の会社"
                  >
                    ›
                  </button>
                </div>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none ml-1">✕</button>
            </div>
          </div>

          {/* タブ切り替え */}
          <div className="flex gap-1 mt-3 bg-slate-100 rounded-lg p-1 w-fit">
            {[{ id: "call", label: "コール記録" }, { id: "info", label: "担当者情報" }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id as "call" | "info")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* スクロール可能な本文 */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {saved ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">✓</div>
              <div className="text-slate-600 mb-5">記録しました</div>
              {(savedResult === "アポ獲得" || savedResult === "資料送付") && (
                <button
                  onClick={() => setShowMailModal(true)}
                  className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl py-3 text-sm font-semibold transition-all mb-3"
                >
                  ✉ メールを送る
                </button>
              )}
              <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                閉じる
              </button>
            </div>
          ) : tab === "call" ? (
            <>
              {/* 結果ボタン */}
              <div className="mb-5">
                <label className="text-xs text-slate-500 mb-2.5 block">今日の結果を選択</label>
                <div className="grid grid-cols-3 gap-2">
                  {RESULTS.map((r) => (
                    <button key={r} onClick={() => setSelectedResult(r)}
                      className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                        selectedResult === r
                          ? RESULT_CONFIG[r].bg + " text-white ring-2 ring-white/20 scale-[1.03]"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* NG理由（担当NG・受付NGのみ） */}
              {isNgResult && (
                <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4">
                  <label className="text-xs text-red-600 mb-2.5 block font-medium">NG理由（任意）</label>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {ngPresets.map((r) => (
                      <button
                        key={r}
                        onClick={() => setNgReason(ngReason === r ? "" : r)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          ngReason === r
                            ? "bg-red-600 text-white ring-1 ring-red-400"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={ngReason}
                    onChange={(e) => setNgReason(e.target.value)}
                    placeholder="その他の理由を入力..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-red-400 transition-colors"
                  />
                </div>
              )}

              {/* アポ獲得時：カレンダーボタン */}
              {selectedResult === "アポ獲得" && userSettings.calendarUrl && (
                <div className="mb-4">
                  <button
                    onClick={() => { setShowCalendar(!showCalendar); setShowScript(false); }}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                      showCalendar
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    📅 {showCalendar ? "カレンダーを閉じる" : "カレンダーで空き日程を確認"}
                  </button>
                </div>
              )}

              {/* トークスクリプトボタン */}
              {activeScript && (
                <div className="mb-4">
                  <button
                    onClick={() => { setShowScript(!showScript); setShowCalendar(false); }}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                      showScript
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                    }`}
                  >
                    📋 {showScript ? "スクリプトを閉じる" : `スクリプトを表示（${activeScript.name}）`}
                  </button>
                </div>
              )}

              {/* 詳細タグ（アポ・資料送付・再コールのみ表示） */}
              {showDetailTags && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 space-y-1">
                  <p className="text-xs text-violet-600 mb-3 font-medium">詳細を記録（任意）</p>
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
                  <label className="text-xs text-slate-500 mb-1.5 block">次回連絡日</label>
                  <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">コール担当</label>
                  <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)}
                    placeholder="例：山崎"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
              </div>

              {/* メモ */}
              <div className="mb-5">
                <label className="text-xs text-slate-500 mb-1.5 block">フリーメモ（任意）</label>
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2}
                  placeholder="その他、気になった点や次回のポイントなど..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
              </div>

              <button onClick={logResult} disabled={!selectedResult}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-all">
                {selectedResult ? `「${selectedResult}」を記録する` : "↑ 結果を選択してください"}
              </button>

              {/* 既存のアポ・資料送付に対してもメール送信ボタンを表示 */}
              {(company.latestResult === "アポ獲得" || company.latestResult === "資料送付") && (
                <button
                  onClick={() => { setSavedResult(company.latestResult); setShowMailModal(true); }}
                  className="w-full mt-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl py-3 text-sm font-semibold transition-all"
                >
                  ✉ メールを送る（{company.latestResult}）
                </button>
              )}
            </>
          ) : (
            /* 担当者情報タブ */
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">担当者名</label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                    placeholder="例：田中 太郎"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">直通電話番号</label>
                  <input type="tel" value={directPhone} onChange={(e) => setDirectPhone(e.target.value)}
                    placeholder="例：03-1234-5678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">メールアドレス</label>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="例：tanaka@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">次回連絡日</label>
                  <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-violet-500 transition-colors" />
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
          <div className="border-t border-slate-100 px-6 py-4 shrink-0 max-h-44 overflow-y-auto">
            <div className="text-xs text-slate-400 mb-2">コール履歴</div>
            <div className="space-y-2">
              {company.callHistory.map((h) => (
                <div key={h.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono shrink-0">{h.date}</span>
                    <span className={`px-2 py-0.5 rounded-full shrink-0 ${RESULT_CONFIG[h.result].badge}`}>{h.result}</span>
                    {h.assignee && <span className="text-slate-400 shrink-0">{h.assignee}</span>}
                    {h.ngReason && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] shrink-0">{h.ngReason}</span>}
                    {h.memo && <span className="text-slate-500 truncate">{h.memo}</span>}
                  </div>
                  {/* タグ表示 */}
                  {(h.products?.length > 0 || h.challenges?.length > 0 || h.interests?.length > 0) && (
                    <div className="flex gap-1 flex-wrap mt-1 ml-24">
                      {h.products?.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px]">{t}</span>
                      ))}
                      {h.challenges?.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">{t}</span>
                      ))}
                      {h.interests?.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>{/* 左カラム終わり */}

        {/* 右カラム：カレンダー */}
        {showCalendar && userSettings.calendarUrl && (
          <div className="w-[480px] shrink-0 border-l border-slate-200 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs font-semibold text-emerald-700">空き日程を確認</span>
                <span className="text-xs text-slate-400 ml-2">相手に提案できる日時を選んでください</span>
              </div>
              <button
                onClick={() => setShowCalendar(false)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg transition-all"
              >
                閉じる
              </button>
            </div>
            <iframe
              src={userSettings.calendarUrl}
              className="flex-1 w-full"
              style={{ minHeight: "500px" }}
              frameBorder="0"
            />
          </div>
        )}

        {/* 右カラム：トークスクリプト */}
        {showScript && activeScript && (
          <div className="w-[480px] shrink-0 border-l border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs font-semibold text-violet-700">📋 {activeScript.name}</span>
                <span className="text-xs text-slate-400 ml-2">トークスクリプト</span>
              </div>
              <button
                onClick={() => setShowScript(false)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg transition-all"
              >
                閉じる
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{activeScript.content}</pre>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* メールテンプレートモーダル */}
    {showMailModal && (savedResult === "アポ獲得" || savedResult === "資料送付") && (
      <MailModal
        company={company}
        userSettings={userSettings}
        templateType={savedResult}
        onClose={() => setShowMailModal(false)}
      />
    )}
    </>
  );
}
