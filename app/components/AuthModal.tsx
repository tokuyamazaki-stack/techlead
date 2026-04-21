"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

interface Props {
  onAuth: () => void;
}

export default function AuthModal({ onAuth }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else {
        onAuth();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(`登録に失敗しました：${error.message}`);
      } else {
        setDone(true);
      }
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-10 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">確認メールを送信しました</h2>
          <p className="text-sm text-slate-500 mb-6">{email} に確認メールを送りました。メール内のリンクをクリックしてからログインしてください。</p>
          <button onClick={() => { setMode("login"); setDone(false); }}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3 text-sm font-semibold transition-all">
            ログイン画面へ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
            TL
          </div>
          <span className="text-xl font-bold text-slate-800">TechLead</span>
        </div>

        <h2 className="text-base font-semibold text-slate-900 mb-1">
          {mode === "login" ? "ログイン" : "アカウント作成"}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {mode === "login" ? "チームで使うにはログインが必要です" : "メールアドレスで無料登録できます"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="例：toku@randd-inc.com"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
              minLength={6}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-all"
          >
            {loading ? "処理中..." : mode === "login" ? "ログイン" : "登録する"}
          </button>
        </form>

        <div className="mt-5 text-center">
          {mode === "login" ? (
            <p className="text-xs text-slate-400">
              アカウントをお持ちでない方は{" "}
              <button onClick={() => { setMode("signup"); setError(""); }} className="text-violet-600 hover:underline font-medium">
                新規登録
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              すでにアカウントをお持ちの方は{" "}
              <button onClick={() => { setMode("login"); setError(""); }} className="text-violet-600 hover:underline font-medium">
                ログイン
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
