import type { Company } from "./types";

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function parseDate(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return "";
}

// ヘッダー行から各列のインデックスを自動検出
function detectColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const MAPPINGS: Record<string, string[]> = {
    company:     ["会社名", "企業名", "法人名", "会社・組織"],
    address:     ["住所", "所在地", "住所（都道府県）", "本社所在地"],
    phone:       ["電話番号", "電話", "TEL", "tel", "代表電話"],
    employees:   ["従業員数", "社員数", "人数", "従業員"],
    industry:    ["業種-大分類", "大分類", "業種"],
    subIndustry: ["業種-中分類", "中分類"],
  };
  headers.forEach((h, i) => {
    const t = h.trim();
    for (const [key, patterns] of Object.entries(MAPPINGS)) {
      if (patterns.some((p) => t.includes(p))) {
        if (!(key in map)) map[key] = i;
        break;
      }
    }
  });
  return map;
}

// CSVの1行をパース（ダブルクォート内のカンマを考慮）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function buildCompany(cols: string[], colMap: Record<string, number>, i: number): Company | null {
  const get = (key: string) => {
    const idx = colMap[key];
    return idx !== undefined ? (cols[idx] ?? "").trim() : "";
  };
  const companyName = get("company");
  if (!companyName) return null;
  return {
    id: `${Date.now()}-${i}`,
    company: companyName,
    address: get("address"),
    phone: get("phone"),
    revenue: "",
    employees: get("employees"),
    industry: get("industry"),
    subIndustry: get("subIndustry"),
    contactName: "",
    directPhone: "",
    contactEmail: "",
    assignee: "",
    latestResult: null,
    nextDate: "",
    callHistory: [],
    importedAt: new Date().toISOString(),
  };
}

// SansanのCSVファイル（カンマ区切り）をパース
export function parseCSV(text: string): Company[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const firstRow = parseCSVLine(lines[0]);
  const hasHeader = firstRow.some((c) =>
    ["会社名", "企業名", "法人名", "会社・組織", "業種", "住所"].some((k) => c.includes(k))
  );

  let colMap: Record<string, number>;
  let dataStart: number;

  if (hasHeader) {
    colMap = detectColumns(firstRow);
    dataStart = 1;
  } else {
    colMap = { company: 3, address: 4, phone: 5, industry: 6, subIndustry: 7, employees: 8 };
    dataStart = 0;
  }

  const results: Company[] = [];
  lines.slice(dataStart).forEach((line, i) => {
    const cols = parseCSVLine(line);
    const c = buildCompany(cols, colMap, i);
    if (c) results.push(c);
  });
  return results;
}

// Sansanウェブ画面からコピーしたデータをパース
// 1社あたり縦8行：会社名 / 不明 / 住所 / 電話 / 大分類 / 中分類 / 従業員数 / 売上
export function parseSansanWeb(lines: string[]): Company[] {
  const results: Company[] = [];
  const CHUNK = 8;
  for (let i = 0; i + CHUNK <= lines.length; i += CHUNK) {
    const companyName = lines[i].trim();
    if (!companyName) continue;
    results.push({
      id: `${Date.now()}-${i}`,
      company: companyName,
      address:     lines[i + 2]?.trim() || "",
      phone:       lines[i + 3]?.trim() || "",
      industry:    lines[i + 4]?.trim() || "",
      subIndustry: lines[i + 5]?.trim() || "",
      employees:   lines[i + 6]?.trim() || "",
      revenue:     lines[i + 7]?.trim() || "",
      contactName: "",
      directPhone: "",
      contactEmail: "",
      assignee: "",
      latestResult: null,
      nextDate: "",
      callHistory: [],
      importedAt: new Date().toISOString(),
    });
  }
  return results;
}

export function parseTSV(text: string): Company[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const firstRow = lines[0].split("\t");

  // 1行目にヘッダーが含まれているか判定
  const hasHeader = firstRow.some((c) =>
    ["会社名", "企業名", "会社・組織", "業種", "住所", "売上"].some((k) => c.includes(k))
  );

  let colMap: Record<string, number>;
  let dataStart: number;

  if (hasHeader) {
    colMap = detectColumns(firstRow);
    dataStart = 1;
  } else {
    // ヘッダーなしの場合：Sansanエクスポート標準の列順で対応
    // 抽出媒体(0) 抽出条件(1) 決算月(2) 会社名(3) 住所(4) 電話番号(5)
    // 業種-大分類(6) 業種-中分類(7) 従業員数(8)
    colMap = {
      company: 3,
      address: 4,
      phone: 5,
      industry: 6,
      subIndustry: 7,
      employees: 8,
    };
    dataStart = 0;
  }

  const results: Company[] = [];
  lines.slice(dataStart).forEach((line, i) => {
    const cols = line.split("\t");
    const c = buildCompany(cols, colMap, i);
    if (c) results.push(c);
  });
  return results;
}
