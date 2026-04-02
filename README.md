# phone-search

電話番号の発信元を自動検索するWebツール。

## 構成

- **frontend/**: GitHub Pages用（HTML/CSS/JS）
- **worker/**: Cloudflare Workers用（TypeScript）
- **docs/**: セットアップガイド・ショートカット設定

## 使い方

1. 電話番号を入力して検索
2. 発信元の名前・業種・危険度・口コミが表示される
3. iOSショートカットと連携して着信後すぐに検索可能

## 技術スタック

- フロントエンド: HTML / CSS / JavaScript（GitHub Pages）
- バックエンド: Cloudflare Workers（TypeScript）
- データソース: 電話帳ナビ（telnavi.jp）
