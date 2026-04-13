export type ResultType =
  | "アポ獲得"
  | "資料送付"
  | "再コール"
  | "担当者不在"
  | "担当NG"
  | "受付NG";

export type Tab = "list" | "report" | "analytics";

export interface CallList {
  id: string;
  name: string;
  companies: Company[];
  createdAt: string;
}

export interface CallRecord {
  id: string;
  date: string; // yyyy-MM-dd
  result: ResultType;
  memo: string;
  assignee: string;
  products: string[];    // 提案商材
  challenges: string[];  // 相手の課題
  interests: string[];   // 興味を持ったポイント
}

export interface Company {
  id: string;
  // 企業情報（Sansanから）
  company: string;
  phone: string;
  industry: string;      // 業種-大分類
  subIndustry: string;   // 業種-中分類
  employees: string;     // 従業員数（人数）
  revenue: string;       // 売上
  address: string;
  // 担当者情報
  contactName: string;   // 相手の名前
  directPhone: string;   // 直通電話
  contactEmail: string;  // メールアドレス
  // コール管理
  assignee: string;
  latestResult: ResultType | null;
  nextDate: string;
  callHistory: CallRecord[];
  importedAt: string;
}

// タグの種類
export type TagCategory = "products" | "challenges" | "interests";

export interface TagConfig {
  products: string[];
  challenges: string[];
  interests: string[];
}

export const DEFAULT_TAGS: TagConfig = {
  products: [
    "展示会出展支援",
    "WEBマーケティング",
    "採用支援",
    "DX支援",
    "業務効率化ツール",
    "BPO",
    "RPAシステム",
    "SNS運用支援",
  ],
  challenges: [
    "集客に困っている",
    "採用に困っている",
    "業務を効率化したい",
    "DXを進めたい",
    "コスト削減したい",
    "リード獲得したい",
    "新規顧客を増やしたい",
    "ブランド認知を上げたい",
  ],
  interests: [
    "費用対効果",
    "導入事例・実績",
    "具体的な数字",
    "サービスの独自性",
    "スピード感",
    "無料トライアル",
    "サポート体制",
    "他社との違い",
  ],
};

export const RESULT_CONFIG: Record<
  ResultType,
  { color: string; bg: string; badge: string; darkBg: string }
> = {
  アポ獲得: {
    color: "text-emerald-300",
    bg: "bg-emerald-500 hover:bg-emerald-400",
    badge: "bg-emerald-900 text-emerald-300",
    darkBg: "bg-emerald-700",
  },
  資料送付: {
    color: "text-purple-300",
    bg: "bg-purple-500 hover:bg-purple-400",
    badge: "bg-purple-900 text-purple-300",
    darkBg: "bg-purple-700",
  },
  再コール: {
    color: "text-amber-300",
    bg: "bg-amber-500 hover:bg-amber-400",
    badge: "bg-amber-900 text-amber-300",
    darkBg: "bg-amber-700",
  },
  担当者不在: {
    color: "text-blue-300",
    bg: "bg-blue-500 hover:bg-blue-400",
    badge: "bg-blue-900 text-blue-300",
    darkBg: "bg-blue-700",
  },
  担当NG: {
    color: "text-red-400",
    bg: "bg-red-600 hover:bg-red-500",
    badge: "bg-red-900 text-red-400",
    darkBg: "bg-red-700",
  },
  受付NG: {
    color: "text-rose-400",
    bg: "bg-rose-700 hover:bg-rose-600",
    badge: "bg-rose-950 text-rose-400",
    darkBg: "bg-rose-800",
  },
};

export const RESULTS: ResultType[] = [
  "アポ獲得",
  "資料送付",
  "再コール",
  "担当者不在",
  "担当NG",
  "受付NG",
];

// 商材・課題・興味ポイントを記録すべき結果
export const DETAIL_RESULTS: ResultType[] = ["アポ獲得", "資料送付", "再コール"];
