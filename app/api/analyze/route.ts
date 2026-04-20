import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ============================================================
// 営業ナレッジ（チームの経験則が溜まったらここを更新する）
// ============================================================
const SALES_KNOWLEDGE = `
【商材の概要】
- 採用動画制作：企業の採用ページや説明会で使う動画を制作。応募者の質・量を改善する
- 採用動画分析ツール：動画の視聴データ（離脱率・再生完了率など）を分析して採用効果を可視化する
- CRM：顧客情報・商談履歴を一元管理して営業効率を高めるツール

【BtoBテレアポの基準値】
- 業界平均アポ率：2〜5%（これを下回るリストは改善・廃棄を検討）
- 良好なアポ率：8%以上
- 1社あたりのコール上限目安：3回（それ以上は費用対効果が落ちる）
- コールカバレッジ80%超：リストをほぼ出し切っている状態

【採用系商材が刺さりやすいタイミング】
- 採用繁忙期：1〜3月（春採用）・9〜10月（秋採用）が最もニーズが高い
- 決算2〜3ヶ月前は採用予算を確保しやすく、動画制作の発注が入りやすい
- 採用がうまくいっていない企業（応募減少・内定辞退増加）は課題感が高くアポになりやすい

【ターゲット企業の特徴】
- 従業員数30〜300名が最もアポ取りやすい（小さすぎると予算なし、大きすぎると窓口NG）
- 採用活動をしている企業（求人掲載中・採用HP有り）が最優先ターゲット
- 売上5億〜50億円レンジが決裁スピードと予算のバランスが良い
- 人事部門がある企業（人事担当者がいる規模感）が決裁が早い

【NG理由別の対処法】
- "採用活動していない"：採用再開時期を確認してリマインド登録（リスト問題ではなくタイミング問題）
- "予算なし"：次の採用シーズン前（繁忙期2ヶ月前）に再アプローチ
- "競合他社と契約中"：契約更新時期を聞き出してリマインド登録（競合との差別化トークを準備）
- "担当者不在が続く"：架電時間帯を変える（午前10〜11時、午後2〜4時が繋がりやすい）
- "電話お断り"：受付突破トークの見直し（採用担当者・人事部長への取り次ぎ依頼）
- "興味なし"：ターゲット選定の見直し（採用課題が顕在化している企業に絞る）

【Sansan絞り込みの効果的な条件】
- 業種：IT・コンサル・不動産・介護・飲食チェーンなど採用競争が激しい業界を優先
- 従業員数：30〜300名
- 売上：5億〜50億円
- 採用HPや求人掲載が確認できる企業を優先

// TODO: チームメンバーとの話し合い後にここを更新
// - 実際にアポが取れた企業の共通点
// - 自社特有のNG理由と対処法
// - 採用動画・分析ツール・CRMそれぞれの刺さりやすい業種
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
