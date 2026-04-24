"use client";

import { useState } from "react";
import type { UserSettings, ReportFormField, FormFieldType, TalkScript } from "../lib/types";
import { FORM_FIELD_LABELS } from "../lib/types";
import type { Workspace, WorkspaceMember } from "../lib/db";
import * as db from "../lib/db";

interface Props {
  current: UserSettings;
  onSave: (settings: UserSettings) => void;
  onClose: () => void;
  onResetDemo: () => void;
  workspace?: Workspace | null;
  userId?: string;
  members?: WorkspaceMember[];
}

const FIELD_OPTIONS: FormFieldType[] = [
  "none", "date", "assignee", "totalCalls", "appo",
  "material", "recall", "absent", "ngTotal", "appoRate",
];

export default function SettingsModal({ current, onSave, onClose, onResetDemo, workspace, userId, members }: Props) {
  const [name, setName] = useState(current.name);
  const [inviteToken, setInviteToken] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState(current.calendarUrl);
  const [reportFormUrl, setReportFormUrl] = useState(current.reportFormUrl || "");
  const [formFields, setFormFields] = useState<ReportFormField[]>(current.reportFormFields ?? []);

  // トークスクリプト
  const [scripts, setScripts] = useState<TalkScript[]>(current.scripts ?? []);
  const [selectedScriptId, setSelectedScriptId] = useState(current.selectedScriptId ?? "");
  const [showScriptSetup, setShowScriptSetup] = useState(false);
  const [editingScript, setEditingScript] = useState<TalkScript | null>(null);
  const [newScriptName, setNewScriptName] = useState("");
  const [newScriptContent, setNewScriptContent] = useState("");
  const [addingScript, setAddingScript] = useState(false);

  // フォーム自動入力設定
  const [showFormSetup, setShowFormSetup] = useState(false);
  const [prefillUrl, setPrefillUrl] = useState("");
  const [parseError, setParseError] = useState("");

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      calendarUrl: calendarUrl.trim(),
      reportFormUrl: reportFormUrl.trim(),
      phone: "",
      email: "",
      reportFormFields: formFields,
      scripts,
      selectedScriptId,
    });
    onClose();
  }

  function addScript() {
    if (!newScriptName.trim()) return;
    const s: TalkScript = { id: `script-${Date.now()}`, name: newScriptName.trim(), content: newScriptContent };
    const next = [...scripts, s];
    setScripts(next);
    if (!selectedScriptId) setSelectedScriptId(s.id);
    setNewScriptName("");
    setNewScriptContent("");
    setAddingScript(false);
  }

  function saveEditingScript() {
    if (!editingScript) return;
    setScripts(scripts.map((s) => s.id === editingScript.id ? editingScript : s));
    setEditingScript(null);
  }

  function deleteScript(id: string) {
    const next = scripts.filter((s) => s.id !== id);
    setScripts(next);
    if (selectedScriptId === id) setSelectedScriptId(next[0]?.id ?? "");
  }

  // 事前入力URLを解析してentry IDを抽出
  function parsePrefillUrl() {
    setParseError("");
    try {
      const url = new URL(prefillUrl.trim());
      const entries: ReportFormField[] = [];
      url.searchParams.forEach((_, key) => {
        if (key.startsWith("entry.")) {
          entries.push({ entryId: key, dataType: "none" });
        }
      });
      if (entries.length === 0) {
        setParseError("entry.XXX という項目が見つかりませんでした。手順どおりに事前入力URLを取得してください。");
        return;
      }
      // ベースURLも保存
      const base = url.origin + url.pathname;
      setReportFormUrl(base);
      setFormFields(entries);
    } catch {
      setParseError("URLの形式が正しくありません。Googleフォームの事前入力URLを貼り付けてください。");
    }
  }

  function updateFieldType(entryId: string, dataType: FormFieldType) {
    setFormFields(prev => prev.map(f => f.entryId === entryId ? { ...f, dataType } : f));
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-7">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">マイ設定</h2>
              <p className="text-xs text-slate-400 mt-1">担当者名とカレンダーを設定してください</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
          </div>

          {/* 担当者名 */}
          <div className="mb-5">
            <label className="text-xs text-slate-500 mb-1.5 block">あなたの名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：山崎"
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <p className="text-xs text-slate-400 mt-1.5">コール記録の「担当者」欄に自動入力されます</p>
          </div>

          {/* カレンダーURL */}
          <div className="mb-6">
            <label className="text-xs text-slate-500 mb-1.5 block">GoogleカレンダーのURL（任意）</label>
            <input
              type="url"
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              placeholder="https://calendar.app.google/..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <div className="mt-2 bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1 border border-slate-100">
              <p className="text-slate-600 font-medium">取得方法</p>
              <p>① Googleカレンダーを開く</p>
              <p>② 設定 → 「予約スケジュール」を作成</p>
              <p>③ 共有リンクをコピーしてここに貼る</p>
              <p className="text-violet-600 mt-1">→ アポ獲得時にこのカレンダーが表示されます</p>
            </div>
          </div>

          {/* トークスクリプト */}
          <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowScriptSetup(!showScriptSetup)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <div>
                <span className="text-sm font-medium text-slate-700">トークスクリプト</span>
                {scripts.length > 0 && (
                  <span className="ml-2 text-xs text-emerald-600 font-medium">{scripts.length}件登録済み</span>
                )}
              </div>
              <span className="text-slate-400 text-sm">{showScriptSetup ? "▲" : "▼"}</span>
            </button>

            {showScriptSetup && (
              <div className="px-4 py-4 space-y-3">
                {/* スクリプト一覧 */}
                {scripts.map((s) => (
                  <div key={s.id} className={`border rounded-xl overflow-hidden transition-all ${selectedScriptId === s.id ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white"}`}>
                    {editingScript?.id === s.id ? (
                      <div className="p-3 space-y-2">
                        <input
                          value={editingScript.name}
                          onChange={(e) => setEditingScript({ ...editingScript, name: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-violet-500"
                          placeholder="スクリプト名"
                        />
                        <textarea
                          value={editingScript.content}
                          onChange={(e) => setEditingScript({ ...editingScript, content: e.target.value })}
                          rows={6}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-violet-500 resize-none"
                          placeholder="スクリプト本文..."
                        />
                        <div className="flex gap-2">
                          <button onClick={saveEditingScript} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-all">保存</button>
                          <button onClick={() => setEditingScript(null)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg transition-all">キャンセル</button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="selectedScript"
                              checked={selectedScriptId === s.id}
                              onChange={() => setSelectedScriptId(s.id)}
                              className="accent-violet-600"
                            />
                            <span className="text-sm font-medium text-slate-800">{s.name}</span>
                            {selectedScriptId === s.id && <span className="text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full">使用中</span>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setEditingScript(s)} className="text-xs text-slate-400 hover:text-violet-600 px-2 py-1 rounded transition-colors">編集</button>
                            <button onClick={() => deleteScript(s.id)} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded transition-colors">削除</button>
                          </div>
                        </div>
                        {s.content && (
                          <p className="text-xs text-slate-400 ml-5 truncate">{s.content.slice(0, 60)}{s.content.length > 60 ? "…" : ""}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* 新規追加フォーム */}
                {addingScript ? (
                  <div className="border border-violet-200 rounded-xl p-3 space-y-2 bg-violet-50">
                    <input
                      autoFocus
                      value={newScriptName}
                      onChange={(e) => setNewScriptName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-violet-500"
                      placeholder="スクリプト名（例：新規開拓用）"
                    />
                    <textarea
                      value={newScriptContent}
                      onChange={(e) => setNewScriptContent(e.target.value)}
                      rows={6}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-violet-500 resize-none"
                      placeholder="スクリプト本文を入力..."
                    />
                    <div className="flex gap-2">
                      <button onClick={addScript} disabled={!newScriptName.trim()} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-xs font-semibold rounded-lg transition-all">追加</button>
                      <button onClick={() => { setAddingScript(false); setNewScriptName(""); setNewScriptContent(""); }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg transition-all">キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingScript(true)}
                    className="w-full py-2.5 rounded-xl text-xs border border-dashed border-slate-300 text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-all"
                  >
                    ＋ スクリプトを追加
                  </button>
                )}
                <p className="text-xs text-slate-400">→「保存する」を押すと設定が反映されます</p>
              </div>
            )}
          </div>

          {/* 日報フォーム自動入力 */}
          <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowFormSetup(!showFormSetup)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <div>
                <span className="text-sm font-medium text-slate-700">日報フォーム 自動入力設定</span>
                {formFields.length > 0 && (
                  <span className="ml-2 text-xs text-emerald-600 font-medium">
                    {formFields.filter(f => f.dataType !== "none").length}項目設定済み
                  </span>
                )}
              </div>
              <span className="text-slate-400 text-sm">{showFormSetup ? "▲" : "▼"}</span>
            </button>

            {showFormSetup && (
              <div className="px-4 py-4 space-y-4">
                {/* 手順説明 */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                  <p className="font-semibold mb-1.5">設定手順</p>
                  <p>① Googleフォームを回答者として開く</p>
                  <p>② 右上の「︙」→「事前入力されたリンクを取得」をクリック</p>
                  <p>③ 各項目にダミー値（例：「111」「222」など）を入力</p>
                  <p>④「リンクをコピー」→ 下に貼り付けて「解析する」</p>
                  <p>⑤ 各項目に何のデータを入れるか選ぶ</p>
                </div>

                {/* URL貼り付け */}
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">事前入力URLを貼り付け</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={prefillUrl}
                      onChange={(e) => { setPrefillUrl(e.target.value); setParseError(""); }}
                      placeholder="https://docs.google.com/forms/d/.../viewform?entry.123=..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500"
                    />
                    <button
                      onClick={parsePrefillUrl}
                      disabled={!prefillUrl.trim()}
                      className="shrink-0 px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-xs font-semibold rounded-lg transition-all"
                    >
                      解析する
                    </button>
                  </div>
                  {parseError && <p className="text-xs text-red-500 mt-1.5">{parseError}</p>}
                </div>

                {/* フィールドマッピング */}
                {formFields.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">{formFields.length}個の項目が見つかりました。それぞれに何を入力するか選んでください。</p>
                    <div className="space-y-2">
                      {formFields.map((f) => (
                        <div key={f.entryId} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono w-36 shrink-0">{f.entryId}</span>
                          <select
                            value={f.dataType}
                            onChange={(e) => updateFieldType(f.entryId, e.target.value as FormFieldType)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-violet-500"
                          >
                            {FIELD_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{FORM_FIELD_LABELS[opt]}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-emerald-600 mt-2">→「保存する」を押すと設定が反映されます</p>
                  </div>
                )}

                {/* 手動でURL入力（フィールドなし） */}
                {formFields.length === 0 && (
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">または直接URLを入力（自動入力なし）</label>
                    <input
                      type="url"
                      value={reportFormUrl}
                      onChange={(e) => setReportFormUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 保存・キャンセル */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-all"
            >
              保存する
            </button>
            <button
              onClick={onClose}
              className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-3 text-sm transition-all"
            >
              キャンセル
            </button>
          </div>

          {/* チームメンバー・招待 */}
          {workspace && userId && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-3">チームメンバー（{workspace.name}）</p>
              {members && members.length > 0 && (
                <div className="space-y-2 mb-4">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-[10px] shrink-0">
                        {m.name ? m.name[0] : m.email[0]}
                      </span>
                      <span>{m.name || m.email}</span>
                      {m.role === "owner" && <span className="text-[10px] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full">オーナー</span>}
                    </div>
                  ))}
                </div>
              )}
              {workspace.ownerId === userId && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">招待コードを発行してメンバーを招待</p>
                  {inviteToken ? (
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={inviteToken}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteToken);
                          setInviteCopied(true);
                          setTimeout(() => setInviteCopied(false), 2000);
                        }}
                        className="shrink-0 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-all"
                      >
                        {inviteCopied ? "コピー済" : "コピー"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        const token = await db.createInvitation(workspace.id, userId);
                        setInviteToken(token);
                      }}
                      className="w-full py-2 rounded-xl text-xs border border-violet-200 text-violet-600 hover:bg-violet-50 transition-all"
                    >
                      招待コードを発行する
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* デモリセット */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-3">デモ・紹介用</p>
            <button
              onClick={() => {
                if (confirm("すべてのデータをデモ用サンプルデータにリセットします。現在のデータは消えます。よろしいですか？")) {
                  onResetDemo();
                  onClose();
                }
              }}
              className="w-full py-2.5 rounded-xl text-sm border border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
            >
              デモデータにリセット
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
