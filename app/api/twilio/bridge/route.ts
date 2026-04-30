import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "../../../lib/supabaseServer";

export async function POST(req: NextRequest) {
  const { companyId, userId, workspaceId } = await req.json();

  const conferenceId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const supabase = createServiceClient();
  await supabase.from("call_recordings").insert({
    id: conferenceId,
    company_id: companyId,
    user_id: userId,
    workspace_id: workspaceId,
    status: "waiting",
  });

  return NextResponse.json({
    conferenceId,
    bridgeNumber: process.env.TWILIO_PHONE_NUMBER,
  });
}
