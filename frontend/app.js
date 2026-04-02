// APIベースURL
const API_BASE = "https://phone-search-api.kimublog.workers.dev";

// DOM要素
const searchForm = document.getElementById("searchForm");
const phoneInput = document.getElementById("phoneInput");
const searchBtn = document.getElementById("searchBtn");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const resultEl = document.getElementById("result");
const dangerBadge = document.getElementById("dangerBadge");
const resultName = document.getElementById("resultName");
const resultNumber = document.getElementById("resultNumber");
const resultCategory = document.getElementById("resultCategory");
const resultScore = document.getElementById("resultScore");
const resultReports = document.getElementById("resultReports");
const reviewsSection = document.getElementById("reviewsSection");
const reviewsList = document.getElementById("reviewsList");
const sourceLink = document.getElementById("sourceLink");
const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");

// 検索履歴（メモリ内管理、最新10件）
const searchHistory = [];

/**
 * 電話番号入力時にハイフンを自動挿入
 */
phoneInput.addEventListener("input", (e) => {
  let value = e.target.value.replace(/[^\d]/g, "");

  if (value.length > 11) {
    value = value.slice(0, 11);
  }

  // ハイフン自動挿入
  let formatted = value;
  if (value.startsWith("0120") && value.length > 4) {
    // 0120-xxx-xxx
    formatted = value.slice(0, 4) + "-" + value.slice(4, 7);
    if (value.length > 7) formatted += "-" + value.slice(7);
  } else if (value.startsWith("0570") && value.length > 4) {
    // 0570-xxx-xxx
    formatted = value.slice(0, 4) + "-" + value.slice(4, 7);
    if (value.length > 7) formatted += "-" + value.slice(7);
  } else if (value.startsWith("0800") && value.length > 4) {
    // 0800-xxx-xxxx
    formatted = value.slice(0, 4) + "-" + value.slice(4, 7);
    if (value.length > 7) formatted += "-" + value.slice(7);
  } else if (/^0[789]0/.test(value) && value.length > 3) {
    // 携帯: 090/080/070-xxxx-xxxx
    formatted = value.slice(0, 3) + "-" + value.slice(3, 7);
    if (value.length > 7) formatted += "-" + value.slice(7);
  } else if (value.startsWith("050") && value.length > 3) {
    // IP電話: 050-xxxx-xxxx
    formatted = value.slice(0, 3) + "-" + value.slice(3, 7);
    if (value.length > 7) formatted += "-" + value.slice(7);
  } else if (value.length > 2 && /^0[1-9]/.test(value)) {
    // 固定電話: 0x-xxxx-xxxx
    formatted = value.slice(0, 2) + "-" + value.slice(2, 6);
    if (value.length > 6) formatted += "-" + value.slice(6);
  }

  e.target.value = formatted;
});

/**
 * 検索実行
 */
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const number = phoneInput.value.replace(/[^\d]/g, "");
  if (number) {
    search(number);
  }
});

/**
 * API呼び出しと結果表示
 */
async function search(number) {
  // UI状態リセット
  hideAll();
  loadingEl.classList.remove("hidden");
  searchBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/search?number=${encodeURIComponent(number)}`);
    const json = await res.json();

    if (!res.ok) {
      showError(json.error || "検索に失敗しました");
      return;
    }

    if (!json.success || !json.data) {
      showError(json.error || "情報が見つかりませんでした");
      return;
    }

    showResult(json.data);
    addHistory(json.data);
  } catch (err) {
    showError("サーバーに接続できませんでした。ネットワーク接続を確認してください。");
  } finally {
    loadingEl.classList.add("hidden");
    searchBtn.disabled = false;
  }
}

/**
 * 結果を表示
 */
function showResult(data) {
  resultName.textContent = data.name || "不明";
  resultNumber.textContent = data.formatted_number || data.number;
  resultCategory.textContent = data.category || "不明";
  resultReports.textContent = data.total_reports > 0 ? `${data.total_reports} 件` : "なし";

  // 危険度スコア
  if (data.danger_score !== null) {
    resultScore.textContent = `${data.danger_score} / 100`;
  } else {
    resultScore.textContent = "-";
  }

  // 危険度バッジ
  const dangerLabels = { high: "危険", medium: "注意", low: "安全", unknown: "不明" };
  dangerBadge.textContent = dangerLabels[data.danger_level] || "不明";
  dangerBadge.className = `badge ${data.danger_level}`;

  // 口コミ
  reviewsList.innerHTML = "";
  if (data.reviews && data.reviews.length > 0) {
    data.reviews.forEach((review) => {
      const li = document.createElement("li");
      li.textContent = review.comment;
      if (review.date) {
        const dateSpan = document.createElement("span");
        dateSpan.className = "review-date";
        dateSpan.textContent = review.date;
        li.appendChild(dateSpan);
      }
      reviewsList.appendChild(li);
    });
    reviewsSection.classList.remove("hidden");
  } else {
    reviewsSection.classList.add("hidden");
  }

  // ソースリンク
  sourceLink.href = data.source_url;

  resultEl.classList.remove("hidden");
}

/**
 * エラーを表示
 */
function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

/**
 * 全表示要素を非表示
 */
function hideAll() {
  loadingEl.classList.add("hidden");
  errorEl.classList.add("hidden");
  resultEl.classList.add("hidden");
}

/**
 * 検索履歴に追加（最新10件）
 */
function addHistory(data) {
  // 重複除去
  const idx = searchHistory.findIndex((h) => h.number === data.number);
  if (idx !== -1) {
    searchHistory.splice(idx, 1);
  }

  searchHistory.unshift({
    number: data.number,
    formatted: data.formatted_number,
    name: data.name,
  });

  // 最新10件に制限
  if (searchHistory.length > 10) {
    searchHistory.pop();
  }

  renderHistory();
}

/**
 * 検索履歴を描画
 */
function renderHistory() {
  if (searchHistory.length === 0) {
    historySection.classList.add("hidden");
    return;
  }

  historyList.innerHTML = "";
  searchHistory.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.formatted || item.number}</span>
      <span class="history-name">${item.name || "不明"}</span>
    `;
    li.addEventListener("click", () => {
      phoneInput.value = item.formatted || item.number;
      search(item.number);
    });
    historyList.appendChild(li);
  });

  historySection.classList.remove("hidden");
}

/**
 * URLパラメータからの自動検索
 */
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const number = params.get("number");
  if (number) {
    const cleaned = number.replace(/[^\d]/g, "");
    if (cleaned) {
      phoneInput.value = number;
      search(cleaned);
    }
  }
}

// ページ読み込み時に実行
checkUrlParams();
