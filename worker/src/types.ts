// バリデーション結果
export interface ValidationResult {
  valid: boolean;
  normalized: string | null;  // 正規化された番号（ハイフンなし）
  formatted: string | null;   // フォーマット済み番号（ハイフンあり）
  error?: string;
}

// 検索結果
export interface SearchResult {
  success: boolean;
  data?: {
    number: string;
    formatted_number: string;
    name: string | null;
    category: string | null;
    danger_level: "high" | "medium" | "low" | "unknown";
    danger_score: number | null;
    total_reports: number;
    reviews: Array<{ comment: string; date: string | null }>;
    source_url: string;
  };
  error?: string;
}
