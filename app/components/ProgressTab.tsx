"use client";

import { useState, useMemo } from "react";
import type { Company, GoalConfig } from "../lib/types";
import { RESULTS, RESULT_CONFIG } from "../lib/types";
import type { WorkingHoursRecord } from "../lib/db";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

type Period = "day" | "week" | "month" | "custom";

interface Props {
  companies: Company[];
  goalConfig: GoalConfig;
  onUpdateGoals: (goals: GoalConfig) => void;
  workingHours: WorkingHoursRecord[];
  onLogHours: (hours: number) => void;
  currentUserName?: string;
}

function todayStr() { return new Date().toISOString().split("T")[0]; }
function thisMonthStr() { return new Date().toISOString().substring(0, 7); }
function weekStartStr() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split("T")[0];
}

function fmt(n: number) { return n.toLocaleString(); }

function KpiCard({ label, value, sub, highlight, icon }: {
  label: string; value: string; sub?: string; highlight?: boolean; icon?: string;
}) {
  return (
    <div className={`rounded-2xl p-5 border shadow-sm ${highlight ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200" : "bg-white border-slate-200"}`}>
      {icon && <div className="text-xl mb-2">{icon}</div>}
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? "text-emerald-600" : "text-slate-800"}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${highlight ? "text-emerald-500 font-semibold" : "text-slate-400"}`}>{sub}</div>}
    </div>
  );
}

// Tooltip カスタマイズ
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <div className="text-slate-500 mb-1.5 font-semibold">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}</span>
          <span className="font-bold text-slate-900 ml-auto pl-3">{p.value}件</span>
        </div>
      ))}
    </div>
  );
}

export default function ProgressTab({ companies, goalConfig, onUpdateGoals, workingHours, onLogHours, currentUserName }: Props) {
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());
  const [searchQuery, setSearchQuery] = useState("");
  const [showHoursInput, setShowHoursInput] = useState(false);
  const [inputHours, setInputHours] = useState("");
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [editGoals, setEditGoals] = useState(goalConfig);

  const today = todayStr();
  const thisMonth = thisMonthStr();
  const weekStart = weekStartStr();

  const allRecords = useMemo(() =>
    companies.flatMap((c) =>
      c.callHistory.map((h) => ({ ...h, industry: c.industry, companyName: c.company }))
    ), [companies]);

  const periodRecords = useMemo(() => {
    if (period === "day") return allRecords.filter(r => r.date === today);
    if (period === "week") return allRecords.filter(r => r.date >= weekStart && r.date <= today);
    if (period === "custom") return allRecords.filter(r => customFrom && customTo && r.date >= customFrom && r.date <= customTo);
    return allRecords.filter(r => r.date.startsWith(thisMonth));
  }, [allRecords, period, today, weekStart, thisMonth, customFrom, customTo]);

  const periodHours = useMemo(() => {
    if (period === "day") return workingHours.filter(h => h.date === today);
    if (period === "week") return workingHours.filter(h => h.date >= weekStart && h.date <= today);
    if (period === "custom") return workingHours.filter(h => customFrom && customTo && h.date >= customFrom && h.date <= customTo);
    return workingHours.filter(h => h.date.startsWith(thisMonth));
  }, [workingHours, period, today, weekStart, thisMonth, customFrom, customTo]);

  const displayRecords = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return periodRecords;
    return periodRecords.filter(r => r.assignee?.includes(q));
  }, [periodRecords, searchQuery]);

  const displayHours = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return periodHours;
    return periodHours.filter(h => h.userName?.includes(q));
  }, [periodHours, searchQuery]);

  const teamStats = useMemo(() => {
    const calls = displayRecords.length;
    const appo = displayRecords.filter(r => r.result === "アポ獲得").length;
    const material = displayRecords.filter(r => r.result === "資料送付").length;
    const totalHours = displayHours.reduce((sum, h) => sum + h.hours, 0);
    return {
      calls, appo, material,
      totalHours: totalHours > 0 ? totalHours.toFixed(1) : "—",
      callsPerHour: totalHours > 0 ? (calls / totalHours).toFixed(1) : "—",
      appoRate: calls > 0 ? ((appo / calls) * 100).toFixed(1) : "0.0",
      materialRate: calls > 0 ? ((material / calls) * 100).toFixed(1) : "0.0",
    };
  }, [displayRecords, displayHours]);

  const memberStats = useMemo(() => {
    const nameSet = new Set<string>();
    displayRecords.forEach(r => { if (r.assignee) nameSet.add(r.assignee); });
    displayHours.forEach(h => { if (h.userName) nameSet.add(h.userName); });
    return [...nameSet].map(name => {
      const recs = displayRecords.filter(r => r.assignee === name);
      const hrs = displayHours.filter(h => h.userName === name).reduce((s, h) => s + h.hours, 0);
      const calls = recs.length;
      const appo = recs.filter(r => r.result === "アポ獲得").length;
      const material = recs.filter(r => r.result === "資料送付").length;
      return {
        name, calls, appo, material,
        hours: hrs > 0 ? hrs.toFixed(1) : "—",
        callsPerHour: hrs > 0 ? (calls / hrs).toFixed(1) : "—",
        appoRate: calls > 0 ? ((appo / calls) * 100).toFixed(1) : "0.0",
        materialRate: calls > 0 ? ((material / calls) * 100).toFixed(1) : "0.0",
      };
    }).sort((a, b) => b.calls - a.calls);
  }, [displayRecords, displayHours]);

  // 直近30日の折れ線グラフデータ
  const trendData = useMemo(() => {
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days.map(date => ({
      date,
      label: new Date(date + "T00:00:00").toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
      コール: allRecords.filter(r => r.date === date).length,
      アポ: allRecords.filter(r => r.date === date && r.result === "アポ獲得").length,
      資料: allRecords.filter(r => r.date === date && r.result === "資料送付").length,
    }));
  }, [allRecords]);

  // メンバー比較棒グラフ用
  const memberBarData = memberStats.map(m => ({
    name: m.name,
    コール: m.calls,
    アポ: m.appo,
    資料: m.material,
  }));

  // 結果内訳パイチャート用
  const resultCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    RESULTS.forEach(r => (counts[r] = 0));
    allRecords.forEach(r => { counts[r.result] = (counts[r.result] || 0) + 1; });
    return counts;
  }, [allRecords]);

  const pieData = RESULTS
    .filter(r => resultCounts[r] > 0)
    .map(r => ({ name: r, value: resultCounts[r] }));

  const PIE_COLORS: Record<string, string> = {
    アポ獲得: "#10b981",
    資料送付: "#a78bfa",
    再コール: "#f59e0b",
    担当者不在: "#60a5fa",
    担当NG: "#f87171",
    受付NG: "#fb7185",
  };

  // 業界傾向
  const byIndustry = useMemo(() => {
    const map: Record<string, { total: number; appo: number }> = {};
    allRecords.forEach(r => {
      const ind = r.industry || "不明";
      if (!map[ind]) map[ind] = { total: 0, appo: 0 };
      map[ind].total++;
      if (r.result === "アポ獲得") map[ind].appo++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].appo - a[1].appo)
      .slice(0, 8)
      .map(([name, data]) => ({
        name,
        コール: data.total,
        アポ: data.appo,
        アポ率: data.total > 0 ? Math.round((data.appo / data.total) * 100) : 0,
      }));
  }, [allRecords]);

  const total = allRecords.length;

  const PERIOD_LABELS: Record<Period, string> = { day: "今日", week: "今週", month: "今月", custom: "カスタム" };

  function periodHeading() {
    if (period === "custom" && customFrom && customTo) {
      return customFrom === customTo ? customFrom : `${customFrom} 〜 ${customTo}`;
    }
    return PERIOD_LABELS[period];
  }

  if (total === 0) {
    return (
      <div className="text-center py-20 text-slate-300">
        <p className="text-lg">まだデータがありません</p>
        <p className="text-sm mt-2">コールを記録すると進捗が表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── 期間選択 + 検索 ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(["day", "week", "month", "custom"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {showHoursInput ? (
              <div className="flex items-center gap-2 bg-white border border-violet-300 rounded-xl px-3 py-2 shadow-sm">
                <span className="text-xs text-slate-500 shrink-0">今日の稼働時間</span>
                <input type="number" min={0} max={24} step={0.5} value={inputHours}
                  onChange={e => setInputHours(e.target.value)} placeholder="例: 4.5" autoFocus
                  className="w-20 text-sm font-semibold text-slate-800 focus:outline-none" />
                <span className="text-xs text-slate-400">時間</span>
                <button onClick={() => {
                  const h = parseFloat(inputHours);
                  if (!isNaN(h) && h > 0) onLogHours(h);
                  setInputHours(""); setShowHoursInput(false);
                }} className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-2.5 py-1 rounded-lg transition-all">保存</button>
                <button onClick={() => setShowHoursInput(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
              </div>
            ) : (
              <button onClick={() => setShowHoursInput(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-violet-300 text-slate-500 hover:text-violet-600 rounded-xl text-xs font-medium transition-all">
                ＋ 稼働時間を記録
                {currentUserName && <span className="text-slate-300">({currentUserName})</span>}
              </button>
            )}
            <button onClick={() => { setEditGoals(goalConfig); setShowGoalEditor(!showGoalEditor); }}
              className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-xl text-xs transition-all">
              目標設定
            </button>
          </div>
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-violet-200 rounded-xl px-3 py-2 shadow-sm">
              <span className="text-xs text-slate-500 shrink-0">開始日</span>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="text-sm text-slate-800 focus:outline-none bg-transparent" />
            </div>
            <span className="text-slate-400 text-sm">〜</span>
            <div className="flex items-center gap-2 bg-white border border-violet-200 rounded-xl px-3 py-2 shadow-sm">
              <span className="text-xs text-slate-500 shrink-0">終了日</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="text-sm text-slate-800 focus:outline-none bg-transparent" />
            </div>
          </div>
        )}

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="担当者名で絞り込む..."
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 transition-colors" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-base">✕</button>
          )}
        </div>
      </div>

      {/* 目標設定エディタ */}
      {showGoalEditor && (
        <div className="bg-white border border-violet-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">目標を編集</h3>
            <button onClick={() => setShowGoalEditor(false)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "dailyCallsPerPerson", label: "1人あたり 1日コール目標" },
              { key: "monthlyAppoPerPerson", label: "1人あたり 月間アポ目標" },
              { key: "teamDailyCalls", label: "チーム全体 1日コール目標" },
              { key: "teamMonthlyAppo", label: "チーム全体 月間アポ目標" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-slate-500 mb-1.5 block">{label}</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={editGoals[key as keyof GoalConfig]}
                    onChange={e => setEditGoals({ ...editGoals, [key]: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
                  <span className="text-sm text-slate-400 shrink-0">件</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { onUpdateGoals(editGoals); setShowGoalEditor(false); }}
            className="mt-4 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-all">
            保存する
          </button>
        </div>
      )}

      {/* ── KPI カード ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {searchQuery.trim() ? `「${searchQuery.trim()}」` : "チーム"} — {periodHeading()}
          </h2>
          {displayRecords.length === 0 && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">データなし</span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="稼働時間" value={`${teamStats.totalHours}h`} icon="⏱" />
          <KpiCard label="コール数" value={`${fmt(teamStats.calls)}件`} icon="📞" />
          <KpiCard label="コール / 時間" value={`${teamStats.callsPerHour}件`} sub="1時間あたり" icon="⚡" />
          <KpiCard label="資料送付" value={`${fmt(teamStats.material)}件`} sub={`${teamStats.materialRate}%`} icon="📄" />
          <KpiCard label="アポ獲得" value={`${fmt(teamStats.appo)}件`} sub={`${teamStats.appoRate}%`} highlight={teamStats.appo > 0} icon="🎯" />
        </div>
      </div>

      {/* ── 直近30日 折れ線グラフ ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-5">直近30日のトレンド</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              interval={6}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            />
            <Line type="monotone" dataKey="コール" stroke="#8b5cf6" strokeWidth={2}
              dot={false} activeDot={{ r: 4, fill: "#8b5cf6" }} />
            <Line type="monotone" dataKey="アポ" stroke="#10b981" strokeWidth={2.5}
              dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
            <Line type="monotone" dataKey="資料" stroke="#a78bfa" strokeWidth={1.5}
              dot={false} strokeDasharray="4 2" activeDot={{ r: 4, fill: "#a78bfa" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── メンバー比較 棒グラフ + テーブル ── */}
      {memberStats.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            メンバー別 — {periodHeading()}
          </h2>

          {/* 棒グラフ */}
          {memberStats.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={memberBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Bar dataKey="コール" fill="#c4b5fd" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="アポ" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="資料" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* テーブル */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] text-slate-400 border-b border-slate-100">
                    <th className="text-left px-5 py-3 font-semibold">担当者</th>
                    <th className="text-right px-4 py-3 font-semibold">稼働時間</th>
                    <th className="text-right px-4 py-3 font-semibold">コール数</th>
                    <th className="text-right px-4 py-3 font-semibold">コール/時間</th>
                    <th className="text-right px-4 py-3 font-semibold">資料送付</th>
                    <th className="text-right px-5 py-3 font-semibold">アポ獲得</th>
                  </tr>
                </thead>
                <tbody>
                  {memberStats.map((m, i) => (
                    <tr key={m.name} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${i === 0 ? "bg-violet-50/30" : ""}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {m.name[0]}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">{m.name}</span>
                          {i === 0 && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">TOP</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-slate-500">{m.hours !== "—" ? `${m.hours}h` : "—"}</td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-800">{fmt(m.calls)}件</td>
                      <td className="px-4 py-3.5 text-right text-xs text-slate-500">{m.callsPerHour}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm text-purple-600 font-semibold">{fmt(m.material)}件</span>
                        <span className="text-xs text-slate-400 ml-1">({m.materialRate}%)</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`text-sm font-bold ${m.appo > 0 ? "text-emerald-600" : "text-slate-300"}`}>{fmt(m.appo)}件</span>
                        <span className={`text-xs ml-1 font-semibold px-1.5 py-0.5 rounded-full ${
                          parseFloat(m.appoRate) >= 3 ? "bg-emerald-100 text-emerald-700" :
                          parseFloat(m.appoRate) > 0 ? "bg-amber-100 text-amber-600" : "text-slate-300"
                        }`}>
                          {m.appo > 0 ? `${m.appoRate}%` : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 結果内訳 + 業界傾向 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ドーナツチャート：結果内訳 */}
        {total > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              全期間 結果内訳 <span className="text-slate-300 font-normal">計{total}件</span>
            </h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62}
                    dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[entry.name] ?? "#cbd5e1"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}件`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map(entry => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[entry.name] ?? "#cbd5e1" }} />
                    <span className="text-xs text-slate-600 flex-1">{entry.name}</span>
                    <span className="text-xs font-bold text-slate-800">{entry.value}</span>
                    <span className="text-xs text-slate-400 w-9 text-right">
                      {Math.round((entry.value / total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 業界傾向 横棒グラフ */}
        {byIndustry.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">業界別 アポ率（全期間）</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byIndustry} layout="vertical" margin={{ top: 0, right: 40, left: 4, bottom: 0 }} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={80}
                  tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name) => [name === "アポ率" ? `${value}%` : `${value}件`, name]} />
                <Bar dataKey="コール" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                <Bar dataKey="アポ" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}
