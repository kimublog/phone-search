import { SearchResult } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/**
 * 電話帳ナビから電話番号情報を検索する
 */
export async function searchPhoneNumber(number: string): Promise<SearchResult> {
  const sourceUrl = `https://www.telnavi.jp/phone/${number}`;

  let html: string;
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
    });
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "この電話番号の情報は見つかりませんでした" };
      }
      return { success: false, error: `電話帳ナビへのアクセスに失敗しました（${response.status}）` };
    }
    html = await response.text();
  } catch (e) {
    return { success: false, error: "電話帳ナビへの接続に失敗しました" };
  }

  const formattedNumber = extractFormatted(html, number);
  const name = extractName(html);
  const category = extractCategory(html);
  const { level: dangerLevel, score: dangerScore } = extractDanger(html);
  const totalReports = extractReportCount(html);
  const reviews = extractReviews(html);

  return {
    success: true,
    data: {
      number,
      formatted_number: formattedNumber,
      name,
      category,
      danger_level: dangerLevel,
      danger_score: dangerScore,
      total_reports: totalReports,
      reviews,
      source_url: sourceUrl,
    },
  };
}

/**
 * フォーマット済み番号を抽出
 */
function extractFormatted(html: string, fallback: string): string {
  try {
    const match = html.match(/(\d{2,4}-\d{2,4}-\d{3,4})/);
    return match ? match[1] : fallback;
  } catch {
    return fallback;
  }
}

/**
 * 発信元名（会社名など）を抽出
 * titleタグ: 「電話番号XXXXは○○○」
 * 登録情報セクション: table.information 内のリンクテキスト
 */
function extractName(html: string): string | null {
  try {
    // titleタグから抽出: 「電話番号0120444444は株式会社再春館製薬所／化粧品お客様窓口」
    const titleMatch = html.match(/<title>電話番号\d+は(.+?)<\/title>/);
    if (titleMatch && titleMatch[1].trim()) {
      return titleMatch[1].trim();
    }

    // 登録情報セクションから抽出
    const regMatch = html.match(/登録情報[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
    if (regMatch) {
      const cleaned = regMatch[1].replace(/<[^>]+>/g, "").trim();
      if (cleaned) return cleaned;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 業種・カテゴリを抽出
 * 「業種タグ」行の<li>内リンクテキストを取得
 */
function extractCategory(html: string): string | null {
  try {
    const tagMatch = html.match(/業種タグ<\/th><td><ol>([\s\S]*?)<\/ol>/);
    if (tagMatch) {
      const tags: string[] = [];
      const liRegex = /<li><a[^>]*>([^<]+)<\/a><\/li>/g;
      let m;
      while ((m = liRegex.exec(tagMatch[1])) !== null) {
        tags.push(m[1].trim());
      }
      if (tags.length > 0) return tags.join("、");
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 危険度を抽出
 * abuse__labelから「安全(XX%)」「迷惑(XX%)」のパーセンテージを取得
 */
function extractDanger(html: string): {
  level: "high" | "medium" | "low" | "unknown";
  score: number | null;
} {
  try {
    // 迷惑パーセンテージを取得
    const spamMatch = html.match(/迷惑\((\d+)%\)/);
    const safeMatch = html.match(/安全\((\d+)%\)/);

    if (spamMatch) {
      const spamPercent = parseInt(spamMatch[1], 10);
      // 迷惑%をそのままスコアとして使う
      const score = spamPercent;

      if (spamPercent >= 50) return { level: "high", score };
      if (spamPercent >= 20) return { level: "medium", score };
      return { level: "low", score };
    }

    if (safeMatch) {
      const safePercent = parseInt(safeMatch[1], 10);
      const score = 100 - safePercent;
      if (safePercent >= 70) return { level: "low", score };
      if (safePercent >= 40) return { level: "medium", score };
      return { level: "high", score };
    }

    return { level: "unknown", score: null };
  } catch {
    return { level: "unknown", score: null };
  }
}

/**
 * アクセス数を抽出
 * 「アクセス数」「検索数」行のカンマ付き数値を取得
 */
function extractReportCount(html: string): number {
  try {
    // アクセス数を取得
    const match = html.match(/アクセス数<\/th>\s*<td>([\d,]+)/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ""), 10);
    }

    // クチコミ件数
    const reviewMatch = html.match(/reviews__count[^>]*>(\d+)/);
    if (reviewMatch) {
      return parseInt(reviewMatch[1], 10);
    }

    return 0;
  } catch {
    return 0;
  }
}

/**
 * 口コミ・レビューを抽出（最新3件）
 * div.comment 内の span.date と p.content を取得
 */
function extractReviews(html: string): Array<{ comment: string; date: string | null }> {
  try {
    const reviews: Array<{ comment: string; date: string | null }> = [];

    // 各コメントブロックを抽出
    const commentRegex = /<div class="comment">\s*<h3[^>]*class="[^"]*meta[^"]*"[^>]*><span class="date">([^<]*)<\/span>[\s\S]*?<p class="fzS content">([\s\S]*?)<\/p>/g;
    let match;

    while ((match = commentRegex.exec(html)) !== null && reviews.length < 3) {
      const date = match[1].trim() || null;
      // HTMLタグ（<br />など）を除去
      const comment = match[2].replace(/<[^>]+>/g, "").trim();

      if (comment.length > 0) {
        reviews.push({ comment, date });
      }
    }

    // 上記パターンでマッチしなかった場合（日付なしコメント）
    if (reviews.length === 0) {
      const simpleRegex = /<p class="fzS content">([\s\S]*?)<\/p>/g;
      while ((match = simpleRegex.exec(html)) !== null && reviews.length < 3) {
        const comment = match[1].replace(/<[^>]+>/g, "").trim();
        if (comment.length > 0) {
          reviews.push({ comment, date: null });
        }
      }
    }

    return reviews;
  } catch {
    return [];
  }
}
