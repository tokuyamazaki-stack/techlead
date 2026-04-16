import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "テキストが空です" }, { status: 400 });
  }

  const prompt = `
以下のテキストはSansanという名刺管理サービスのページをコピーしたものです。
ナビゲーション・メニュー・フッター・説明文などのUI要素は無視して、
企業・会社のデータだけを抽出してJSON配列として返してください。

各企業のデータは以下の形式にしてください：
{
  "company": "会社名",
  "phone": "電話番号（なければ空文字）",
  "address": "住所（なければ空文字）",
  "industry": "業種（なければ空文字）",
  "subIndustry": "業種の中分類（なければ空文字）",
  "employees": "従業員数（なければ空文字）",
  "revenue": "売上・年商（なければ空文字、例：10億円、300億円以上）",
  "contactName": "担当者名・人物名（なければ空文字、例：田中 太郎）",
  "directPhone": "担当者の直通電話（なければ空文字）",
  "contactEmail": "担当者のメールアドレス（なければ空文字）"
}

ルール：
- 必ずJSON配列だけを返してください。説明文やマークダウンは不要です
- 「株式会社」「有限会社」「合同会社」などが含まれる行が会社名の可能性が高い
- ナビゲーション・メニュー・ボタン・説明文などは無視する
- 会社名が1件も見つからない場合は空配列 [] を返す
- 電話番号はハイフン区切りで返してください（例：03-1234-5678）

テキスト：
${text}
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "解析結果が取得できませんでした" }, { status: 500 });
    }

    const companies = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ companies });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI解析に失敗しました" }, { status: 500 });
  }
}
