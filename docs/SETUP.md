# セットアップ & デプロイ手順

## 前提条件

- **Cloudflareアカウント**（無料プラン）: https://dash.cloudflare.com/sign-up
- **Node.js 18以上**: https://nodejs.org/
- **GitHubアカウント**: https://github.com/

---

## 1. Cloudflare Workers デプロイ

### 1-1. wrangler CLI のインストールとログイン

```bash
# wrangler はプロジェクトの devDependencies に含まれています
cd worker
npm install

# Cloudflareにログイン（ブラウザが開きます）
npx wrangler login
```

### 1-2. ローカルテスト

```bash
cd worker
npx wrangler dev
```

ローカルサーバーが `http://localhost:8787` で起動します。

動作確認:
```bash
# ヘルスチェック
curl http://localhost:8787/

# 検索テスト
curl "http://localhost:8787/api/search?number=0312345678"
```

### 1-3. 本番デプロイ

```bash
cd worker
npx wrangler deploy
```

デプロイ完了後、以下のようなURLが表示されます:
```
https://phone-search-api.<your-subdomain>.workers.dev
```

このURLをメモしてください（フロントエンド設定で使います）。

---

## 2. GitHub Pages デプロイ

### 2-1. リポジトリ作成

```bash
# GitHubにリポジトリを作成（公開リポジトリ）
gh repo create phone-search --public --source=. --push
```

### 2-2. フロントエンドのデプロイ

GitHub Pagesは `frontend/` ディレクトリを直接公開できないため、以下のいずれかの方法を使います。

**方法A: ルートにフロントエンドファイルを配置**

```bash
# frontendの中身をルートにコピー
cp frontend/* .
git add index.html style.css app.js
git commit -m "Add frontend files for GitHub Pages"
git push
```

**方法B: gh-pages ブランチを使用**

```bash
git subtree push --prefix frontend origin gh-pages
```

### 2-3. GitHub Pages を有効化

1. リポジトリの **Settings** → **Pages** を開く
2. **Source**: `Deploy from a branch`
3. **Branch**: `main`（方法A）または `gh-pages`（方法B）を選択
4. **Save** をクリック

数分後に `https://<username>.github.io/phone-search/` で公開されます。

---

## 3. 環境変数・設定の変更

### 3-1. フロントエンド → API URL の設定

`frontend/app.js` の先頭にある `API_BASE` を変更:

```javascript
// 変更前
const API_BASE = "http://localhost:8787";

// 変更後（あなたのWorker URL）
const API_BASE = "https://phone-search-api.<your-subdomain>.workers.dev";
```

### 3-2. API → CORS の設定

`worker/src/index.ts` の `ALLOWED_ORIGIN` を変更:

```typescript
// 変更前
const ALLOWED_ORIGIN = "*";

// 変更後（あなたのGitHub Pages URL）
const ALLOWED_ORIGIN = "https://<username>.github.io";
```

変更後、再度 `npx wrangler deploy` を実行してください。

---

## 4. 動作確認チェックリスト

- [ ] Worker APIのヘルスチェック（`https://your-worker-url/` にアクセス → `{"status":"ok"}` が返る）
- [ ] ブラウザから番号検索ができること
- [ ] URLパラメータでの検索（`?number=0312345678`）
- [ ] CORSエラーが出ないこと（ブラウザのコンソールを確認）
- [ ] モバイルブラウザでの表示確認
