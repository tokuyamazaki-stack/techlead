/**
 * Supabaseとのデータのやり取りをまとめたファイル
 */

import { supabase } from "./supabase";
import type { CallList, Company, CallRecord, UserSettings, TagConfig, GoalConfig } from "./types";

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
}

export interface WorkspaceMember {
  userId: string;
  role: string;
  name: string;
  email: string;
}

// ============================================================
// ワークスペース
// ============================================================

export async function getMyWorkspace(userId: string): Promise<Workspace | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(id, name, owner_id)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!data?.workspaces) return null;
  const w = data.workspaces as unknown as { id: string; name: string; owner_id: string };
  return { id: w.id, name: w.name, ownerId: w.owner_id };
}

export async function createWorkspace(userId: string, name: string): Promise<Workspace> {
  const { data: ws, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name, owner_id: userId })
    .select()
    .single();

  if (wsError) throw new Error(`ワークスペース作成エラー: ${wsError.message}`);
  if (!ws) throw new Error("ワークスペースの作成に失敗しました");

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) throw new Error(`メンバー追加エラー: ${memberError.message}`);

  return { id: ws.id, name: ws.name, ownerId: ws.owner_id };
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId);

  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return members.map((m) => {
    const p = profileMap.get(m.user_id);
    return {
      userId: m.user_id,
      role: m.role,
      name: p?.name || "",
      email: p?.email || "",
    };
  });
}

// 招待トークンを作成して返す
export async function createInvitation(workspaceId: string, userId: string): Promise<string> {
  const { data } = await supabase
    .from("workspace_invitations")
    .insert({ workspace_id: workspaceId, created_by: userId })
    .select("token")
    .single();
  return data?.token ?? "";
}

// 招待トークンでワークスペースに参加
export async function joinByToken(token: string, userId: string): Promise<Workspace | null> {
  const { data: inv } = await supabase
    .from("workspace_invitations")
    .select("workspace_id")
    .eq("token", token)
    .single();

  if (!inv) return null;

  await supabase.from("workspace_members").upsert({
    workspace_id: inv.workspace_id,
    user_id: userId,
    role: "member",
  });

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name, owner_id")
    .eq("id", inv.workspace_id)
    .single();

  if (!ws) return null;
  return { id: ws.id, name: ws.name, ownerId: ws.owner_id };
}

// ============================================================
// ユーザー設定
// ============================================================

export async function loadUserSettings(userId: string): Promise<UserSettings | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;
  return {
    name: data.name || "",
    phone: data.phone || "",
    email: data.email || "",
    calendarUrl: data.calendar_url || "",
    reportFormUrl: data.report_form_url || "",
    reportFormFields: data.report_form_fields || [],
  };
}

export async function saveUserSettings(userId: string, settings: UserSettings) {
  await supabase.from("profiles").upsert({
    id: userId,
    name: settings.name,
    phone: settings.phone,
    email: settings.email,
    calendar_url: settings.calendarUrl,
    report_form_url: settings.reportFormUrl,
    report_form_fields: settings.reportFormFields || [],
    updated_at: new Date().toISOString(),
  });
}

// ============================================================
// タグ設定
// ============================================================

export async function loadTagConfig(userId: string): Promise<TagConfig | null> {
  const { data } = await supabase
    .from("tag_configs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  return {
    products: data.products || [],
    challenges: data.challenges || [],
    interests: data.interests || [],
  };
}

export async function saveTagConfig(userId: string, config: TagConfig) {
  await supabase.from("tag_configs").upsert({
    user_id: userId,
    products: config.products,
    challenges: config.challenges,
    interests: config.interests,
  });
}

// ============================================================
// 目標設定
// ============================================================

export async function loadGoalConfig(userId: string): Promise<GoalConfig | null> {
  const { data } = await supabase
    .from("goal_configs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  return {
    dailyCallsPerPerson: data.daily_calls_per_person,
    monthlyAppoPerPerson: data.monthly_appo_per_person,
    teamDailyCalls: data.team_daily_calls,
    teamMonthlyAppo: data.team_monthly_appo,
  };
}

export async function saveGoalConfig(userId: string, config: GoalConfig) {
  await supabase.from("goal_configs").upsert({
    user_id: userId,
    daily_calls_per_person: config.dailyCallsPerPerson,
    monthly_appo_per_person: config.monthlyAppoPerPerson,
    team_daily_calls: config.teamDailyCalls,
    team_monthly_appo: config.teamMonthlyAppo,
  });
}

// ============================================================
// コールリスト（ワークスペース単位）
// ============================================================

export async function loadAllLists(workspaceId: string): Promise<CallList[]> {
  const { data: lists } = await supabase
    .from("call_lists")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (!lists || lists.length === 0) return [];

  const listIds = lists.map((l) => l.id);

  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .in("list_id", listIds);

  const companyIds = (companies || []).map((c) => c.id);

  const { data: records } = companyIds.length > 0
    ? await supabase.from("call_records").select("*").in("company_id", companyIds)
    : { data: [] };

  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    industry: l.industry || "",
    fiscalMonthFrom: l.fiscal_month_from || "",
    fiscalMonthTo: l.fiscal_month_to || "",
    revenueFrom: l.revenue_from || "",
    revenueTo: l.revenue_to || "",
    createdAt: l.created_at,
    companies: (companies || [])
      .filter((c) => c.list_id === l.id)
      .map((c) => ({
        id: c.id,
        company: c.company,
        phone: c.phone || "",
        industry: c.industry || "",
        subIndustry: c.sub_industry || "",
        employees: c.employees || "",
        revenue: c.revenue || "",
        address: c.address || "",
        contactName: c.contact_name || "",
        directPhone: c.direct_phone || "",
        contactEmail: c.contact_email || "",
        assignee: c.assignee || "",
        latestResult: c.latest_result || null,
        nextDate: c.next_date || "",
        importedAt: c.imported_at,
        callHistory: (records || [])
          .filter((r) => r.company_id === c.id)
          .map((r) => ({
            id: r.id,
            date: r.date,
            result: r.result,
            memo: r.memo || "",
            assignee: r.assignee || "",
            products: r.products || [],
            challenges: r.challenges || [],
            interests: r.interests || [],
            ngReason: r.ng_reason || "",
          } as CallRecord)),
      } as Company)),
  } as CallList));
}

export async function saveList(userId: string, workspaceId: string, list: CallList) {
  await supabase.from("call_lists").upsert({
    id: list.id,
    user_id: userId,
    workspace_id: workspaceId,
    name: list.name,
    industry: list.industry || "",
    fiscal_month_from: list.fiscalMonthFrom || "",
    fiscal_month_to: list.fiscalMonthTo || "",
    revenue_from: list.revenueFrom || "",
    revenue_to: list.revenueTo || "",
    created_at: list.createdAt,
  });

  for (const company of list.companies) {
    await saveCompany(userId, list.id, company);
  }
}

export async function deleteList(listId: string) {
  await supabase.from("call_lists").delete().eq("id", listId);
}

export async function updateListName(listId: string, name: string) {
  await supabase.from("call_lists").update({ name }).eq("id", listId);
}

// ============================================================
// 企業・コール履歴
// ============================================================

export async function saveCompany(userId: string, listId: string, company: Company) {
  await supabase.from("companies").upsert({
    id: company.id,
    list_id: listId,
    user_id: userId,
    company: company.company,
    phone: company.phone || "",
    industry: company.industry || "",
    sub_industry: company.subIndustry || "",
    employees: company.employees || "",
    revenue: company.revenue || "",
    address: company.address || "",
    contact_name: company.contactName || "",
    direct_phone: company.directPhone || "",
    contact_email: company.contactEmail || "",
    assignee: company.assignee || "",
    latest_result: company.latestResult || null,
    next_date: company.nextDate || "",
    imported_at: company.importedAt,
  });

  for (const record of company.callHistory) {
    await supabase.from("call_records").upsert({
      id: record.id,
      company_id: company.id,
      user_id: userId,
      date: record.date,
      result: record.result,
      memo: record.memo || "",
      assignee: record.assignee || "",
      products: record.products || [],
      challenges: record.challenges || [],
      interests: record.interests || [],
      ng_reason: record.ngReason || "",
    });
  }
}

// ============================================================
// 稼働時間
// ============================================================

export interface WorkingHoursRecord {
  userId: string;
  userName: string;
  date: string;
  hours: number;
}

export async function logWorkingHours(
  workspaceId: string,
  userId: string,
  userName: string,
  date: string,
  hours: number,
) {
  await supabase.from("working_hours").upsert(
    { workspace_id: workspaceId, user_id: userId, user_name: userName, date, hours },
    { onConflict: "workspace_id,user_id,date" },
  );
}

export async function getWorkingHours(
  workspaceId: string,
  from: string,
  to: string,
): Promise<WorkingHoursRecord[]> {
  const { data } = await supabase
    .from("working_hours")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("date", from)
    .lte("date", to);
  return (data || []).map((r) => ({
    userId: r.user_id,
    userName: r.user_name,
    date: r.date,
    hours: Number(r.hours),
  }));
}

// ============================================================
// リアルタイム架電状況
// ============================================================

export interface ActiveCallInfo {
  userId: string;
  userName: string;
  companyId: string;
  companyName: string;
  startedAt: string;
}

export async function setActiveCall(
  workspaceId: string,
  userId: string,
  userName: string,
  companyId: string,
  companyName: string,
) {
  await supabase.from("active_calls").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      user_name: userName,
      company_id: companyId,
      company_name: companyName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,user_id" },
  );
}

export async function clearActiveCall(workspaceId: string, userId: string) {
  await supabase
    .from("active_calls")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
}

export async function getActiveCalls(workspaceId: string): Promise<ActiveCallInfo[]> {
  const { data } = await supabase
    .from("active_calls")
    .select("*")
    .eq("workspace_id", workspaceId);
  return (data || []).map((r) => ({
    userId: r.user_id,
    userName: r.user_name,
    companyId: r.company_id,
    companyName: r.company_name,
    startedAt: r.started_at,
  }));
}
