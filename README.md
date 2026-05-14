# 会話エディタ

React + Vite で作る、スマホ対応の PWA 会話エディタです。  
ゲーム、ノベル、漫画、動画企画などの創作メモを対象に、`会話行` ではなく `会話ブロック` 単位で本文をまとめて編集できるようにしています。

## 目的

- 作品ごとに会話イベントを整理する
- イベントごとに複数の会話ブロックを保持する
- スマホでも長文を無理なく編集する
- ブラウザ内にローカル保存し、オフラインでも起動できるようにする

## 主な機能

- 複数作品の作成、編集、削除
- 作品ごとのイベント一覧表示
- イベントのステータス管理
  - `未着手`
  - `下書き`
  - `要修正`
  - `FIX`
- イベント一覧の左端ステータス色バー表示
- イベント一覧専用の付箋メモ
- 会話ブロック単位の編集
  - `id`
  - `conversationTitle`
  - `timing`
  - `characters`
  - `body`
  - `memo`
- 検索 / 絞り込み
  - イベント名検索
  - 会話本文検索
  - キャラ名検索
  - ステータス絞り込み
  - 付箋ありのみ表示
- IndexedDB への自動保存
- JSON 出力 / 読込
- CSV 出力
  - イベント単位
  - 会話ブロック単位
- PWA 対応
  - manifest
  - service worker
  - ホーム画面追加
  - オフライン起動

## 初期データ

初回起動時はサンプル作品を 1 件入れています。

- 作品名: `サンプル作品`
- イベント例
  - `食卓を調べた時`
  - `絵画を調べた時`
  - `ドアを調べた時`

## セットアップ

依存パッケージを入れて起動してください。

```bash
npm install
npm run dev
```

ビルド:

```bash
npm run build
```

プレビュー:

```bash
npm run preview
```

## 起動方法

`index.html` を直接ダブルクリックしても正常起動しません。  
このファイルは Vite のエントリであり、ローカルサーバー経由で開く前提です。

手早く起動する場合:

- [start_conversation_editor.bat](D:/OneDrive/ドキュメント/Codex_APP/ConversationStudio/start_conversation_editor.bat) を実行する

このバッチはバックグラウンドで `dist` を `http://127.0.0.1:4173/` で配信し、ブラウザを開きます。  
起動後に黒いウィンドウがすぐ閉じても正常です。

停止したい場合:

- [stop_conversation_editor.bat](D:/OneDrive/ドキュメント/Codex_APP/ConversationStudio/stop_conversation_editor.bat) を実行する

開発中に起動する場合:

```bash
npm run dev
```

ビルド済み内容を確認する場合:

```bash
npm run preview
```

## データ保存について

- 保存先はブラウザの IndexedDB です
- ログインや外部サーバーは使いません
- 入力内容は編集中に自動保存します
- JSON 出力を使うとローカルバックアップを残せます

## PWA について

- 一度オンラインで読み込めば、service worker が同一オリジンの静的ファイルをキャッシュします
- その後はオフラインでも起動しやすい構成です
- ブラウザや OS によりホーム画面追加の表示は異なります

## Vercel 公開について

この構成は静的な Vite アプリなので、Vercel へそのまま公開しやすいです。  
運用の考え方は `Codex -> GitHub -> Vercel` を基本にすると整理しやすいです。

- Codex: 実装と修正
- GitHub: ソース管理
- Vercel: ビルドと公開

公開した場合は、README に次の 2 つを分けて残す運用を推奨します。

- 公開サイト URL
- Vercel 管理 URL

### 現在の公開情報

- 公開サイト URL: [https://conversation-studio-delta.vercel.app/](https://conversation-studio-delta.vercel.app/)
- デプロイ URL: [https://conversation-studio-8g0duc027-tmnakaha2-4602s-projects.vercel.app/](https://conversation-studio-8g0duc027-tmnakaha2-4602s-projects.vercel.app/)
- GitHub リポジトリ: [https://github.com/nakahara2929/conversation-studio](https://github.com/nakahara2929/conversation-studio)

Vercel の管理画面では、`conversation-studio` プロジェクトを開いて運用します。

## 今回あえて入れていないもの

- 複雑なドラッグ並び替え
- ログイン
- クラウド同期
- サーバー保存
- 凝ったアニメーション

安定性と長文編集のしやすさを優先した最小構成です。
