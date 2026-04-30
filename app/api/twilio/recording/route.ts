import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "../../../lib/supabaseServer";
import Groq from "groq-sdk";
import type { ResultType } from "../../../lib/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `あなたはインサイドセールスの通話を分析するAIです。
通話の文字起こしを読んで、以下のJSON形式のみで返してください（説明文不要）：

{
  "result": "アポ獲得" | "資料送付" | "再コール" | "担当者不在" | "担当NG" | "受付NG",
  "memo": "通話の要点を2〜3文でまとめたメモ",
  "products": ["提案した商材（言及されたもの）"],
  "challenges": ["相手が抱えている課題"],
  "interests": ["相手が興味を示したポイント"],
  "ngReason": "NG理由（担当NG・受付NGのみ。それ以外は空文字）"
}

result 判定基準：
- アポ獲得：商談日程が確定した
- 資料送付：資料を送ることになった
- 再コール：後で改めて電話することになった
- 担当者不在：担当者に繋がらなかった
- 担当NG：担当者に断られた
- 受付NG：受付に断られた`;

export interface AiCallResult {
  result: ResultType;
  memo: string;
  products: string[];
  challenges: string[];
  interests: string[];
  ngReason: string;
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const conferenceId = String(body.get("FriendlyName") ?? "");
  const recordingUrl = String(body.get("RecordingUrl") ?? "");

  if (!conferenceId || !recordingUrl) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createServiceClient();
  await supabase.from("call_recordings").update({ status: "transcribing" }).eq("id", conferenceId);

  try {
    // Download recording from Twilio
    const creds = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const audioRes = await fetch(`${recordingUrl}.mp3`, {
      headers: { Authorization: `Basic ${creds}` },
    });
    const audioBuffer = await audioRes.arrayBuffer();
    const audioFile = new File([audioBuffer], "call.mp3", { type: "audio/mp3" });

    // Transcribe with Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      language: "ja",
    });
    const transcript = transcription.text;

    // Analyze with Groq LLM
    const chat = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `通話の文字起こし：\n\n${transcript}` },
      ],
    });

    const aiResult: AiCallResult = JSON.parse(chat.choices[0].message.content ?? "{}");

    await supabase.from("call_recordings").update({
      status: "done",
      transcript,
      ai_result: aiResult,
    }).eq("id", conferenceId);

  } catch {
    await supabase.from("call_recordings").update({ status: "error" }).eq("id", conferenceId);
  }

  return NextResponse.json({ ok: true });
}
