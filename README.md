# 会話エディタ

React + Vite で構成した、スマホ向け PWA の会話エディタです。  
ゲーム、ノベル、漫画、動画企画などの会話文を、`会話ブロック` 単位ではなく `会話` 単位で確認・編集する用途を想定しています。

## 主な機能

- 複数作品の作成、編集、削除
- 作品ごとのイベント一覧表示
- イベント単位の会話編集
- ステータス管理
  - `未着手`
  - `作業中`
  - `完了`
- イベント一覧での並び替え
- イベント複製
- IndexedDB への自動保存
- JSON の出力 / 読込
- CSV の出力
  - イベント単位
  - 会話単位
- PWA 対応
  - manifest
  - service worker
  - ホーム画面追加
  - オフライン起動

## 画面構成

- `作品管理`
  - 作品の選択
  - 作品名 / 概要 / メモの編集
  - データ操作
- `イベント一覧`
  - ステータス絞り込み
  - イベント追加
  - 並び替え
  - 複製
- `イベント編集`
  - イベント名
  - ステータス
  - タイミング
  - 本文
  - 会話バックアップ
  - AI生成

## AI生成

イベント編集の本文欄に `AI生成` ボタンがあります。  
生成時は次の情報を参照します。

- 作品名
- 作品概要
- 作品メモ
- イベント名
- ステータス
- タイミング
- 既存の本文
- 会話バックアップ

既存の本文があり、会話バックアップが空欄のときは、生成前の本文を会話バックアップへ退避してから上書きします。

### APIキー設定

この機能はブラウザに直接 API キーを置かず、サーバー側の `/api/generate-conversation` を使います。

Vercel で使う場合は、Project Settings の Environment Variables に次のどちらかを設定してください。

- 推奨: `GEMINI_API_KEY`
- 任意: `OPENAI_API_KEY`

任意でモデル名も指定できます。

- `GEMINI_MODEL`
  - 既定値: `gemini-2.5-flash`
- `OPENAI_MODEL`
  - 既定値: `gpt-5.4-mini`

優先順は次のとおりです。

1. `GEMINI_API_KEY` があれば Gemini を使用
2. `GEMINI_API_KEY` がなく、`OPENAI_API_KEY` があれば OpenAI を使用

## 初期データ

初回起動時はサンプル作品を 1 件入れています。

- 作品名: `サンプル作品`
- イベント
  - `食卓を調べた時`
  - `絵画を調べた時`
  - `ドアを調べた時`

## セットアップ

依存を入れて開発起動する場合:

```bash
npm install
npm run dev
```

本番ビルド:

```bash
npm run build
```

プレビュー:

```bash
npm run preview
```

## ローカル起動

`index.html` のダブルクリック直開きでは正しく動きません。  
Vite アプリなので、ローカルサーバー経由で開いてください。

簡易起動:

- [start_conversation_editor.bat](D:/OneDrive/ドキュメント/Codex_APP/ConversationStudio/start_conversation_editor.bat)
- [stop_conversation_editor.bat](D:/OneDrive/ドキュメント/Codex_APP/ConversationStudio/stop_conversation_editor.bat)

補足:

- この簡易ランチャーは `dist` を `http://127.0.0.1:4173/` で配信します
- AI生成の `/api/generate-conversation` は Vercel 環境向けです
- そのため、ローカル簡易ランチャーでは AI生成が使えない場合があります

## 保存について

- 保存先はブラウザの IndexedDB です
- ログインや外部サーバー保存はありません
- 入力内容は編集中に自動保存されます
- JSON 出力でバックアップを残せます

## PWAについて

- 一度オンラインで開くと、service worker が静的ファイルをキャッシュします
- その後はオフラインでも起動できます
- ブラウザや OS によりホーム画面追加の表示は異なります

## Vercel 公開

公開フローは `Codex -> GitHub -> Vercel` です。

- Codex: 実装と修正
- GitHub: ソース管理
- Vercel: ビルドと公開

### 現在の公開情報

- 公開URL: [https://conversation-studio-delta.vercel.app/](https://conversation-studio-delta.vercel.app/)
- デプロイURL: [https://conversation-studio-8g0duc027-tmnakaha2-4602s-projects.vercel.app/](https://conversation-studio-8g0duc027-tmnakaha2-4602s-projects.vercel.app/)
- GitHub リポジトリ: [https://github.com/nakahara2929/conversation-studio](https://github.com/nakahara2929/conversation-studio)

## 未実装

- クラウド同期
- ログイン
- 複雑なドラッグ並び替え
- 高度なアニメーション

安定性とスマホでの編集しやすさを優先して、機能は絞っています。
