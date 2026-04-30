import { NextRequest, NextResponse } from "next/server";

function twiml(conferenceId: string): string {
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference
      record="record-from-start"
      recordingStatusCallback="${callbackUrl}"
      recordingStatusCallbackMethod="POST"
      recordingStatusCallbackEvent="completed"
      beep="false"
      startConferenceOnEnter="true"
      endConferenceOnExit="false"
      waitUrl=""
    >${conferenceId}</Conference>
  </Dial>
</Response>`;
}

export async function GET(req: NextRequest) {
  const conferenceId = req.nextUrl.searchParams.get("conf") ?? "default";
  return new NextResponse(twiml(conferenceId), {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  const conferenceId = req.nextUrl.searchParams.get("conf") ?? "default";
  return new NextResponse(twiml(conferenceId), {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
