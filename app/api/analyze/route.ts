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
あなたはBtoBインサイドセールスの専門コンサルタントです。
テレアポチームが「どのリストを継続・改善・廃棄すべきか」「次のSansan検索条件をどう変えるか」を
数字に基づいて判断できるよう、具体的・実践的な分析をしてください。

【コールデータ（リスト別）】
${JSON.stringify(summary, null, 2)}

補足：
- call_coverage は「コール済み割合」。低い＝まだ可能性がある、高い＝ほぼ出し切っている
- ng_reasons は断られた具体的な理由
- avg_calls_per_company は1社あたり平均コール回数
- fiscal_month はSansanで絞った決算月条件
- revenue はSansanで絞った売上条件

以下のJSON形式で返してください。余分な説明・マークダウンは不要です：

{
  "overall_diagnosis": "全体を一言で診断。数字を引用しながら、チームが今どの段階にいるかを具体的に（例：アポ率X%は業界平均の約X倍/半分。主要ボトルネックはY）",
  "list_analyses": [
    {
      "list_name": "リスト名",
      "grade": "A〜D（AはROI高い、DはROI低くて続ける意味薄）",
      "headline": "このリストの本質的な問題・強みを一言で",
      "numbers": "コール数・アポ率・NG率など重要な数字の解釈",
      "bottleneck": "アポが取れていない・取れている具体的な原因（推測ではなくデータから）",
      "verdict": "continue（継続）/ refine（絞り直し）/ pivot（業界変更）/ drop（廃棄）のどれか",
      "verdict_reason": "なぜそう判断したか（数字ベースで）",
      "next_sansan": "次のSansan検索条件の具体的な変更案（業界・売上・従業員数・決算月など）",
      "pitch_hint": "このリストのNG理由から読み取れるトーク改善のヒント（あれば）"
    }
  ],
  "best_list": {
    "name": "最もROIが高いリスト名",
    "reason": "なぜ最も効果的か（数字で）",
    "replicate": "このリストの成功条件をどう横展開するか"
  },
  "ng_pattern_insight": "全リストのNG理由を横断して見えるパターン（トーク改善・ターゲット見直しどちらの問題か）",
  "priority_actions": [
    {
      "priority": "高",
      "action": "今週中にやるべき具体的なアクション",
      "expected_impact": "これをやるとどう変わるか（定量的に言えれば言う）"
    }
  ]
}

重要：
- データが少なくても、あるデータから最大限の洞察を引き出す
- 「〜が重要です」のような一般論は書かない。「このデータではX%なのでYをすべき」という形で
- listが1つしかなくてもlist_analysesに含める
- priority_actionsは最大3つ、優先度高から順に
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
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
