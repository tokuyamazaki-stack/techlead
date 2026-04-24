export type ResultType =
  | "アポ獲得"
  | "資料送付"
  | "再コール"
  | "担当者不在"
  | "担当NG"
  | "受付NG";

export type Tab = "list" | "follow" | "report" | "progress" | "strategy";

export type FormFieldType =
  | "none"
  | "date"
  | "assignee"
  | "totalCalls"
  | "appo"
  | "material"
  | "recall"
  | "absent"
  | "ngTotal"
  | "appoRate";

export const FORM_FIELD_LABELS: Record<FormFieldType, string> = {
  none:       "使わない",
  date:       "今日の日付",
  assignee:   "担当者名",
  totalCalls: "総コール数",
  appo:       "アポ獲得数",
  material:   "資料送付数",
  recall:     "再コール数",
  absent:     "担当者不在数",
  ngTotal:    "NG合計",
  appoRate:   "アポ率（%）",
};

export interface ReportFormField {
  entryId: string;      // 例: "entry.1234567890"
  dataType: FormFieldType;
}

export interface TalkScript {
  id: string;
  name: string;    // スクリプト名（例：「新規開拓用」「フォロー用」）
  content: string; // スクリプト本文
}

export interface UserSettings {
  name: string;
  calendarUrl: string;
  reportFormUrl: string;
  phone: string;   // 電話番号（メール署名用）
  email: string;   // メールアドレス（メール署名用）
  reportFormFields?: ReportFormField[];  // 日報フォーム自動入力マッピング
  scripts?: TalkScript[];               // トークスクリプト一覧
  selectedScriptId?: string;            // 現在使用中のスクリプトID
}

export interface CallList {
  id: string;
  name: string;
  companies: Company[];
  createdAt: string;
  // 取込条件メタデータ（任意）
  industry?: string;        // 業界（例：不動産仲介）
  fiscalMonthFrom?: string; // 決算月 開始（例：3）
  fiscalMonthTo?: string;   // 決算月 終了（例：9）
  revenueFrom?: string;     // 売上 下限（例：10億）
  revenueTo?: string;       // 売上 上限（例：100億）
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
  ngReason?: string;     // NG理由（担当NG・受付NGのみ）
  scriptName?: string;   // 使用したトークスクリプト名
}

// NG理由のプリセット
export const NG_REASONS: Record<"担当NG" | "受付NG", string[]> = {
  担当NG: ["予算なし", "競合他社と契約中", "採用活動していない", "タイミングNG", "担当者変更", "廃業・移転"],
  受付NG: ["電話お断り", "担当者不在が続く", "窓口NG", "リスト掲載NG", "番号違い"],
};

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
    "採用動画制作",
    "採用動画分析ツール",
    "CRM",
    "採用LP制作",
    "採用ブランディング支援",
    "SNS採用支援",
    "採用コンサルティング",
  ],
  challenges: [
    "採用に困っている",
    "応募が集まらない",
    "内定辞退が多い",
    "採用コストを下げたい",
    "採用ブランドを強化したい",
    "採用データを活用できていない",
    "顧客管理が属人化している",
    "営業の効率を上げたい",
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

// 目標設定
export interface GoalConfig {
  dailyCallsPerPerson: number;   // 1人あたりの1日コール目標
  monthlyAppoPerPerson: number;  // 1人あたりの月間アポ目標
  teamDailyCalls: number;        // チーム1日コール目標
  teamMonthlyAppo: number;       // チーム月間アポ目標
}

export const DEFAULT_GOALS: GoalConfig = {
  dailyCallsPerPerson: 30,
  monthlyAppoPerPerson: 5,
  teamDailyCalls: 100,
  teamMonthlyAppo: 20,
};
