import { ValidationResult } from "./types";

// 日本の電話番号パターン
const PHONE_PATTERNS: { pattern: RegExp; format: (digits: string) => string }[] = [
  // 携帯電話: 090/080/070-xxxx-xxxx（11桁）
  {
    pattern: /^0[789]0\d{8}$/,
    format: (d) => `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`,
  },
  // IP電話: 050-xxxx-xxxx（11桁）
  {
    pattern: /^050\d{8}$/,
    format: (d) => `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`,
  },
  // フリーダイヤル: 0120-xxx-xxx（10桁）
  {
    pattern: /^0120\d{6}$/,
    format: (d) => `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`,
  },
  // フリーダイヤル: 0800-xxx-xxxx（11桁）
  {
    pattern: /^0800\d{7}$/,
    format: (d) => `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`,
  },
  // ナビダイヤル: 0570-xxx-xxx（10桁）
  {
    pattern: /^0570\d{6}$/,
    format: (d) => `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`,
  },
  // 固定電話（2桁市外局番）: 03/06など-xxxx-xxxx（10桁）
  {
    pattern: /^0[3-9]\d{8}$/,
    format: (d) => `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`,
  },
  // 固定電話（3桁市外局番）: 011/022/045など-xxx-xxxx（10桁）
  {
    pattern: /^0\d{9}$/,
    format: (d) => `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`,
  },
];

// 2桁市外局番のリスト（東京03、大阪06など）
const TWO_DIGIT_AREA_CODES = ["03", "04", "06"];

/**
 * 電話番号を正規化する（ハイフン除去、数字のみに）
 */
export function normalizePhoneNumber(input: string): string {
  // 国際形式（+81）の変換
  let cleaned = input.replace(/[\s\-\(\)\u3000]/g, "");
  if (cleaned.startsWith("+81")) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned;
}

/**
 * 日本の電話番号をバリデーションする
 */
export function validatePhoneNumber(input: string): ValidationResult {
  if (!input || input.trim() === "") {
    return { valid: false, normalized: null, formatted: null, error: "電話番号を入力してください" };
  }

  const normalized = normalizePhoneNumber(input);

  // 数字のみかチェック
  if (!/^\d+$/.test(normalized)) {
    return { valid: false, normalized: null, formatted: null, error: "電話番号に使用できない文字が含まれています" };
  }

  // 先頭が0かチェック
  if (!normalized.startsWith("0")) {
    return { valid: false, normalized: null, formatted: null, error: "電話番号は0から始まる必要があります" };
  }

  // 桁数チェック（10桁または11桁）
  if (normalized.length < 10 || normalized.length > 11) {
    return { valid: false, normalized: null, formatted: null, error: "電話番号の桁数が正しくありません（10〜11桁）" };
  }

  // パターンマッチでフォーマットを決定
  for (const { pattern, format } of PHONE_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        valid: true,
        normalized,
        formatted: format(normalized),
      };
    }
  }

  // パターンに一致しないが桁数は合っている場合、汎用フォーマットで返す
  const formatted = normalized.length === 11
    ? `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`
    : `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;

  return {
    valid: true,
    normalized,
    formatted,
  };
}
