import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ============================================================
// 営業ナレッジ（チームの経験則が溜まったらここを更新する）
// ============================================================
const SALES_KNOWLEDGE = `
【BtoBテレアポの基準値】
- 業界平均アポ率：2〜5%（これを下回るリストは改善・廃棄を検討）
- 良好なアポ率：8%以上
- 1社あたりのコール上限目安：3回（それ以上は費用対効果が落ちる）
- コールカバレッジ80%超：リストをほぼ出し切っている状態

【決算月とアプローチタイミング】
- 決算2〜3ヶ月前が予算確保しやすく最もアポが取れやすい
- 決算月当月・直後は担当者が多忙でアポ取りにくい
- 3月決算（日本企業最多）：12〜1月がベストタイミング

【NG理由別の対処法】
- "予算なし"：決算期前に時期を変えて再アプローチ（ターゲット自体は正しい）
- "競合他社と契約中"：契約更新時期を聞き出してリマインド登録（リスト問題ではなくトーク問題）
- "担当者不在が続く"：架電時間帯を変える（午前10〜11時、午後2〜4時が繋がりやすい）
- "電話お断り"：受付突破トークの見直しが必要（リスト問題ではない）
- "興味なし"：ターゲット選定の見直し、もしくはトップトークの改善

【Sansan絞り込みの効果的な条件】
- 従業員数50〜500名が最もアポ取りやすい（小さすぎると予算なし、大きすぎると窓口NG）
- 売上10億〜100億円レンジが決裁スピードと予算のバランスが良い
- 設立5年以上の企業は組織が安定していてアポにつながりやすい
- 業種は競合が少なく課題感が高いニッチ業種を狙うと効果的

// TODO: チームメンバーとの話し合い後にここを更新
// - 自社商材が刺さりやすい業種・企業規模
// - 過去に受注できた企業の共通点
// - 自社特有のNG理由と対処法
// - 月ごとの傾向・季節性
`;

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
以下の「営業ナレッジ」を判断基準として使い、コールデータを分析してください。

${SALES_KNOWLEDGE}

【コールデータ（リスト別）】
${JSON.stringify(summary, null, 2)}

データの読み方：
- call_coverage：コール済み割合。低い＝まだ可能性がある、高い＝出し切りに近い
- ng_reasons：断られた具体的な理由（NG理由別の対処法を参照して分析すること）
- avg_calls_per_company：1社あたり平均コール回数（上限目安3回と比較すること）
- fiscal_month：Sansanで絞った決算月条件（決算タイミングと照合すること）

以下のJSON形式で返してください。余分な説明・マークダウンは不要です：

{
  "overall_diagnosis": "全体診断。アポ率を業界平均（2〜5%）と比較して現状を評価し、最大のボトルネックを特定する",
  "list_analyses": [
    {
      "list_name": "リスト名",
      "grade": "A〜D（営業ナレッジの基準値と照合して評価）",
      "headline": "このリストの本質的な問題・強みを一言で",
      "numbers": "アポ率・NG率・カバレッジなど重要な数字を業界基準と比較して解釈",
      "bottleneck": "NG理由のパターンと営業ナレッジを照合した具体的なボトルネック",
      "verdict": "continue / refine / pivot / drop のどれか",
      "verdict_reason": "基準値・NG理由・カバレッジをもとにした判断根拠",
      "next_sansan": "業種・売上・従業員数・決算月など具体的な絞り込み変更案",
      "pitch_hint": "NG理由別の対処法を参照したトーク改善の具体的なヒント"
    }
  ],
  "best_list": {
    "name": "最もROIが高いリスト名",
    "reason": "なぜ最も効果的か（数字・基準値との比較で）",
    "replicate": "このリストの成功条件をどう横展開するか（具体的なSansan条件として）"
  },
  "ng_pattern_insight": "NG理由を横断して見たとき、これはターゲット選定の問題かトークの問題かを判断し、対処法を提示",
  "priority_actions": [
    {
      "priority": "高",
      "action": "今週中にやるべき具体的なアクション",
      "expected_impact": "営業ナレッジに基づいた期待効果（定量的に）"
    }
  ]
}

ルール：
- 一般論ではなく「このデータのX%は基準値Y%を下回っているのでZすべき」という形で書く
- priority_actionsは最大3つ、優先度高から順に
- listが1つしかなくてもlist_analysesに含める
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
