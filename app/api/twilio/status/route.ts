import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "../../../lib/supabaseServer";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ status: "not_found" });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("call_recordings")
    .select("status, transcript, ai_result")
    .eq("id", id)
    .maybeSingle();

  return NextResponse.json(data ?? { status: "not_found" });
}
