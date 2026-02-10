# CodeRabbit 利用ガイド

## 概要

CodeRabbit は AI を活用した**自動コードレビューツール**。
GitHub の PR（Pull Request）に対して自動的にレビューコメントを投稿する。

Public リポジトリは**無料**で Pro 機能が利用可能。

## セットアップ状況

| 項目 | 状態 |
|------|------|
| `.coderabbit.yaml` | 作成済み（リポジトリルート） |
| GitHub App | インストール済み |
| レビュー言語 | 日本語（`ja-JP`） |
| レビュープロファイル | `chill`（教育的トーン） |

---

## 基本動作

### PR 作成時の自動レビュー

```
PR 作成 / コミット push
        ↓
CodeRabbit が変更を検出
        ↓
自動でレビューコメントを投稿
  ├── PR サマリー（変更概要）
  ├── ウォークスルー（ファイルごとの変更詳細テーブル）
  └── コードレビュー（問題点の指摘）
        ↓
新しいコミットが push されると差分のみ再レビュー
```

**手動操作は一切不要。** PR を作るだけで動作する。

### レビューの内容

CodeRabbit のレビューは以下の観点で行われる:

- **バグ・ロジックエラー**: 潜在的なバグの検出
- **セキュリティ**: 脆弱性、インジェクション、認証の問題
- **パフォーマンス**: 非効率なコード、N+1 問題
- **ベストプラクティス**: コーディング規約違反、アンチパターン
- **型安全性**: TypeScript の型エラー、any の使用
- **テスト**: テストカバレッジの不足、テストの品質

---

## PR コメントコマンド

PR のコメント欄で `@coderabbitai` に続けてコマンドを記述することで操作できる。

### レビュー系

| コマンド | 説明 |
|---------|------|
| `@coderabbitai review` | 新しい変更のみを対象にレビューを再実行 |
| `@coderabbitai full review` | 全ファイルをゼロからフルレビュー |
| `@coderabbitai summary` | PR サマリーを再生成 |

**使い分け:**
- `review`: 追加コミット後に差分だけ見てほしいとき
- `full review`: 大幅なロジック変更後、全体を見直してほしいとき

### 操作系

| コマンド | 説明 |
|---------|------|
| `@coderabbitai resolve` | CodeRabbit の全レビューコメントを解決済みにする |
| `@coderabbitai pause` | 自動レビューを一時停止 |
| `@coderabbitai resume` | 一時停止を解除 |
| `@coderabbitai ignore` | この PR のレビューを永久無効化（**PR 説明文に記載**） |

### 生成系

| コマンド | 説明 |
|---------|------|
| `@coderabbitai generate docstrings` | 関数・クラスのドキュメント文字列を自動生成 |
| `@coderabbitai generate unit tests` | PR 内コードのテストケースを自動生成 |
| `@coderabbitai generate sequence diagram` | 変更のシーケンス図を生成 |

### 情報系

| コマンド | 説明 |
|---------|------|
| `@coderabbitai configuration` | 現在の設定を YAML 形式で表示 |
| `@coderabbitai help` | コマンド一覧を表示 |

---

## CodeRabbit との対話

### レビューコメントへの返信（推奨）

CodeRabbit がコード行に付けたレビューコメントに**直接返信**することで対話できる。

```
CodeRabbit: 「この関数は副作用を持つため、useEffect 内で呼ぶべきです」
        ↓
あなた: 「これは初期化時のみ実行されるため、意図的にこの位置で呼んでいます」
        ↓
CodeRabbit: 理解し、今後のレビューに反映
```

レビューコメントでの対話が**最も効果的**。
コードの文脈が自動的に提供されるため、的確な回答を得られる。

### PR コメントでの質問

PR のコメント欄で `@coderabbitai` にメンションして質問することも可能。

```
@coderabbitai このPRで変更したファイルの中で、パフォーマンスに影響がありそうな箇所はありますか？
```

ただし、レビューコメントと比較するとコンテキストが限定的になるため、**できるだけ具体的な質問**を心がける。

### 学習フィードバック

CodeRabbit は対話を通じて**学習**する。

```
「このタイプの指摘は不要です」
「このプロジェクトでは意図的にこのパターンを使っています」
```

こうしたフィードバックを返すと、以降のレビューで同様の指摘が抑制される。

---

## 本プロジェクトの設定（`.coderabbit.yaml`）

### 基本設定

| 設定 | 値 | 理由 |
|------|-----|------|
| `language` | `ja-JP` | 日本語プロジェクト |
| `profile` | `chill` | 個人学習プロジェクトのため教育的フィードバック優先 |
| `high_level_summary` | `true` | PR 概要を自動生成 |
| `request_changes_workflow` | `false` | 自動で「Changes Requested」にしない |
| `auto_reply` | `true` | チャットへの自動返信を有効化 |

### レビュー除外（`path_filters`）

以下のファイルはレビュー対象外:

- `**/*.lock` — ロックファイル
- `**/bun.lockb` — bun ロックファイル
- `**/*.png`, `**/*.jpg`, `**/*.gif` — 画像ファイル
- `docs/learning/**` — 学習ドキュメント

### パス別レビュー指示（`path_instructions`）

プロジェクトのアーキテクチャ・コーディング規約に基づいた指示が設定済み:

| パス | レビュー観点 |
|------|-------------|
| `src/features/**/*` | Feature-based + Clean Architecture の責務分離 |
| `src/**/*.ts` | 「目的」と「根拠」のコメント必須、JSDoc 必須 |
| `src/**/*.tsx` | React Native コンポーネント、横画面専用、NativeWind |
| `src/features/voice/**/*` | K.I.T.T. スタイル状態マシンパターン |
| `**/__tests__/**` | Jest テスト、日本語テスト名 |

### WIP PR の除外

PR タイトルに以下のキーワードが含まれる場合、自動レビューをスキップ:

- `WIP`
- `DO NOT MERGE`

---

## 運用 Tips

### 1. 連続 push 時はレビューを一時停止

短時間に複数回 push する場合、毎回レビューが走ると煩わしい。

```
# push 開始前
@coderabbitai pause

# 作業完了後
@coderabbitai resume
```

### 2. `resolve` は慎重に

`@coderabbitai resolve` は**全コメントが一括で解決済み**になる。
指摘を十分に確認してから使用すること。

### 3. WIP 中は PR タイトルを活用

作業中の PR には `WIP` を付けておけばレビューがスキップされる。
作業完了後にタイトルから `WIP` を除去すると、次の push でレビューが走る。

### 4. ドラフト PR はレビューされない

`drafts: false` の設定により、ドラフト PR は自動レビューの対象外。
レビューを受けたい段階で「Ready for review」に変更する。

### 5. フィードバックで育てる

CodeRabbit はプロジェクトに特化した指摘ができるようになる。
不要な指摘には積極的に「不要」とフィードバックを返す。

---

## トラブルシューティング

### レビューが実行されない

1. **GitHub App のインストール確認**: Settings > Integrations > Applications で `voice-scoreboard` が対象リポジトリに含まれているか確認
2. **ドラフト PR ではないか確認**: ドラフト PR はレビューされない設定
3. **PR タイトルに WIP が含まれていないか確認**
4. **手動トリガー**: `@coderabbitai review` で手動実行

### レビューが日本語で表示されない

`.coderabbit.yaml` の `language: "ja-JP"` が正しく設定されているか確認。
設定変更後は `@coderabbitai configuration` で現在の設定を確認できる。

### 特定のファイルをレビュー対象外にしたい

`.coderabbit.yaml` の `path_filters` に追加:
```yaml
path_filters:
  - "!path/to/exclude/**"
```

---

## 参考リンク

- CodeRabbit 公式ドキュメント: https://docs.coderabbit.ai/
- YAML 設定リファレンス: https://docs.coderabbit.ai/getting-started/yaml-configuration
- PR コマンドリファレンス: https://docs.coderabbit.ai/reference/review-commands
- YAML スキーマ: https://coderabbit.ai/integrations/schema.v2.json

---

*最終更新: 2026-02-09*
