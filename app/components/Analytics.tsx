"use client";

import { useState, useMemo } from "react";
import type { Company, GoalConfig } from "../lib/types";
import { RESULTS, RESULT_CONFIG } from "../lib/types";

interface Props {
  companies: Company[];
  goalConfig: GoalConfig;
  onUpdateGoals: (goals: GoalConfig) => void;
}

function ProgressBar({ value, max, color = "bg-violet-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Analytics({ companies, goalConfig, onUpdateGoals }: Props) {
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [editGoals, setEditGoals] = useState(goalConfig);

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.substring(0, 7);
  const daysInMonth = new Date(parseInt(thisMonth.split("-")[0]), parseInt(thisMonth.split("-")[1]), 0).getDate();
  const dayOfMonth = new Date().getDate();
  const remainingDays = daysInMonth - dayOfMonth;
  const workingDays = 20; // 月の稼働日数

  const allRecords = useMemo(() =>
    companies.flatMap((c) =>
      c.callHistory.map((h) => ({ ...h, industry: c.industry, companyName: c.company }))
    ), [companies]);

  const todayRecords = useMemo(() => allRecords.filter(r => r.date === today), [allRecords, today]);
  const monthRecords = useMemo(() => allRecords.filter(r => r.date.startsWith(thisMonth)), [allRecords, thisMonth]);
  const total = allRecords.length;

  // 担当者一覧（今日 or 今月にコールした人）
  const assignees = useMemo(() => {
    const set = new Set<string>();
    [...todayRecords, ...monthRecords].forEach(r => { if (r.assignee) set.add(r.assignee); });
    return Array.from(set);
  }, [todayRecords, monthRecords]);

  // 担当者別 今日
  const todayByAssignee = useMemo(() => {
    const map: Record<string, { calls: number; appo: number; material: number }> = {};
    assignees.forEach(a => { map[a] = { calls: 0, appo: 0, material: 0 }; });
    todayRecords.forEach(r => {
      if (!r.assignee) return;
      if (!map[r.assignee]) map[r.assignee] = { calls: 0, appo: 0, material: 0 };
      map[r.assignee].calls++;
      if (r.result === "アポ獲得") map[r.assignee].appo++;
      if (r.result === "資料送付") map[r.assignee].material++;
    });
    return Object.entries(map).sort((a, b) => b[1].calls - a[1].calls);
  }, [todayRecords, assignees]);

  // 担当者別 今月
  const monthByAssignee = useMemo(() => {
    const map: Record<string, { calls: number; appo: number }> = {};
    assignees.forEach(a => { map[a] = { calls: 0, appo: 0 }; });
    monthRecords.forEach(r => {
      if (!r.assignee) return;
      if (!map[r.assignee]) map[r.assignee] = { calls: 0, appo: 0 };
      map[r.assignee].calls++;
      if (r.result === "アポ獲得") map[r.assignee].appo++;
    });
    return map;
  }, [monthRecords, assignees]);

  const teamToday = {
    calls: todayRecords.length,
    appo: todayRecords.filter(r => r.result === "アポ獲得").length,
  };
  const teamMonth = {
    calls: monthRecords.length,
    appo: monthRecords.filter(r => r.result === "アポ獲得").length,
  };
  const monthlyCallGoal = goalConfig.teamDailyCalls * workingDays;

  // 業界傾向
  const byIndustry = useMemo(() => {
    const map: Record<string, { total: number; appo: number; material: number }> = {};
    allRecords.forEach(r => {
      const ind = r.industry || "不明";
      if (!map[ind]) map[ind] = { total: 0, appo: 0, material: 0 };
      map[ind].total++;
      if (r.result === "アポ獲得") map[ind].appo++;
      if (r.result === "資料送付") map[ind].material++;
    });
    return Object.entries(map).sort((a, b) => b[1].appo - a[1].appo).slice(0, 8);
  }, [allRecords]);

  // 結果別集計
  const resultCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    RESULTS.forEach(r => (counts[r] = 0));
    allRecords.forEach(r => { counts[r.result] = (counts[r.result] || 0) + 1; });
    return counts;
  }, [allRecords]);

  // 直近7日
  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
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

  if (total === 0) {
    return (
      <div className="text-center py-20 text-slate-300">
        <p className="text-lg">まだデータがありません</p>
        <p className="text-sm mt-2">コールを記録すると分析が表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── 目標設定エディタ ── */}
      {showGoalEditor && (
        <div className="bg-white border border-violet-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">目標を編集</h3>
            <button onClick={() => setShowGoalEditor(false)} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
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
                  <input
                    type="number" min={1}
                    value={editGoals[key as keyof GoalConfig]}
                    onChange={e => setEditGoals({ ...editGoals, [key]: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-violet-500"
                  />
                  <span className="text-sm text-slate-400 shrink-0">件</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => { onUpdateGoals(editGoals); setShowGoalEditor(false); }}
            className="mt-4 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-all"
          >
            保存する
          </button>
        </div>
      )}

      {/* ── 今日の進捗 ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">今日の進捗</h2>
          <button
            onClick={() => { setEditGoals(goalConfig); setShowGoalEditor(!showGoalEditor); }}
            className="text-xs text-slate-400 hover:text-violet-600 border border-slate-200 hover:border-violet-300 px-3 py-1.5 rounded-lg transition-all"
          >
            目標を設定
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">チーム コール数</div>
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold text-slate-900">
                {teamToday.calls}
                <span className="text-base font-normal text-slate-400 ml-1">/ {goalConfig.teamDailyCalls}件</span>
              </div>
              {teamToday.calls >= goalConfig.teamDailyCalls
                ? <span className="text-emerald-600 text-sm font-semibold mb-1">達成！</span>
                : <span className="text-slate-400 text-sm mb-1">あと<span className="text-slate-700 font-bold text-lg mx-1">{goalConfig.teamDailyCalls - teamToday.calls}</span>件</span>
              }
            </div>
            <ProgressBar value={teamToday.calls} max={goalConfig.teamDailyCalls} color="bg-violet-500" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">チーム アポ獲得（本日）</div>
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold text-slate-900">
                {teamToday.appo}
                <span className="text-base font-normal text-slate-400 ml-1">件</span>
              </div>
              {teamToday.appo > 0
                ? <span className="text-emerald-600 text-sm font-semibold mb-1">+{teamToday.appo}件獲得</span>
                : <span className="text-slate-300 text-sm mb-1">まだなし</span>
              }
            </div>
            <ProgressBar value={teamToday.appo} max={Math.max(Math.ceil(goalConfig.teamMonthlyAppo / workingDays), 1)} color="bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* ── 担当者別 今日の状況 ── */}
      {todayByAssignee.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3">担当者別 今日の状況</h2>
          <div className="grid grid-cols-2 gap-3">
            {todayByAssignee.map(([name, data], i) => {
              const isGoalMet = data.calls >= goalConfig.dailyCallsPerPerson;
              const RANK_COLORS = ["bg-amber-400", "bg-slate-400", "bg-orange-300"];
              return (
                <div key={name} className={`bg-white border rounded-xl p-4 shadow-sm ${isGoalMet ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${RANK_COLORS[i] ?? "bg-slate-300"}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate flex-1">{name}</span>
                    {isGoalMet && <span className="text-xs text-emerald-600 font-semibold">達成</span>}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <ProgressBar
                      value={data.calls}
                      max={goalConfig.dailyCallsPerPerson}
                      color={isGoalMet ? "bg-emerald-500" : "bg-violet-500"}
                    />
                    <span className="text-xs text-slate-600 shrink-0">{data.calls}/{goalConfig.dailyCallsPerPerson}件</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    {data.appo > 0 && <span className="text-emerald-600 font-medium">アポ {data.appo}件</span>}
                    {data.material > 0 && <span className="text-purple-600 font-medium">資料 {data.material}件</span>}
                    {data.appo === 0 && data.material === 0 && <span className="text-slate-300">成果なし</span>}
                    {!isGoalMet && (
                      <span className="ml-auto text-slate-400">あと{goalConfig.dailyCallsPerPerson - data.calls}件</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 今月の進捗 ── */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          今月の進捗
          <span className="text-xs font-normal text-slate-400 ml-2">残{remainingDays}日</span>
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">チーム コール（月間）</div>
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold text-slate-900">
                {teamMonth.calls}
                <span className="text-base font-normal text-slate-400 ml-1">/ {monthlyCallGoal}件</span>
              </div>
              {teamMonth.calls >= monthlyCallGoal
                ? <span className="text-emerald-600 text-sm font-semibold mb-1">達成！</span>
                : <span className="text-slate-400 text-sm mb-1">あと<span className="text-slate-700 font-bold text-lg mx-1">{monthlyCallGoal - teamMonth.calls}</span>件</span>
              }
            </div>
            <ProgressBar value={teamMonth.calls} max={monthlyCallGoal} color="bg-violet-500" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">チーム アポ獲得（月間）</div>
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold text-slate-900">
                {teamMonth.appo}
                <span className="text-base font-normal text-slate-400 ml-1">/ {goalConfig.teamMonthlyAppo}件</span>
              </div>
              {teamMonth.appo >= goalConfig.teamMonthlyAppo
                ? <span className="text-emerald-600 text-sm font-semibold mb-1">達成！</span>
                : <span className="text-slate-400 text-sm mb-1">あと<span className="text-slate-700 font-bold text-lg mx-1">{goalConfig.teamMonthlyAppo - teamMonth.appo}</span>件</span>
              }
            </div>
            <ProgressBar value={teamMonth.appo} max={goalConfig.teamMonthlyAppo} color="bg-emerald-500" />
          </div>
        </div>

        {/* 担当者別 月間テーブル */}
        {assignees.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-medium">担当者</th>
                  <th className="text-center px-3 py-3 font-medium">コール</th>
                  <th className="text-center px-3 py-3 font-medium">目標</th>
                  <th className="text-center px-3 py-3 font-medium">アポ</th>
                  <th className="text-center px-3 py-3 font-medium">目標</th>
                  <th className="text-center px-3 py-3 font-medium">アポ率</th>
                  <th className="px-4 py-3 font-medium w-36">進捗</th>
                </tr>
              </thead>
              <tbody>
                {assignees
                  .map(name => ({ name, d: monthByAssignee[name] || { calls: 0, appo: 0 } }))
                  .sort((a, b) => b.d.appo - a.d.appo)
                  .map(({ name, d }) => {
                    const callGoal = goalConfig.dailyCallsPerPerson * workingDays;
                    const appoGoal = goalConfig.monthlyAppoPerPerson;
                    const callPct = callGoal > 0 ? Math.min((d.calls / callGoal) * 100, 100) : 0;
                    const appoRate = d.calls > 0 ? Math.round((d.appo / d.calls) * 100) : 0;
                    const isCallMet = d.calls >= callGoal;
                    const isAppoMet = d.appo >= appoGoal;
                    return (
                      <tr key={name} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{name}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={isCallMet ? "text-emerald-600 font-semibold" : "text-slate-700"}>{d.calls}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-400 text-xs">{callGoal}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={isAppoMet ? "text-emerald-600 font-semibold" : "text-slate-700"}>{d.appo}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-400 text-xs">{appoGoal}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            appoRate >= 10 ? "bg-emerald-100 text-emerald-700"
                            : appoRate >= 5 ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                          }`}>{appoRate}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCallMet ? "bg-emerald-500" : "bg-violet-500"}`}
                                style={{ width: `${callPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 w-8 shrink-0 text-right">{Math.round(callPct)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 業界傾向 ── */}
      {byIndustry.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3">業界傾向</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            {byIndustry.map(([ind, data], i) => {
              const appoRate = data.total > 0 ? (data.appo / data.total) * 100 : 0;
              const maxTotal = byIndustry[0][1].total;
              return (
                <div key={ind}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 w-4 shrink-0">{i + 1}</span>
                      <span className="text-sm text-slate-700 font-medium">{ind}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="text-slate-400">{data.total}件</span>
                      {data.appo > 0 && <span className="text-emerald-600 font-semibold">アポ {data.appo}件</span>}
                      <span className={`font-bold w-9 text-right ${
                        appoRate >= 10 ? "text-emerald-600"
                        : appoRate >= 5 ? "text-amber-600"
                        : "text-slate-400"
                      }`}>{Math.round(appoRate)}%</span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-slate-200 rounded-full"
                      style={{ width: `${(data.total / maxTotal) * 100}%` }}
                    />
                    {data.appo > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                        style={{ width: `${(data.appo / maxTotal) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-4 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-slate-200 inline-block" />コール数</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-emerald-500 inline-block" />アポ数</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 直近7日のトレンド ── */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">直近7日のトレンド</h2>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-end gap-3" style={{ height: "120px" }}>
            {last7Days.map(d => {
              const barH = maxDay > 0 ? Math.max((d.total / maxDay) * 88, d.total > 0 ? 8 : 0) : 0;
              const appoH = d.total > 0 ? (d.appo / d.total) * barH : 0;
              const restH = barH - appoH;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-400 h-4 flex items-center">{d.total || ""}</span>
                  <div className="w-full flex flex-col justify-end rounded-t-md overflow-hidden" style={{ height: "88px" }}>
                    {d.total > 0 ? (
                      <>
                        <div className="w-full bg-violet-400 rounded-t-md" style={{ height: `${restH}px` }} />
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
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          全期間 結果内訳
          <span className="text-xs font-normal text-slate-400 ml-2">計{total}件</span>
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
          {RESULTS.filter(r => resultCounts[r] > 0).map(r => (
            <div key={r} className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium w-24 text-center shrink-0 ${RESULT_CONFIG[r].badge}`}>{r}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full ${RESULT_CONFIG[r].darkBg}`}
                  style={{ width: `${(resultCounts[r] / total) * 100}%` }} />
              </div>
              <span className="text-sm font-bold text-slate-800 w-8 text-right">{resultCounts[r]}</span>
              <span className="text-xs text-slate-400 w-10">{Math.round((resultCounts[r] / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
