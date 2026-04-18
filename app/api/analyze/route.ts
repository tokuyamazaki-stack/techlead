import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AIキーが設定されていません" }, { status: 500 });
  }
  const groq = new Groq({ apiKey });

  const { summary } = await req.json();

  if (!summary) {
    return NextResponse.json({ error: "データが空です" }, { status: 400 });
  }

  const prompt = `
あなたはインサイドセールス（テレアポ）の専門コンサルタントです。
以下のコール結果データを分析して、具体的な改善アドバイスを日本語で提供してください。

【コールデータサマリー】
${JSON.stringify(summary, null, 2)}

以下の形式でJSON返却してください。説明文やマークダウン記法は不要です：

{
  "verdict": "全体評価（1〜2文で。率直に）",
  "strengths": ["うまくいっていること1", "うまくいっていること2"],
  "issues": ["課題1", "課題2"],
  "industryInsights": [
    {
      "industry": "業界名",
      "comment": "この業界に対するコメント（アポ率・傾向・次のアクション）"
    }
  ],
  "sansanTips": [
    "Sansanでの絞り方の具体的なアドバイス1",
    "Sansanでの絞り方の具体的なアドバイス2"
  ],
  "nextActions": [
    {
      "priority": "高",
      "action": "具体的なアクション",
      "reason": "その理由"
    }
  ]
}

ルール：
- 必ずJSONだけを返す
- データが少なくても推測で分析する
- 具体的・実践的なアドバイスを心がける
- ポジティブなことも正直に伝える
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "分析結果の取得に失敗しました" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI分析に失敗しました" }, { status: 500 });
  }
}
