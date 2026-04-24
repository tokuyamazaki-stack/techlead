import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://bczisqckvnajncfhogry.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjemlzcWNrdm5ham5jZmhvZ3J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQxMTIzNSwiZXhwIjoyMDkxOTg3MjM1fQ.kYfzsKkZaNoUjZmiBvDGX3_Xp-OTzEdQLey0YW0wCjo"
);

const WS = "6b58590c-2de7-45da-9238-418cca9e7323";
const TOKU = "cda3e6da-bf14-453f-9139-d196d6211175";
const KOTARO = "fc538076-d43e-4d6f-ac76-3c0c731818f9";

const lists = [
  { id: "a1111111-1111-1111-1111-111111111101", workspace_id: WS, user_id: TOKU, name: "IT企業リスト_2026Q2", industry: "情報通信", created_at: "2026-04-01T00:00:00Z" },
  { id: "a1111111-1111-1111-1111-111111111102", workspace_id: WS, user_id: TOKU, name: "製造業リスト_2026Q2", industry: "製造業", created_at: "2026-04-03T00:00:00Z" },
  { id: "a1111111-1111-1111-1111-111111111103", workspace_id: WS, user_id: KOTARO, name: "不動産リスト_2026Q2", industry: "不動産仲介", created_at: "2026-04-07T00:00:00Z" },
];

const companies = [
  // IT企業リスト (List 1)
  { id: "b1111111-0000-0000-0000-000000000101", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社テックビジョン", phone: "03-1234-5001", industry: "情報通信", sub_industry: "ソフトウェア開発", employees: "150名", revenue: "18億", address: "東京都渋谷区道玄坂1-2-3", contact_name: "田中 健太", direct_phone: "03-1234-5002", contact_email: "tanaka@techvision.co.jp", assignee: "山崎", latest_result: "アポ獲得", next_date: "2026-04-28", imported_at: "2026-04-01T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000102", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社デジタルフロンティア", phone: "03-2345-6001", industry: "情報通信", sub_industry: "ITサービス", employees: "280名", revenue: "35億", address: "東京都新宿区西新宿2-4-1", contact_name: "鈴木 美咲", direct_phone: "03-2345-6002", contact_email: "suzuki@digitalfrontier.co.jp", assignee: "山崎", latest_result: "資料送付", next_date: "2026-04-30", imported_at: "2026-04-01T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000103", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社クラウドネクスト", phone: "03-3456-7001", industry: "情報通信", sub_industry: "クラウドサービス", employees: "95名", revenue: "12億", address: "東京都港区芝公園3-5-8", contact_name: "佐藤 大輔", direct_phone: "03-3456-7002", contact_email: "sato@cloudnext.co.jp", assignee: "山崎", latest_result: "再コール", next_date: "2026-04-25", imported_at: "2026-04-02T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000104", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111101", company: "合同会社スマートシステムズ", phone: "03-4567-8001", industry: "情報通信", sub_industry: "システム開発", employees: "45名", revenue: "5億", address: "東京都千代田区神田1-1-1", contact_name: "中村 翔", direct_phone: "03-4567-8002", contact_email: "nakamura@smartsys.co.jp", assignee: "長尾", latest_result: "担当者不在", next_date: "2026-04-26", imported_at: "2026-04-02T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000105", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社イノベートラボ", phone: "03-5678-9001", industry: "情報通信", sub_industry: "AI開発", employees: "200名", revenue: "28億", address: "東京都目黒区中目黒1-3-5", contact_name: "高橋 麻衣", direct_phone: "03-5678-9002", contact_email: "takahashi@innovatelab.co.jp", assignee: "山崎", latest_result: "担当NG", next_date: null, imported_at: "2026-04-03T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000106", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社ネットワークプラス", phone: "03-6789-0001", industry: "情報通信", sub_industry: "ネットワーク", employees: "120名", revenue: "15億", address: "東京都品川区大崎2-1-1", contact_name: "山田 浩二", direct_phone: "03-6789-0002", contact_email: "yamada@networkplus.co.jp", assignee: "長尾", latest_result: "受付NG", next_date: null, imported_at: "2026-04-03T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000107", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社データソリューション", phone: "03-7890-1001", industry: "情報通信", sub_industry: "データ分析", employees: "75名", revenue: "9億", address: "東京都中央区銀座4-2-6", contact_name: "松本 由美", direct_phone: "03-7890-1002", contact_email: "matsumoto@datasol.co.jp", assignee: "山崎", latest_result: null, next_date: null, imported_at: "2026-04-04T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000108", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社サイバーリンク", phone: "03-8901-2001", industry: "情報通信", sub_industry: "セキュリティ", employees: "180名", revenue: "22億", address: "東京都渋谷区恵比寿1-4-2", contact_name: "伊藤 誠", direct_phone: "03-8901-2002", contact_email: "ito@cyberlink.co.jp", assignee: "長尾", latest_result: null, next_date: null, imported_at: "2026-04-04T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000109", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社モバイルテック", phone: "03-9012-3001", industry: "情報通信", sub_industry: "モバイル開発", employees: "60名", revenue: "7億", address: "東京都豊島区池袋2-5-3", contact_name: "渡辺 健", direct_phone: "03-9012-3002", contact_email: "watanabe@mobiletech.co.jp", assignee: "山崎", latest_result: null, next_date: null, imported_at: "2026-04-05T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000110", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111101", company: "株式会社フィンテックジャパン", phone: "03-0123-4001", industry: "情報通信", sub_industry: "フィンテック", employees: "320名", revenue: "48億", address: "東京都千代田区大手町1-6-1", contact_name: "小林 奈々", direct_phone: "03-0123-4002", contact_email: "kobayashi@fintechjp.co.jp", assignee: "長尾", latest_result: null, next_date: null, imported_at: "2026-04-05T00:00:00Z" },

  // 製造業リスト (List 2)
  { id: "b1111111-0000-0000-0000-000000000201", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111102", company: "株式会社精密機工", phone: "052-1234-5001", industry: "製造業", sub_industry: "精密機械", employees: "380名", revenue: "62億", address: "愛知県名古屋市中村区名駅3-1-1", contact_name: "加藤 雄一", direct_phone: "052-1234-5002", contact_email: "kato@seimitsukiko.co.jp", assignee: "山崎", latest_result: "アポ獲得", next_date: "2026-04-29", imported_at: "2026-04-03T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000202", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111102", company: "株式会社東海製作所", phone: "052-2345-6001", industry: "製造業", sub_industry: "金属加工", employees: "220名", revenue: "31億", address: "愛知県名古屋市港区港明1-2-3", contact_name: "木村 拓哉", direct_phone: "052-2345-6002", contact_email: "kimura@tokaiseisaku.co.jp", assignee: "長尾", latest_result: "資料送付", next_date: "2026-05-02", imported_at: "2026-04-03T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000203", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111102", company: "山田工業株式会社", phone: "06-1234-5001", industry: "製造業", sub_industry: "電子部品", employees: "450名", revenue: "78億", address: "大阪府大阪市西区靭本町1-3-2", contact_name: "山田 一郎", direct_phone: "06-1234-5002", contact_email: "yamada@yamadakogyo.co.jp", assignee: "山崎", latest_result: "再コール", next_date: "2026-04-25", imported_at: "2026-04-04T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000204", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111102", company: "株式会社関西プレス", phone: "06-2345-6001", industry: "製造業", sub_industry: "プレス加工", employees: "180名", revenue: "24億", address: "大阪府大阪市東成区大今里2-1-5", contact_name: "西村 博", direct_phone: "06-2345-6002", contact_email: "nishimura@kansaipress.co.jp", assignee: "長尾", latest_result: "担当者不在", next_date: "2026-04-26", imported_at: "2026-04-04T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000205", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111102", company: "北陸製造株式会社", phone: "076-1234-5001", industry: "製造業", sub_industry: "樹脂成形", employees: "130名", revenue: "16億", address: "富山県富山市奥田新町1-1-1", contact_name: "森 義明", direct_phone: "076-1234-5002", contact_email: "mori@hokurikuseizo.co.jp", assignee: "山崎", latest_result: "担当NG", next_date: null, imported_at: "2026-04-05T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000206", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111102", company: "中部鉄工株式会社", phone: "052-3456-7001", industry: "製造業", sub_industry: "鉄鋼加工", employees: "260名", revenue: "42億", address: "愛知県豊田市元町1-2-3", contact_name: "太田 勝", direct_phone: "052-3456-7002", contact_email: "ota@chubuchutetsu.co.jp", assignee: "長尾", latest_result: null, next_date: null, imported_at: "2026-04-06T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000207", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111102", company: "株式会社近畿精工", phone: "06-3456-7001", industry: "製造業", sub_industry: "精密部品", employees: "95名", revenue: "11億", address: "大阪府東大阪市荒本北1-4-17", contact_name: "林 正樹", direct_phone: "06-3456-7002", contact_email: "hayashi@kinkiseiko.co.jp", assignee: "山崎", latest_result: null, next_date: null, imported_at: "2026-04-06T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000208", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111102", company: "東名工業株式会社", phone: "052-4567-8001", industry: "製造業", sub_industry: "自動車部品", employees: "540名", revenue: "95億", address: "愛知県刈谷市相生町1-1-1", contact_name: "石川 修", direct_phone: "052-4567-8002", contact_email: "ishikawa@tomeikogyp.co.jp", assignee: "長尾", latest_result: null, next_date: null, imported_at: "2026-04-07T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000209", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111102", company: "株式会社浜松テクノ", phone: "053-1234-5001", industry: "製造業", sub_industry: "光学機器", employees: "310名", revenue: "51億", address: "静岡県浜松市中区鍛冶町1-1", contact_name: "鈴木 英二", direct_phone: "053-1234-5002", contact_email: "suzuki@hamamatsutechno.co.jp", assignee: "山崎", latest_result: null, next_date: null, imported_at: "2026-04-07T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000210", user_id: TOKU, list_id: "a1111111-1111-1111-1111-111111111102", company: "日本金型工業株式会社", phone: "06-4567-8001", industry: "製造業", sub_industry: "金型製造", employees: "170名", revenue: "19億", address: "大阪府八尾市跡部本町1-2-3", contact_name: "中野 義雄", direct_phone: "06-4567-8002", contact_email: "nakano@nipponkanagata.co.jp", assignee: "長尾", latest_result: null, next_date: null, imported_at: "2026-04-08T00:00:00Z" },

  // 不動産リスト (List 3)
  { id: "b1111111-0000-0000-0000-000000000301", user_id: KOTARO, list_id: "a1111111-1111-1111-1111-111111111103", company: "株式会社東京不動産", phone: "03-1111-2001", industry: "不動産", sub_industry: "不動産仲介", employees: "85名", revenue: "14億", address: "東京都港区赤坂3-2-1", contact_name: "斎藤 健", direct_phone: "03-1111-2002", contact_email: "saito@tokyofudosan.co.jp", assignee: "長尾", latest_result: "アポ獲得", next_date: "2026-04-28", imported_at: "2026-04-07T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000302", user_id: KOTARO, list_id: "a1111111-1111-1111-1111-111111111103", company: "株式会社ハウスパートナー", phone: "03-2222-3001", industry: "不動産", sub_industry: "売買仲介", employees: "120名", revenue: "20億", address: "東京都新宿区四谷1-3-2", contact_name: "藤田 康介", direct_phone: "03-2222-3002", contact_email: "fujita@housepartner.co.jp", assignee: "長尾", latest_result: "資料送付", next_date: "2026-05-01", imported_at: "2026-04-07T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000303", user_id: KOTARO, list_id: "a1111111-1111-1111-1111-111111111103", company: "株式会社ライフホーム", phone: "03-3333-4001", industry: "不動産", sub_industry: "賃貸管理", employees: "65名", revenue: "8億", address: "東京都世田谷区三軒茶屋1-5-3", contact_name: "坂本 真", direct_phone: "03-3333-4002", contact_email: "sakamoto@lifehome.co.jp", assignee: "長尾", latest_result: "再コール", next_date: "2026-04-25", imported_at: "2026-04-08T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000304", user_id: KOTARO, list_id: "a1111111-1111-1111-1111-111111111103", company: "大阪不動産株式会社", phone: "06-5555-6001", industry: "不動産", sub_industry: "不動産仲介", employees: "150名", revenue: "25億", address: "大阪府大阪市北区梅田2-4-9", contact_name: "上田 敏夫", direct_phone: "06-5555-6002", contact_email: "ueda@osakafudosan.co.jp", assignee: "長尾", latest_result: "担当者不在", next_date: "2026-04-26", imported_at: "2026-04-08T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000305", user_id: KOTARO, list_id: "a1111111-1111-1111-1111-111111111103", company: "株式会社プロパティサポート", phone: "03-4444-5001", industry: "不動産", sub_industry: "不動産管理", employees: "42名", revenue: "5億", address: "東京都中野区中野5-1-1", contact_name: "池田 久美", direct_phone: "03-4444-5002", contact_email: "ikeda@propertysupport.co.jp", assignee: "長尾", latest_result: null, next_date: null, imported_at: "2026-04-09T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000306", user_id: KOTARO, list_id: "a1111111-1111-1111-1111-111111111103", company: "株式会社ホームトラスト", phone: "03-6666-7001", industry: "不動産", sub_industry: "売買仲介", employees: "98名", revenue: "17億", address: "東京都江東区豊洲2-2-1", contact_name: "村上 良一", direct_phone: "03-6666-7002", contact_email: "murakami@hometrust.co.jp", assignee: "長尾", latest_result: null, next_date: null, imported_at: "2026-04-09T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000307", user_id: KOTARO, list_id: "a1111111-1111-1111-1111-111111111103", company: "福岡不動産株式会社", phone: "092-1111-2001", industry: "不動産", sub_industry: "不動産仲介", employees: "75名", revenue: "11億", address: "福岡県福岡市博多区博多駅前3-2-1", contact_name: "長野 誠司", direct_phone: "092-1111-2002", contact_email: "nagano@fukuokafudosan.co.jp", assignee: "長尾", latest_result: null, next_date: null, imported_at: "2026-04-10T00:00:00Z" },
  { id: "b1111111-0000-0000-0000-000000000308", user_id: KOTARO, list_id: "a1111111-1111-1111-1111-111111111103", company: "株式会社シティエステート", phone: "03-7777-8001", industry: "不動産", sub_industry: "商業不動産", employees: "210名", revenue: "38億", address: "東京都千代田区丸の内1-1-1", contact_name: "橋本 清", direct_phone: "03-7777-8002", contact_email: "hashimoto@cityestate.co.jp", assignee: "長尾", latest_result: null, next_date: null, imported_at: "2026-04-10T00:00:00Z" },
];

const callRecords = [
  // IT企業 - テックビジョン (アポ獲得)
  { id: "c1111111-0000-0000-0000-000000000101", company_id: "b1111111-0000-0000-0000-000000000101", user_id: TOKU, date: "2026-04-10", result: "担当者不在", memo: "受付で担当者不在と言われた。折り返し依頼。", assignee: "山崎", products: [], challenges: [], interests: [] },
  { id: "c1111111-0000-0000-0000-000000000102", company_id: "b1111111-0000-0000-0000-000000000101", user_id: TOKU, date: "2026-04-15", result: "再コール", memo: "田中さんと話せた。採用に課題感あり。来週改めて詳しく話したいとのこと。", assignee: "山崎", products: ["採用動画制作"], challenges: ["採用に困っている", "応募が集まらない"], interests: ["費用対効果"] },
  { id: "c1111111-0000-0000-0000-000000000103", company_id: "b1111111-0000-0000-0000-000000000101", user_id: TOKU, date: "2026-04-22", result: "アポ獲得", memo: "4/28 14:00に商談設定。採用動画と分析ツールの両方に興味あり。予算感も合いそう。", assignee: "山崎", products: ["採用動画制作", "採用動画分析ツール"], challenges: ["採用に困っている", "採用データを活用できていない"], interests: ["導入事例・実績", "具体的な数字"] },

  // IT企業 - デジタルフロンティア (資料送付)
  { id: "c1111111-0000-0000-0000-000000000201", company_id: "b1111111-0000-0000-0000-000000000102", user_id: TOKU, date: "2026-04-18", result: "資料送付", memo: "鈴木さんと10分話せた。採用LP制作に興味。資料を送ってほしいとのことで対応済み。", assignee: "山崎", products: ["採用LP制作"], challenges: ["応募が集まらない", "採用ブランドを強化したい"], interests: ["サービスの独自性", "導入事例・実績"] },

  // IT企業 - クラウドネクスト (再コール)
  { id: "c1111111-0000-0000-0000-000000000301", company_id: "b1111111-0000-0000-0000-000000000103", user_id: TOKU, date: "2026-04-20", result: "再コール", memo: "佐藤さん多忙。来週改めてとのこと。CRMに関心があると言ってた。", assignee: "山崎", products: ["CRM"], challenges: ["顧客管理が属人化している"], interests: ["費用対効果", "無料トライアル"] },

  // IT企業 - スマートシステムズ (担当者不在)
  { id: "c1111111-0000-0000-0000-000000000401", company_id: "b1111111-0000-0000-0000-000000000104", user_id: KOTARO, date: "2026-04-21", result: "担当者不在", memo: "中村さん外出中。明日再コールする。", assignee: "長尾", products: [], challenges: [], interests: [] },

  // IT企業 - イノベートラボ (担当NG)
  { id: "c1111111-0000-0000-0000-000000000501", company_id: "b1111111-0000-0000-0000-000000000105", user_id: TOKU, date: "2026-04-19", result: "担当NG", memo: "競合サービスを既に導入済み。来年度以降に再検討の可能性あり。", assignee: "山崎", products: ["採用動画制作"], challenges: [], interests: [], ng_reason: "競合他社と契約中" },

  // IT企業 - ネットワークプラス (受付NG)
  { id: "c1111111-0000-0000-0000-000000000601", company_id: "b1111111-0000-0000-0000-000000000106", user_id: KOTARO, date: "2026-04-17", result: "受付NG", memo: "受付で営業電話お断りと言われた。", assignee: "長尾", products: [], challenges: [], interests: [], ng_reason: "電話お断り" },

  // 製造業 - 精密機工 (アポ獲得)
  { id: "c1111111-0000-0000-0000-000000001001", company_id: "b1111111-0000-0000-0000-000000000201", user_id: TOKU, date: "2026-04-14", result: "再コール", memo: "加藤さんと話せた。採用に困っているとのこと。技術職の採用が特に難しいと。", assignee: "山崎", products: ["採用動画制作"], challenges: ["採用に困っている", "応募が集まらない"], interests: ["費用対効果"] },
  { id: "c1111111-0000-0000-0000-000000001002", company_id: "b1111111-0000-0000-0000-000000000201", user_id: TOKU, date: "2026-04-21", result: "アポ獲得", memo: "4/29 11:00アポ獲得。技術職採用向け動画に高い関心。決裁権もある様子。", assignee: "山崎", products: ["採用動画制作", "採用ブランディング支援"], challenges: ["採用に困っている", "採用ブランドを強化したい"], interests: ["導入事例・実績", "スピード感"] },

  // 製造業 - 東海製作所 (資料送付)
  { id: "c1111111-0000-0000-0000-000000001101", company_id: "b1111111-0000-0000-0000-000000000202", user_id: KOTARO, date: "2026-04-20", result: "資料送付", memo: "木村さんに採用動画の資料送付。SNS採用にも興味持っていた。", assignee: "長尾", products: ["採用動画制作", "SNS採用支援"], challenges: ["応募が集まらない", "内定辞退が多い"], interests: ["他社との違い", "導入事例・実績"] },

  // 製造業 - 山田工業 (再コール)
  { id: "c1111111-0000-0000-0000-000000001201", company_id: "b1111111-0000-0000-0000-000000000203", user_id: TOKU, date: "2026-04-22", result: "再コール", memo: "山田さん本人と話せた。今期は予算が厳しいが来期に向けて検討したいとのこと。", assignee: "山崎", products: ["採用動画制作"], challenges: ["採用コストを下げたい"], interests: ["費用対効果"] },

  // 製造業 - 関西プレス (担当者不在)
  { id: "c1111111-0000-0000-0000-000000001301", company_id: "b1111111-0000-0000-0000-000000000204", user_id: KOTARO, date: "2026-04-23", result: "担当者不在", memo: "西村さん会議中。明後日再コール予定。", assignee: "長尾", products: [], challenges: [], interests: [] },

  // 製造業 - 北陸製造 (担当NG)
  { id: "c1111111-0000-0000-0000-000000001401", company_id: "b1111111-0000-0000-0000-000000000205", user_id: TOKU, date: "2026-04-16", result: "担当NG", memo: "採用活動を現在停止中。来年度まで予定なし。", assignee: "山崎", products: [], challenges: [], interests: [], ng_reason: "採用活動していない" },

  // 不動産 - 東京不動産 (アポ獲得)
  { id: "c1111111-0000-0000-0000-000000002001", company_id: "b1111111-0000-0000-0000-000000000301", user_id: KOTARO, date: "2026-04-16", result: "再コール", memo: "斎藤さん興味あり。上長に確認してから返答とのこと。", assignee: "長尾", products: ["採用動画制作"], challenges: ["採用に困っている"], interests: ["費用対効果"] },
  { id: "c1111111-0000-0000-0000-000000002002", company_id: "b1111111-0000-0000-0000-000000000301", user_id: KOTARO, date: "2026-04-23", result: "アポ獲得", memo: "4/28 15:00商談確定。採用動画と採用コンサルの両方に関心。", assignee: "長尾", products: ["採用動画制作", "採用コンサルティング"], challenges: ["採用に困っている", "採用ブランドを強化したい"], interests: ["導入事例・実績", "サポート体制"] },

  // 不動産 - ハウスパートナー (資料送付)
  { id: "c1111111-0000-0000-0000-000000002101", company_id: "b1111111-0000-0000-0000-000000000302", user_id: KOTARO, date: "2026-04-21", result: "資料送付", memo: "藤田さんに資料送付済み。採用LP制作に関心。来週フォロー予定。", assignee: "長尾", products: ["採用LP制作"], challenges: ["応募が集まらない"], interests: ["サービスの独自性"] },

  // 不動産 - ライフホーム (再コール)
  { id: "c1111111-0000-0000-0000-000000002201", company_id: "b1111111-0000-0000-0000-000000000303", user_id: KOTARO, date: "2026-04-22", result: "再コール", memo: "坂本さん多忙。来週電話してほしいとのこと。", assignee: "長尾", products: [], challenges: [], interests: [] },

  // 不動産 - 大阪不動産 (担当者不在)
  { id: "c1111111-0000-0000-0000-000000002301", company_id: "b1111111-0000-0000-0000-000000000304", user_id: KOTARO, date: "2026-04-24", result: "担当者不在", memo: "上田さん出張中。来週月曜に再コール。", assignee: "長尾", products: [], challenges: [], interests: [] },
];

const workingHours = [
  { workspace_id: WS, user_id: TOKU, user_name: "山崎", date: "2026-04-21", hours: 4 },
  { workspace_id: WS, user_id: TOKU, user_name: "山崎", date: "2026-04-22", hours: 5 },
  { workspace_id: WS, user_id: TOKU, user_name: "山崎", date: "2026-04-23", hours: 3.5 },
  { workspace_id: WS, user_id: TOKU, user_name: "山崎", date: "2026-04-24", hours: 4.5 },
  { workspace_id: WS, user_id: KOTARO, user_name: "長尾", date: "2026-04-21", hours: 3 },
  { workspace_id: WS, user_id: KOTARO, user_name: "長尾", date: "2026-04-22", hours: 4 },
  { workspace_id: WS, user_id: KOTARO, user_name: "長尾", date: "2026-04-23", hours: 4.5 },
  { workspace_id: WS, user_id: KOTARO, user_name: "長尾", date: "2026-04-24", hours: 3 },
];

async function seed() {
  console.log("デモデータ投入開始...");

  const { error: e1 } = await supabase.from("call_lists").insert(lists);
  if (e1) { console.error("call_lists error:", e1.message); process.exit(1); }
  console.log("✓ コールリスト 3件");

  const { error: e2 } = await supabase.from("companies").insert(companies);
  if (e2) { console.error("companies error:", e2.message); process.exit(1); }
  console.log("✓ 会社 28件");

  const { error: e3 } = await supabase.from("call_records").insert(callRecords);
  if (e3) { console.error("call_records error:", e3.message); process.exit(1); }
  console.log("✓ コール記録 " + callRecords.length + "件");

  const { error: e4 } = await supabase.from("working_hours").insert(workingHours);
  if (e4) { console.error("working_hours error:", e4.message); process.exit(1); }
  console.log("✓ 稼働時間 " + workingHours.length + "件");

  console.log("\n完了！techlead-ebon.vercel.app を確認してください。");
}

seed();
