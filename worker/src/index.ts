import { validatePhoneNumber } from "./validator";
import { searchPhoneNumber } from "./scraper";

// レートリミット用マップ（簡易版: Worker再起動でリセットされる）
const rateLimitMap = new Map<string, number>();

// CORS設定
// 本番環境では "https://<username>.github.io" に変更してください
const ALLOWED_ORIGIN = "*";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data: unknown, status: number = 200, cacheMaxAge: number = 0): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheMaxAge > 0 ? `max-age=${cacheMaxAge}` : "no-cache",
      ...corsHeaders(),
    },
  });
}

/**
 * レートリミットチェック（同一IPから30秒以内の連続リクエストを制限）
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(ip);

  if (lastRequest && now - lastRequest < 30_000) {
    return false; // レートリミット超過
  }

  rateLimitMap.set(ip, now);

  // 古いエントリを定期的にクリーンアップ（メモリリーク防止）
  if (rateLimitMap.size > 1000) {
    for (const [key, time] of rateLimitMap) {
      if (now - time > 60_000) {
        rateLimitMap.delete(key);
      }
    }
  }

  return true;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // OPTIONSリクエスト（CORSプリフライト）
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // GETメソッドのみ許可
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // ヘルスチェック
    if (url.pathname === "/") {
      return jsonResponse({ status: "ok", message: "Phone Search API" });
    }

    // 検索エンドポイント
    if (url.pathname === "/api/search") {
      // レートリミットチェック
      const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
      if (!checkRateLimit(clientIp)) {
        return jsonResponse(
          { error: "リクエストが多すぎます。30秒後に再試行してください" },
          429
        );
      }

      // クエリパラメータから番号を取得
      const number = url.searchParams.get("number");
      if (!number) {
        return jsonResponse({ error: "番号を指定してください（例: /api/search?number=0312345678）" }, 400);
      }

      // バリデーション
      const validation = validatePhoneNumber(number);
      if (!validation.valid || !validation.normalized) {
        return jsonResponse({ error: validation.error || "不正な電話番号です" }, 400);
      }

      // スクレイピング実行
      try {
        const result = await searchPhoneNumber(validation.normalized);

        if (!result.success) {
          return jsonResponse({ error: result.error }, 404);
        }

        return jsonResponse(result, 200, 3600); // 1時間キャッシュ
      } catch (e) {
        return jsonResponse({ error: "検索処理中にエラーが発生しました" }, 502);
      }
    }

    // その他のパス
    return jsonResponse({ error: "Not found" }, 404);
  },
};
