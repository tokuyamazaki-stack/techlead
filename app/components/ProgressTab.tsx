"use client";

import { useState, useMemo } from "react";
import type { Company, GoalConfig } from "../lib/types";
import { RESULTS, RESULT_CONFIG } from "../lib/types";
import type { WorkingHoursRecord } from "../lib/db";

type Period = "day" | "week" | "month";

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

function KpiCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border shadow-sm ${highlight ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? "text-emerald-600" : "text-slate-800"}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ProgressTab({ companies, goalConfig, onUpdateGoals, workingHours, onLogHours, currentUserName }: Props) {
  const [period, setPeriod] = useState<Period>("month");
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
    return allRecords.filter(r => r.date.startsWith(thisMonth));
  }, [allRecords, period, today, weekStart, thisMonth]);

  const periodHours = useMemo(() => {
    if (period === "day") return workingHours.filter(h => h.date === today);
    if (period === "week") return workingHours.filter(h => h.date >= weekStart && h.date <= today);
    return workingHours.filter(h => h.date.startsWith(thisMonth));
  }, [workingHours, period, today, weekStart, thisMonth]);

  const teamStats = useMemo(() => {
    const calls = periodRecords.length;
    const appo = periodRecords.filter(r => r.result === "アポ獲得").length;
    const material = periodRecords.filter(r => r.result === "資料送付").length;
    const totalHours = periodHours.reduce((sum, h) => sum + h.hours, 0);
    return {
      calls, appo, material,
      totalHours: totalHours > 0 ? totalHours.toFixed(1) : "—",
      callsPerHour: totalHours > 0 ? (calls / totalHours).toFixed(1) : "—",
      appoRate: calls > 0 ? ((appo / calls) * 100).toFixed(1) : "0.0",
      materialRate: calls > 0 ? ((material / calls) * 100).toFixed(1) : "0.0",
    };
  }, [periodRecords, periodHours]);

  const memberStats = useMemo(() => {
    const nameSet = new Set<string>();
    periodRecords.forEach(r => { if (r.assignee) nameSet.add(r.assignee); });
    periodHours.forEach(h => { if (h.userName) nameSet.add(h.userName); });
    return [...nameSet].map(name => {
      const recs = periodRecords.filter(r => r.assignee === name);
      const hrs = periodHours.filter(h => h.userName === name).reduce((s, h) => s + h.hours, 0);
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
  }, [periodRecords, periodHours]);

  // チャート用（期間によらず全件）
  const byIndustry = useMemo(() => {
    const map: Record<string, { total: number; appo: number }> = {};
    allRecords.forEach(r => {
      const ind = r.industry || "不明";
      if (!map[ind]) map[ind] = { total: 0, appo: 0 };
      map[ind].total++;
      if (r.result === "アポ獲得") map[ind].appo++;
    });
    return Object.entries(map).sort((a, b) => b[1].appo - a[1].appo).slice(0, 8);
  }, [allRecords]);

  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days.map(date => ({
      date,
      label: new Date(date + "T00:00:00").toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
      total: allRecords.filter(r => r.date === date).length,
      appo: allRecords.filter(r => r.date === date && r.result === "アポ獲得").length,
    }));
  }, [allRecords]);
  const maxDay = Math.max(...last7Days.map(d => d.total), 1);

  const resultCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    RESULTS.forEach(r => (counts[r] = 0));
    allRecords.forEach(r => { counts[r.result] = (counts[r.result] || 0) + 1; });
    return counts;
  }, [allRecords]);
  const total = allRecords.length;

  const PERIOD_LABELS: Record<Period, string> = { day: "今日", week: "今週", month: "今月" };

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

      {/* ── 期間 + 稼働時間入力 ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(["day", "week", "month"] as Period[]).map(p => (
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
              <input
                type="number" min={0} max={24} step={0.5}
                value={inputHours}
                onChange={e => setInputHours(e.target.value)}
                placeholder="例: 4.5"
                className="w-20 text-sm font-semibold text-slate-800 focus:outline-none"
                autoFocus
              />
              <span className="text-xs text-slate-400">時間</span>
              <button
                onClick={() => {
                  const h = parseFloat(inputHours);
                  if (!isNaN(h) && h > 0) { onLogHours(h); }
                  setInputHours(""); setShowHoursInput(false);
                }}
                className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-2.5 py-1 rounded-lg transition-all"
              >保存</button>
              <button onClick={() => setShowHoursInput(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowHoursInput(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-violet-300 text-slate-500 hover:text-violet-600 rounded-xl text-xs font-medium transition-all"
            >
              ＋ 稼働時間を記録
              {currentUserName && <span className="text-slate-300">({currentUserName})</span>}
            </button>
          )}
          <button
            onClick={() => { setEditGoals(goalConfig); setShowGoalEditor(!showGoalEditor); }}
            className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-xl text-xs transition-all"
          >目標設定</button>
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
                  <input type="number" min={1}
                    value={editGoals[key as keyof GoalConfig]}
                    onChange={e => setEditGoals({ ...editGoals, [key]: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
                  <span className="text-sm text-slate-400 shrink-0">件</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => { onUpdateGoals(editGoals); setShowGoalEditor(false); }}
            className="mt-4 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-all"
          >保存する</button>
        </div>
      )}

      {/* ── チーム KPI ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          チーム — {PERIOD_LABELS[period]}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="稼働時間" value={`${teamStats.totalHours}h`} />
          <KpiCard label="コール数" value={`${fmt(teamStats.calls)}件`} />
          <KpiCard label="コール / 時間" value={`${teamStats.callsPerHour}件`} sub="1時間あたり" />
          <KpiCard label="資料送付" value={`${fmt(teamStats.material)}件`} sub={`${teamStats.materialRate}%`} />
          <KpiCard label="アポ獲得" value={`${fmt(teamStats.appo)}件`} sub={`${teamStats.appoRate}%`} highlight={teamStats.appo > 0} />
        </div>
      </div>

      {/* ── メンバー別 ── */}
      {memberStats.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            メンバー別 — {PERIOD_LABELS[period]}
          </h2>
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
                          parseFloat(m.appoRate) > 0 ? "bg-amber-100 text-amber-600" :
                          "text-slate-300"
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

      {/* ── 業界傾向 ── */}
      {byIndustry.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">業界傾向（全期間）</h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            {byIndustry.map(([ind, data], i) => {
              const appoRate = data.total > 0 ? (data.appo / data.total) * 100 : 0;
              const maxTotal = byIndustry[0][1].total;
              return (
                <div key={ind}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 w-4">{i + 1}</span>
                      <span className="text-sm text-slate-700 font-medium">{ind}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400">{data.total}件</span>
                      {data.appo > 0 && <span className="text-emerald-600 font-semibold">アポ {data.appo}件</span>}
                      <span className={`font-bold w-9 text-right ${appoRate >= 10 ? "text-emerald-600" : appoRate >= 5 ? "text-amber-600" : "text-slate-400"}`}>
                        {Math.round(appoRate)}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-slate-200 rounded-full" style={{ width: `${(data.total / maxTotal) * 100}%` }} />
                    {data.appo > 0 && <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full" style={{ width: `${(data.appo / maxTotal) * 100}%` }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 直近7日トレンド ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">直近7日のトレンド</h2>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-end gap-3" style={{ height: "120px" }}>
            {last7Days.map(d => {
              const barH = maxDay > 0 ? Math.max((d.total / maxDay) * 88, d.total > 0 ? 8 : 0) : 0;
              const appoH = d.total > 0 ? (d.appo / d.total) * barH : 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-400 h-4 flex items-center">{d.total || ""}</span>
                  <div className="w-full flex flex-col justify-end rounded-t-md overflow-hidden" style={{ height: "88px" }}>
                    {d.total > 0 ? (
                      <>
                        <div className="w-full bg-violet-400 rounded-t-md" style={{ height: `${barH - appoH}px` }} />
                        {appoH > 0 && <div className="w-full bg-emerald-500" style={{ height: `${appoH}px` }} />}
                      </>
                    ) : (
                      <div className="w-full bg-slate-100 rounded-t-md" style={{ height: "4px" }} />
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{d.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-violet-400 inline-block" />コール</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-emerald-500 inline-block" />アポ</span>
          </div>
        </div>
      </div>

      {/* ── 全期間 結果内訳 ── */}
      {total > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            全期間 結果内訳 <span className="text-slate-300 font-normal ml-1">計{total}件</span>
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            {RESULTS.filter(r => resultCounts[r] > 0).map(r => (
              <div key={r} className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium w-24 text-center shrink-0 ${RESULT_CONFIG[r].badge}`}>{r}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full ${RESULT_CONFIG[r].darkBg}`} style={{ width: `${(resultCounts[r] / total) * 100}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-800 w-8 text-right">{resultCounts[r]}</span>
                <span className="text-xs text-slate-400 w-10">{Math.round((resultCounts[r] / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
