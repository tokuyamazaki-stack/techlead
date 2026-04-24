import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://bczisqckvnajncfhogry.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjemlzcWNrdm5ham5jZmhvZ3J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQxMTIzNSwiZXhwIjoyMDkxOTg3MjM1fQ.kYfzsKkZaNoUjZmiBvDGX3_Xp-OTzEdQLey0YW0wCjo"
);

const WS = "6b58590c-2de7-45da-9238-418cca9e7323";
const TOKU = "cda3e6da-bf14-453f-9139-d196d6211175";
const KOTARO = "fc538076-d43e-4d6f-ac76-3c0c731818f9";
const KIM = "5b06065d-0257-4895-aee9-2413b90c1ff9";
const IWASAKI = "4d418c33-64b1-4fc4-8c8d-b0bbb1ff1fb0";
const HIRATSUKA = "eac2c191-07df-45d5-bf03-14f0c81deb3c";

// 既存会社の担当者を5人に分散
const updates = [
  { id: "b1111111-0000-0000-0000-000000000104", assignee: "金",   user_id: KIM },
  { id: "b1111111-0000-0000-0000-000000000106", assignee: "岩崎", user_id: IWASAKI },
  { id: "b1111111-0000-0000-0000-000000000108", assignee: "平塚", user_id: HIRATSUKA },
  { id: "b1111111-0000-0000-0000-000000000110", assignee: "金",   user_id: KIM },
  { id: "b1111111-0000-0000-0000-000000000202", assignee: "岩崎", user_id: IWASAKI },
  { id: "b1111111-0000-0000-0000-000000000204", assignee: "平塚", user_id: HIRATSUKA },
  { id: "b1111111-0000-0000-0000-000000000206", assignee: "金",   user_id: KIM },
  { id: "b1111111-0000-0000-0000-000000000208", assignee: "岩崎", user_id: IWASAKI },
  { id: "b1111111-0000-0000-0000-000000000210", assignee: "平塚", user_id: HIRATSUKA },
];

for (const u of updates) {
  await sb.from("companies").update({ assignee: u.assignee, user_id: u.user_id }).eq("id", u.id);
}
console.log("✓ 既存担当者を5人に分散");

// 追加会社12社
const newCompanies = [
  { id: "b2222222-0000-0000-0000-000000000101", user_id: KIM,       list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社グロースハック",     phone: "03-1111-3001", industry: "情報通信", sub_industry: "マーケティング", employees: "55名",  revenue: "6億",  address: "東京都渋谷区神南1-2-3",     contact_name: "原田 拓",  direct_phone: "03-1111-3002", contact_email: "harada@growthhack.co.jp",     assignee: "金",    latest_result: "再コール",   next_date: "2026-04-25", imported_at: "2026-04-06T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000102", user_id: IWASAKI,   list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社リクルートテック",   phone: "03-2222-4001", industry: "情報通信", sub_industry: "HRテック",      employees: "190名", revenue: "26億", address: "東京都千代田区飯田橋3-8-5",  contact_name: "岡本 直樹",direct_phone: "03-2222-4002", contact_email: "okamoto@recruittech.co.jp",   assignee: "岩崎",  latest_result: "アポ獲得",   next_date: "2026-04-29", imported_at: "2026-04-06T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000103", user_id: HIRATSUKA, list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社ビジョンクリエイト", phone: "03-3333-5001", industry: "情報通信", sub_industry: "Web制作",       employees: "78名",  revenue: "10億", address: "東京都目黒区自由が丘1-4-2", contact_name: "平野 恵",  direct_phone: "03-3333-5002", contact_email: "hirano@visioncreate.co.jp",   assignee: "平塚",  latest_result: "資料送付",   next_date: "2026-04-30", imported_at: "2026-04-07T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000104", user_id: KIM,       list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社スタートアップラボ", phone: "03-4444-6001", industry: "情報通信", sub_industry: "スタートアップ", employees: "30名",  revenue: "3億",  address: "東京都渋谷区渋谷2-1-1",     contact_name: "吉田 翔太",direct_phone: "03-4444-6002", contact_email: "yoshida@startuplab.co.jp",    assignee: "金",    latest_result: "担当者不在", next_date: "2026-04-26", imported_at: "2026-04-07T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000201", user_id: KIM,       list_id: "a1111111-1111-1111-1111-111111111102", company: "株式会社九州鉄工",          phone: "092-2222-3001", industry: "製造業", sub_industry: "鉄鋼加工",  employees: "290名", revenue: "45億", address: "福岡県北九州市八幡東区1-1-1",contact_name: "原口 義人",direct_phone: "092-2222-3002",contact_email: "haraguchi@kyushutekko.co.jp", assignee: "金",    latest_result: "アポ獲得",   next_date: "2026-04-28", imported_at: "2026-04-08T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000202", user_id: IWASAKI,   list_id: "a1111111-1111-1111-1111-111111111102", company: "三河電機株式会社",           phone: "0566-1234-001", industry: "製造業", sub_industry: "電気機器",  employees: "420名", revenue: "71億", address: "愛知県安城市今本町1-2-3",    contact_name: "服部 誠一",direct_phone: "0566-1234-002", contact_email: "hattori@mikawadeki.co.jp",   assignee: "岩崎",  latest_result: "資料送付",   next_date: "2026-05-02", imported_at: "2026-04-08T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000203", user_id: HIRATSUKA, list_id: "a1111111-1111-1111-1111-111111111102", company: "株式会社関東プラスチック",  phone: "048-1234-5001", industry: "製造業", sub_industry: "樹脂成形",  employees: "160名", revenue: "21億", address: "埼玉県さいたま市大宮区1-3-2",contact_name: "青木 俊",  direct_phone: "048-1234-5002", contact_email: "aoki@kantoplastic.co.jp",    assignee: "平塚",  latest_result: "再コール",   next_date: "2026-04-25", imported_at: "2026-04-09T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000204", user_id: TOKU,      list_id: "a1111111-1111-1111-1111-111111111102", company: "株式会社信州精機",           phone: "026-1234-5001", industry: "製造業", sub_industry: "精密機械",  employees: "240名", revenue: "36億", address: "長野県長野市南千歳1-1-1",   contact_name: "田村 隆",  direct_phone: "026-1234-5002", contact_email: "tamura@shinshuseiki.co.jp",  assignee: "山崎",  latest_result: "担当NG",    next_date: null,         imported_at: "2026-04-09T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000301", user_id: KIM,       list_id: "a1111111-1111-1111-1111-111111111103", company: "株式会社センチュリー21東京",phone: "03-5555-6001", industry: "不動産", sub_industry: "売買仲介",  employees: "105名", revenue: "18億", address: "東京都豊島区東池袋1-5-3",   contact_name: "松田 一成",direct_phone: "03-5555-6002", contact_email: "matsuda@c21tokyo.co.jp",     assignee: "金",    latest_result: "再コール",   next_date: "2026-04-26", imported_at: "2026-04-10T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000302", user_id: IWASAKI,   list_id: "a1111111-1111-1111-1111-111111111103", company: "株式会社アーバンリビング",  phone: "03-6666-8001", industry: "不動産", sub_industry: "賃貸管理",  employees: "88名",  revenue: "13億", address: "東京都墨田区錦糸1-2-4",    contact_name: "川田 恒",  direct_phone: "03-6666-8002", contact_email: "kawada@urbanliving.co.jp",   assignee: "岩崎",  latest_result: "アポ獲得",   next_date: "2026-04-29", imported_at: "2026-04-10T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000303", user_id: HIRATSUKA, list_id: "a1111111-1111-1111-1111-111111111103", company: "名古屋不動産株式会社",      phone: "052-5555-6001", industry: "不動産", sub_industry: "不動産仲介",employees: "135名", revenue: "22億", address: "愛知県名古屋市中区栄3-1-1", contact_name: "近藤 哲郎",direct_phone: "052-5555-6002",contact_email: "kondo@nagoyafudosan.co.jp",  assignee: "平塚",  latest_result: "資料送付",   next_date: "2026-05-01", imported_at: "2026-04-11T00:00:00Z" },
  { id: "b2222222-0000-0000-0000-000000000304", user_id: KIM,       list_id: "a1111111-1111-1111-1111-111111111103", company: "株式会社グリーンホーム",    phone: "03-7777-9001", industry: "不動産", sub_industry: "新築分譲",  employees: "62名",  revenue: "9億",  address: "東京都杉並区高円寺北1-2-1", contact_name: "三浦 陽子",direct_phone: "03-7777-9002", contact_email: "miura@greenhome.co.jp",      assignee: "金",    latest_result: null,        next_date: null,         imported_at: "2026-04-11T00:00:00Z" },
];

const { error: ce } = await sb.from("companies").insert(newCompanies);
if (ce) { console.error("companies error:", ce.message); process.exit(1); }
console.log("✓ 追加会社", newCompanies.length, "件");

const newRecords = [
  { id: "c2222222-0000-0000-0000-000000000101", company_id: "b2222222-0000-0000-0000-000000000101", user_id: KIM,       date: "2026-04-21", result: "再コール",   memo: "原田さんと話せた。採用動画に興味あり。予算確認後折り返しとのこと。",                   assignee: "金",   products: ["採用動画制作"], challenges: ["採用に困っている"], interests: ["費用対効果"] },
  { id: "c2222222-0000-0000-0000-000000000102", company_id: "b2222222-0000-0000-0000-000000000102", user_id: IWASAKI,   date: "2026-04-22", result: "アポ獲得",   memo: "4/29 10:00商談確定。採用動画分析ツールも一緒に提案予定。",                              assignee: "岩崎", products: ["採用動画制作", "採用動画分析ツール"], challenges: ["採用データを活用できていない"], interests: ["具体的な数字", "サービスの独自性"] },
  { id: "c2222222-0000-0000-0000-000000000103", company_id: "b2222222-0000-0000-0000-000000000103", user_id: HIRATSUKA, date: "2026-04-23", result: "資料送付",   memo: "平野さんに採用LP資料送付。来週フォロー予定。",                                          assignee: "平塚", products: ["採用LP制作"], challenges: ["応募が集まらない"], interests: ["導入事例・実績"] },
  { id: "c2222222-0000-0000-0000-000000000104", company_id: "b2222222-0000-0000-0000-000000000104", user_id: KIM,       date: "2026-04-24", result: "担当者不在", memo: "吉田さん不在。明日再コール。",                                                              assignee: "金",   products: [], challenges: [], interests: [] },
  { id: "c2222222-0000-0000-0000-000000000201", company_id: "b2222222-0000-0000-0000-000000000201", user_id: KIM,       date: "2026-04-21", result: "再コール",   memo: "原口さんと話せた。技術職採用に苦戦中とのこと。来週詳しく話したい。",                   assignee: "金",   products: ["採用動画制作"], challenges: ["採用に困っている", "応募が集まらない"], interests: ["費用対効果"] },
  { id: "c2222222-0000-0000-0000-000000000202", company_id: "b2222222-0000-0000-0000-000000000201", user_id: KIM,       date: "2026-04-24", result: "アポ獲得",   memo: "4/28 13:00商談確定。製造業向け採用動画の事例を持参予定。",                             assignee: "金",   products: ["採用動画制作", "採用ブランディング支援"], challenges: ["採用に困っている", "採用ブランドを強化したい"], interests: ["導入事例・実績", "スピード感"] },
  { id: "c2222222-0000-0000-0000-000000000203", company_id: "b2222222-0000-0000-0000-000000000202", user_id: IWASAKI,   date: "2026-04-23", result: "資料送付",   memo: "服部さんに資料送付。SNS採用にも興味持っていた。",                                      assignee: "岩崎", products: ["採用動画制作", "SNS採用支援"], challenges: ["内定辞退が多い"], interests: ["他社との違い"] },
  { id: "c2222222-0000-0000-0000-000000000204", company_id: "b2222222-0000-0000-0000-000000000203", user_id: HIRATSUKA, date: "2026-04-22", result: "再コール",   memo: "青木さん多忙。来週月曜に改めてとのこと。採用コンサルにも関心あり。",                   assignee: "平塚", products: ["採用動画制作", "採用コンサルティング"], challenges: ["採用コストを下げたい"], interests: ["費用対効果", "無料トライアル"] },
  { id: "c2222222-0000-0000-0000-000000000301", company_id: "b2222222-0000-0000-0000-000000000301", user_id: KIM,       date: "2026-04-23", result: "再コール",   memo: "松田さんと話せた。採用動画に興味。上長に確認してから折り返し。",                      assignee: "金",   products: ["採用動画制作"], challenges: ["採用に困っている"], interests: ["導入事例・実績"] },
  { id: "c2222222-0000-0000-0000-000000000302", company_id: "b2222222-0000-0000-0000-000000000302", user_id: IWASAKI,   date: "2026-04-22", result: "アポ獲得",   memo: "4/29 14:00商談確定。賃貸管理会社向け採用動画を提案予定。",                             assignee: "岩崎", products: ["採用動画制作"], challenges: ["採用に困っている", "応募が集まらない"], interests: ["スピード感", "サポート体制"] },
  { id: "c2222222-0000-0000-0000-000000000303", company_id: "b2222222-0000-0000-0000-000000000303", user_id: HIRATSUKA, date: "2026-04-24", result: "資料送付",   memo: "近藤さんに資料送付済み。採用LPも一緒に提案。",                                          assignee: "平塚", products: ["採用動画制作", "採用LP制作"], challenges: ["採用ブランドを強化したい"], interests: ["費用対効果", "導入事例・実績"] },
];

const { error: re } = await sb.from("call_records").insert(newRecords);
if (re) { console.error("records error:", re.message); process.exit(1); }
console.log("✓ 追加コール記録", newRecords.length, "件");

const newHours = [
  { workspace_id: WS, user_id: KIM,       user_name: "金",    date: "2026-04-21", hours: 3.5 },
  { workspace_id: WS, user_id: KIM,       user_name: "金",    date: "2026-04-22", hours: 4 },
  { workspace_id: WS, user_id: KIM,       user_name: "金",    date: "2026-04-23", hours: 4.5 },
  { workspace_id: WS, user_id: KIM,       user_name: "金",    date: "2026-04-24", hours: 5 },
  { workspace_id: WS, user_id: IWASAKI,   user_name: "岩崎",  date: "2026-04-21", hours: 4 },
  { workspace_id: WS, user_id: IWASAKI,   user_name: "岩崎",  date: "2026-04-22", hours: 3.5 },
  { workspace_id: WS, user_id: IWASAKI,   user_name: "岩崎",  date: "2026-04-23", hours: 5 },
  { workspace_id: WS, user_id: IWASAKI,   user_name: "岩崎",  date: "2026-04-24", hours: 4 },
  { workspace_id: WS, user_id: HIRATSUKA, user_name: "平塚",  date: "2026-04-21", hours: 3 },
  { workspace_id: WS, user_id: HIRATSUKA, user_name: "平塚",  date: "2026-04-22", hours: 4.5 },
  { workspace_id: WS, user_id: HIRATSUKA, user_name: "平塚",  date: "2026-04-23", hours: 3.5 },
  { workspace_id: WS, user_id: HIRATSUKA, user_name: "平塚",  date: "2026-04-24", hours: 4 },
];

const { error: he } = await sb.from("working_hours").insert(newHours);
if (he) { console.error("hours error:", he.message); process.exit(1); }
console.log("✓ 追加稼働時間", newHours.length, "件");
console.log("\n完了！");
