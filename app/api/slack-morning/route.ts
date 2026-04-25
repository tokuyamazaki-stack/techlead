import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "SLACK_WEBHOOK_URL not set" }, { status: 500 });
  }

  // JST 今日の日付
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayJST = jstNow.toISOString().split("T")[0];

  const supabase = createServiceClient();

  // 全ワークスペースを取得
  const { data: workspaces, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name");

  if (wsError || !workspaces || workspaces.length === 0) {
    return NextResponse.json({ message: "no workspaces", date: todayJST });
  }

  let totalFollow = 0;
  let totalOverdue = 0;
  let totalToday = 0;

  for (const ws of workspaces) {
    // ワークスペースのコールリストを取得
    const { data: lists } = await supabase
      .from("call_lists")
      .select("id")
      .eq("workspace_id", ws.id);

    if (!lists || lists.length === 0) continue;

    const listIds = lists.map((l) => l.id);

    // フォローが必要な企業を取得
    const { data: companies } = await supabase
      .from("companies")
      .select("latest_result, next_date")
      .in("list_id", listIds)
      .in("latest_result", ["資料送付", "再コール", "担当者不在"]);

    if (!companies) continue;

    const follow = companies.filter(
      (c) => !c.next_date || c.next_date <= todayJST
    );
    const overdue = companies.filter(
      (c) => c.next_date && c.next_date < todayJST
    );
    const todayFollow = companies.filter(
      (c) => c.next_date === todayJST
    );

    totalFollow += follow.length;
    totalOverdue += overdue.length;
    totalToday += todayFollow.length;
  }

  const [year, month, day] = todayJST.split("-");
  const dateLabel = `${year}年${month}月${day}日`;

  const message = {
    text: `☀️ *${dateLabel} — 今日のフォロー確認*`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `☀️ 今日のフォロー確認 — ${dateLabel}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*📋 フォロー必要な企業*\n*${totalFollow}件*`,
          },
          {
            type: "mrkdwn",
            text: `*🔴 期限超過*\n*${totalOverdue}件*`,
          },
          {
            type: "mrkdwn",
            text: `*📅 本日フォロー予定*\n*${totalToday}件*`,
          },
        ],
      },
      ...(totalFollow === 0
        ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "✅ フォローが必要な企業はありません。新規架電に集中しましょう！",
              },
            },
          ]
        : [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `フォロータブで確認して、今日中に対応しましょう 💪`,
              },
            },
          ]),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "TechLeadを開く", emoji: true },
            url: "https://techlead-ebon.vercel.app",
            style: "primary",
          },
        ],
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    console.error("[slack-morning] Slack error:", res.status, await res.text());
    return NextResponse.json({ error: "Slack webhook failed" }, { status: 500 });
  }

  console.log("[slack-morning] sent:", { date: todayJST, totalFollow, totalOverdue, totalToday });
  return NextResponse.json({ ok: true, date: todayJST, totalFollow, totalOverdue, totalToday });
}
