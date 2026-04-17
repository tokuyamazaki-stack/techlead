/**
 * Supabaseとのデータのやり取りをまとめたファイル
 * localStorageの代わりにこれを使う
 */

import { supabase } from "./supabase";
import type { CallList, Company, CallRecord, UserSettings, TagConfig, GoalConfig } from "./types";

// ============================================================
// ユーザー設定
// ============================================================

export async function loadUserSettings(userId: string): Promise<UserSettings | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

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
    .single();

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
    .single();

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
// コールリスト＋企業データ（まとめて取得）
// ============================================================

export async function loadAllLists(userId: string): Promise<CallList[]> {
  const { data: lists } = await supabase
    .from("call_lists")
    .select("*")
    .eq("user_id", userId)
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

// ============================================================
// リスト保存
// ============================================================

export async function saveList(userId: string, list: CallList) {
  await supabase.from("call_lists").upsert({
    id: list.id,
    user_id: userId,
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
// 企業保存
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

  // コール履歴を保存
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
