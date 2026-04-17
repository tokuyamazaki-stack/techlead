"use client";

import { useState, useRef } from "react";
import * as db from "../lib/db";

interface Props {
  userId: string;
  onReady: (workspace: db.Workspace) => void;
}

export default function WorkspaceSetup({ userId, onReady }: Props) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [workspaceName, setWorkspaceName] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    const name = nameRef.current?.value.trim() || workspaceName.trim();
    if (!name) {
      setError("チーム名を入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const name = nameRef.current?.value.trim() || workspaceName.trim();
      const ws = await db.createWorkspace(userId, name);
      onReady(ws);
    } catch (e) {
      setError("チームの作成に失敗しました。もう一度試してください。");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    const tok = tokenRef.current?.value.trim() || token.trim();
    if (!tok) {
      setError("招待コードを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const tok = tokenRef.current?.value.trim() || token.trim();
      const ws = await db.joinByToken(tok, userId);
      if (!ws) {
        setError("招待コードが正しくありません");
        return;
      }
      onReady(ws);
    } catch (e) {
      setError("参加に失敗しました。もう一度試してください。");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
            TL
          </div>
          <span className="text-xl font-bold text-slate-800">TechLead</span>
        </div>

        {mode === "choose" && (
          <>
            <h2 className="text-base font-semibold text-slate-900 mb-1">チームを設定</h2>
            <p className="text-xs text-slate-400 mb-6">チームを作るか、招待コードで参加してください</p>
            <div className="space-y-3">
              <button
                onClick={() => setMode("create")}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all"
              >
                チームを新しく作る
              </button>
              <button
                onClick={() => setMode("join")}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3.5 text-sm font-semibold transition-all"
              >
                招待コードで参加する
              </button>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <button onClick={() => setMode("choose")} className="text-xs text-slate-400 mb-4 hover:text-slate-600">← 戻る</button>
            <h2 className="text-base font-semibold text-slate-900 mb-1">チーム名を決める</h2>
            <p className="text-xs text-slate-400 mb-6">会社名やチーム名を入力してください</p>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <input
              ref={nameRef}
              type="text"
              value={workspaceName}
              onChange={(e) => { setWorkspaceName(e.target.value); setError(""); }}
              placeholder="例：R&Dインサイドセールスチーム"
              autoComplete="off"
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors mb-4"
            />
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl py-3 text-sm font-semibold transition-all"
            >
              {loading ? "作成中..." : "チームを作成"}
            </button>
          </>
        )}

        {mode === "join" && (
          <>
            <button onClick={() => setMode("choose")} className="text-xs text-slate-400 mb-4 hover:text-slate-600">← 戻る</button>
            <h2 className="text-base font-semibold text-slate-900 mb-1">招待コードで参加</h2>
            <p className="text-xs text-slate-400 mb-6">チームのオーナーから招待コードをもらってください</p>
            <input
              ref={tokenRef}
              type="text"
              value={token}
              onChange={(e) => { setToken(e.target.value); setError(""); }}
              placeholder="招待コードを貼り付け"
              autoComplete="off"
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors mb-2"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl py-3 text-sm font-semibold transition-all mt-2"
            >
              {loading ? "参加中..." : "参加する"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
