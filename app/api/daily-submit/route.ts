import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "../../lib/supabaseServer";
import type { ReportFormField, FormFieldType } from "../../lib/types";

export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
  name: string;
  report_form_url: string;
  report_form_fields: ReportFormField[];
}

interface SubmitResult {
  userId: string;
  name: string;
  status: "ok" | "skipped" | "error";
  reason?: string;
  httpStatus?: number;
}

export async function GET(req: NextRequest) {
  // Vercel Cron が付与する Authorization ヘッダーで認証
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // JST 今日の日付（サーバーは UTC なので +9h）
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayJST = jstNow.toISOString().split("T")[0];

  const supabase = createServiceClient();

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, report_form_url, report_form_fields")
    .not("report_form_url", "is", null)
    .neq("report_form_url", "");

  if (profileError) {
    console.error("[daily-submit] profiles error:", profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: "no profiles with form url", date: todayJST });
  }

  const results: SubmitResult[] = await Promise.all(
    (profiles as ProfileRow[]).map((p) => submitForUser(supabase, p, todayJST)),
  );

  const summary = {
    date: todayJST,
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    error: results.filter((r) => r.status === "error").length,
    details: results,
  };
  console.log("[daily-submit] done:", JSON.stringify(summary));
  return NextResponse.json(summary);
}

async function submitForUser(
  supabase: ReturnType<typeof createServiceClient>,
  profile: ProfileRow,
  todayJST: string,
): Promise<SubmitResult> {
  const base = { userId: profile.id, name: profile.name };

  const fields = profile.report_form_fields;
  if (!fields || fields.length === 0) {
    return { ...base, status: "skipped", reason: "no form fields configured" };
  }

  const formUrl = buildFormResponseUrl(profile.report_form_url);
  if (!formUrl) {
    return { ...base, status: "skipped", reason: "invalid form url" };
  }

  const { data: records, error } = await supabase
    .from("call_records")
    .select("result")
    .eq("user_id", profile.id)
    .eq("date", todayJST);

  if (error) {
    return { ...base, status: "error", reason: error.message };
  }

  const rows = records ?? [];
  const count = (result: string) => rows.filter((r) => r.result === result).length;
  const totalCalls = rows.length;
  const appo = count("アポ獲得");
  const material = count("資料送付");
  const recall = count("再コール");
  const absent = count("担当者不在");
  const ngTotal = count("担当NG") + count("受付NG");
  const appoRate = totalCalls > 0 ? Math.round((appo / totalCalls) * 100) : 0;

  const [year, month, day] = todayJST.split("-");
  const valueMap: Record<FormFieldType, string> = {
    none: "",
    date: todayJST,
    assignee: profile.name || "",
    totalCalls: String(totalCalls),
    appo: String(appo),
    material: String(material),
    recall: String(recall),
    absent: String(absent),
    ngTotal: String(ngTotal),
    appoRate: String(appoRate),
  };

  const body = new URLSearchParams();
  for (const f of fields) {
    if (f.dataType === "none") continue;
    if (f.dataType === "date") {
      body.set(`${f.entryId}_year`, year);
      body.set(`${f.entryId}_month`, String(Number(month)));
      body.set(`${f.entryId}_day`, String(Number(day)));
    } else {
      const val = valueMap[f.dataType];
      if (val !== undefined && val !== "") body.set(f.entryId, val);
    }
  }

  try {
    const res = await fetch(formUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "manual",
    });
    // Google Forms は成功時 302 を返す（redirect:"manual" で status=0 になることもある）
    const ok = res.status === 0 || res.status === 302 || res.ok;
    return { ...base, status: ok ? "ok" : "error", httpStatus: res.status };
  } catch (e) {
    return { ...base, status: "error", reason: e instanceof Error ? e.message : String(e) };
  }
}

function buildFormResponseUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    if (rawUrl.includes("/formResponse")) return rawUrl;
    const url = new URL(rawUrl);
    url.pathname = url.pathname.replace(/\/viewform$/, "/formResponse");
    return url.toString();
  } catch {
    return null;
  }
}
