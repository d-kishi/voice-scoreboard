# cc-sdd（Spec-Driven Development）利用ガイド

## 概要

cc-sdd は Claude Code 上で **仕様駆動開発（SDD: Spec-Driven Development）** を実現するツール。
「仕様 → 要件 → 設計 → タスク → TDD 実装」の流れを、スラッシュコマンドで段階的に進める。

各フェーズには**承認ゲート**があり、前のフェーズが承認されないと次に進めない仕組みになっている。

## インストール情報

```bash
# 本プロジェクトでのインストールコマンド
bunx cc-sdd@latest --claude --lang ja --backup
```

| オプション       | 説明                                             |
| ---------------- | ------------------------------------------------ |
| `--claude`       | 11コマンド版（シンプル版）                       |
| `--claude-agent` | 12コマンド + 9サブエージェント版（将来移行予定） |
| `--lang ja`      | 日本語テンプレート                               |
| `--backup`       | 既存 CLAUDE.md をバックアップ                    |

## ディレクトリ構成

```
.kiro/
├── specs/                          # 機能ごとの仕様書
│   └── <feature-name>/
│       ├── spec.json               # メタデータ（フェーズ、承認状態、言語）
│       ├── requirements.md         # 要件定義書（EARS形式）
│       ├── design.md               # 技術設計書
│       ├── research.md             # 調査ログ（設計フェーズで生成）
│       └── tasks.md                # タスク一覧
├── steering/                       # プロジェクト知識ベース
│   ├── product.md                  # プロダクト情報
│   ├── tech.md                     # 技術スタック・慣習
│   └── structure.md                # コード構成パターン
└── settings/
    ├── rules/                      # 生成ルール（EARS形式、設計原則など）
    └── templates/                  # テンプレート（specs/steering）

.claude/commands/kiro/              # スラッシュコマンド定義（11ファイル）
```

---

## 基本ワークフロー

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  spec-init ──→ spec-requirements ──→ spec-design ──→ spec-tasks    │
│     │               │                    │               │          │
│  初期化          要件定義             技術設計         タスク分解    │
│  (WHAT)          (WHAT)              (HOW)           (TODO)        │
│                    ↓                    ↓               ↓          │
│                 [承認]              [承認]           [承認]         │
│                                                         │          │
│                                                    spec-impl      │
│                                                    TDD実装         │
│                                                   (Red→Green→     │
│                                                    Refactor)       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

各フェーズの間には**承認ゲート**がある。`-y` フラグで自動承認も可能。

---

## コマンド詳細

### 1. `/kiro:spec-init` — 仕様の初期化

```
/kiro:spec-init <プロジェクトの説明>
```

**例:**

```
/kiro:spec-init バレーボールスコアボードのスコア管理機能。左右チームの得点を管理し、ロールバック・リセット操作に対応する。
```

**やること:**

- 説明文から適切な feature 名を自動生成（例: `score-management`）
- `.kiro/specs/<feature-name>/` ディレクトリを作成
- `spec.json`（メタデータ）と `requirements.md`（説明文のみ）を生成

**ポイント:**

- このフェーズでは要件や設計は**生成されない**（フェーズ分離の原則）
- feature 名が重複する場合、自動で末尾に番号が付く（例: `score-management-2`）
- 説明文はできるだけ具体的に書くと、後続フェーズの品質が上がる

**次のステップ:**

```
/kiro:spec-requirements <feature-name>
```

---

### 2. `/kiro:spec-requirements` — 要件定義

```
/kiro:spec-requirements <feature-name>
```

**やること:**

- プロジェクト説明と steering コンテキストを読み込み
- **EARS 形式**（Easy Approach to Requirements Syntax）で要件を生成
- `requirements.md` を更新、`spec.json` のフェーズを更新

**EARS 形式とは:**

```
「When [条件], the [システム] shall [動作]」
「While [状態], the [システム] shall [動作]」
```

要件を構造的・テスト可能な形で記述するフォーマット。

**ポイント:**

- 要件は **WHAT**（何を作るか）に集中し、**HOW**（どう作るか）は含まない
- 生成後、内容を確認してフィードバック可能（対話的に修正できる）
- 要件 ID は数値のみ（例: 1, 2, 3...）。アルファベット ID は使わない
- steering ディレクトリが空の場合、品質に影響する旨の警告が出る

**承認フロー:**

- 内容に問題がなければ「承認」を伝える
- 修正が必要なら、フィードバックを伝えて再度 `/kiro:spec-requirements` を実行

**次のステップ:**

```
# 要件を承認して設計へ進む（-y で要件を自動承認）
/kiro:spec-design <feature-name> -y

# オプション: 既存コードベースとのギャップ分析
/kiro:validate-gap <feature-name>
```

---

### 3. `/kiro:spec-design` — 技術設計

```
/kiro:spec-design <feature-name> [-y]
```

**やること:**

1. **ディスカバリー（調査）**: 機能の複雑さに応じた調査を実施
2. **research.md 生成**: 調査結果をログとして記録
3. **design.md 生成**: アーキテクチャ、コンポーネント、インターフェースを定義
4. `spec.json` のフェーズを更新

**ディスカバリーの種類:**

| 種類        | 対象                 | 内容                                             |
| ----------- | -------------------- | ------------------------------------------------ |
| **Full**    | 新機能（greenfield） | WebSearch で外部 API・ライブラリ・パターンを調査 |
| **Light**   | 既存システムの拡張   | Grep でコードベースのパターン分析                |
| **Minimal** | 単純な CRUD/UI 追加  | パターン確認のみ                                 |

**design.md に含まれる内容:**

- アーキテクチャパターンと境界マップ（Mermaid 図）
- 技術スタック表
- システムフロー（シーケンス図/プロセス図/データ図）
- 要件トレーサビリティ（要件 → コンポーネントの対応表）
- コンポーネントとインターフェース契約

**ポイント:**

- `-y` フラグで前フェーズの要件を自動承認できる
- 設計は HOW（どう作るか）に集中。実装コードは含まない
- TypeScript では `any` 禁止、型安全性が求められる
- 既存の design.md がある場合はマージモードで動作

**次のステップ:**

```
# オプション: 設計レビュー
/kiro:validate-design <feature-name>

# タスク分解へ進む（-y で要件・設計を自動承認）
/kiro:spec-tasks <feature-name> -y
```

---

### 4. `/kiro:spec-tasks` — タスク分解

```
/kiro:spec-tasks <feature-name> [-y] [--sequential]
```

**やること:**

- 設計をもとに実装タスクを生成（1〜3時間単位）
- 全要件がタスクにマッピングされていることを検証
- `tasks.md` を生成

**tasks.md の構造例:**

```markdown
## Task 1: スコア状態管理の実装

- [ ] 1.1 zustand ストアの初期設定
- [ ] 1.2 スコア増減ロジックの実装
- [ ] 1.3 ロールバック機能の実装

## Task 2: UI コンポーネント (P)

- [ ] 2.1 スコアボード表示コンポーネント
- [ ] 2.2 操作ボタンコンポーネント
```

**`(P)` マーカー:**

- 並列実行可能なタスクに付与される
- `--sequential` フラグで無効化可能

**ポイント:**

- 最大2階層（メジャータスク + サブタスク）
- タスクは自然言語で記述（コード構造の詳細は含まない）
- すべての要件がタスクにマッピングされる（カバレッジ 100%）

**次のステップ:**

```
# 重要: 実装前にコンテキストをクリアすること推奨
# （会話履歴が長いとコンテキストが圧迫される）

# 特定タスクを実行
/kiro:spec-impl <feature-name> 1.1

# 複数タスクを実行
/kiro:spec-impl <feature-name> 1.1,1.2

# 全タスク実行（非推奨: コンテキスト肥大化のリスク）
/kiro:spec-impl <feature-name>
```

---

### 5. `/kiro:spec-impl` — TDD 実装

```
/kiro:spec-impl <feature-name> [task-numbers]
```

**やること:**
Kent Beck の TDD サイクルに従って実装:

1. **RED**: 失敗するテストを書く
2. **GREEN**: テストを通す最小限のコードを書く
3. **REFACTOR**: コードを整理（テストは引き続きパス）
4. **VERIFY**: 全テストの通過と既存テストの回帰がないことを確認
5. **MARK COMPLETE**: tasks.md のチェックボックスを `[x]` に更新

**使い方の例:**

```
# 単一タスク（推奨: タスク間でコンテキストをクリア）
/kiro:spec-impl score-management 1.1

# 複数タスク
/kiro:spec-impl score-management 1.1,1.2

# 全未完了タスク（非推奨）
/kiro:spec-impl score-management
```

**ポイント:**

- テストを先に書くことが**必須**（テストなしの実装は不可）
- 各タスクのスコープ内のみ実装（余計なコードを書かない）
- 既存テストが壊れたら実装を中断して修正

---

### 6. `/kiro:spec-status` — 進捗確認

```
/kiro:spec-status <feature-name>
# 引数なしで全 spec 一覧
/kiro:spec-status
```

**やること:**

- 各フェーズの完了状況（%）を表示
- 完了/残存タスク数を表示
- 次に実行すべきコマンドを提案
- ブロッカーがあれば表示

**いつでも使えるコマンド。** 作業の途中で現在地を確認したいときに便利。

---

## 補助コマンド

### `/kiro:validate-design` — 設計レビュー

```
/kiro:validate-design <feature-name>
```

設計の品質を対話的にレビューし、GO/NO-GO 判定を行う。
最大3つの重大な問題点のみ指摘（過剰な指摘を避ける）。
`spec-design` 後、`spec-tasks` 前に実行するのがおすすめ。

### `/kiro:validate-gap` — ギャップ分析

```
/kiro:validate-gap <feature-name>
```

既存コードベースと要件のギャップを分析する。
brownfield（既存プロジェクトへの機能追加）プロジェクトで有用。
`spec-requirements` 後、`spec-design` 前に実行するのがおすすめ。

### `/kiro:validate-impl` — 実装検証

```
/kiro:validate-impl [feature-name] [task-numbers]
# 引数なしで会話履歴から自動検出
/kiro:validate-impl
```

実装が要件・設計・タスクに準拠しているか検証する。
テストのパス状況、要件トレーサビリティ、設計との整合性をチェック。
GO/NO-GO 判定を行う。

### `/kiro:steering` — プロジェクト知識の管理

```
/kiro:steering
```

`.kiro/steering/` にプロジェクト全体の知識ベースを構築・維持する。

| モード        | 条件                      | やること                                                              |
| ------------- | ------------------------- | --------------------------------------------------------------------- |
| **Bootstrap** | steering が空または不完全 | コードベースを分析して `product.md`, `tech.md`, `structure.md` を生成 |
| **Sync**      | 既存 steering がある      | コードの変化を検出し、steering をアップデート                         |

**Expo プロジェクト初期化後に Bootstrap を実行するのがおすすめ。**

### `/kiro:steering-custom` — カスタム知識の追加

```
/kiro:steering-custom <feature-name>

<作成したい内容の説明>
```

ドメイン固有の steering ドキュメントを対話的に作成する。

**利用可能なテンプレート:**

- `api-standards.md` — REST/GraphQL 規約
- `testing.md` — テスト方針
- `security.md` — セキュリティ
- `database.md` — DB スキーマ・マイグレーション
- `error-handling.md` — エラーハンドリング
- `authentication.md` — 認証・認可
- `deployment.md` — CI/CD・デプロイ

**テンプレートにないトピックも作成可能。** その場合はゼロから生成される。

**プロンプトのポイント:**

カスタム steering はプロンプトの具体性が品質を左右する。以下を明示すると良い:

1. **目的**: なぜこの steering が必要か、誰が参照するか
2. **具体的な内容**: セクション構成や含めたい項目をリストで提示
3. **判定基準**: 条件やルールがある場合は明確に記述

**実践例（手動検証マイルストーン）:**

```
/kiro:steering-custom voice-scoreboard

ユーザによる手動検証マイルストーンのドキュメントを作成してください:

目的:
cc-sddが生成したtasks.mdはAI Agent向けのドキュメントであり、
人間による実機・エミュレータ等での動作確認タイミングは定義されません。
spec-implの実行時、作業完了時点でユーザがアプリケーションを操作し、
動作確認することを促すようにしてもらいたいです。

内容:
- タスク群ごとの検証マイルストーンを判定する
  - ユーザがエミュレータで動作確認する前提
  - 新しいユーザ体験が発生した際に動作確認する
  - 細かく1つのTaskごとではなく、関連性の高いタスク群が完了したタイミング
- AI Agentは以下をメッセージとして表示し、確認を促す
  - 各マイルストーンでの確認項目
  - 検証方法
  - フィードバック時の対応方針（どのフェーズに戻るか）
```

→ `.kiro/steering/verification-milestones.md` が生成された。

**steering の原則（注意点）:**

- steering は「プロジェクトメモリ」であり、詳細な仕様書ではない
- パターンと方針を記述し、ファイル一覧や実装詳細は避ける
- 1ファイル1トピック、100-200行程度に収める
- 全 steering ファイルは AI Agent のコンテキストに読み込まれる

---

## 実践的な Tips

### 1. コンテキスト管理

`spec-impl` の前と各タスク間で**新しい会話（セッション）を開始する**ことが推奨されている。
会話履歴が長くなるとコンテキストウィンドウを圧迫し、品質が低下する。

```
# 良い例: タスクごとにセッションを分ける
セッション1: /kiro:spec-init → spec-requirements → spec-design → spec-tasks
セッション2: /kiro:spec-impl feature-name 1.1
セッション3: /kiro:spec-impl feature-name 1.2
```

### 2. 承認を急がない

各フェーズの出力を確認し、気になる点があればフィードバックを返す。
cc-sdd は対話的に修正を受け付ける。`-y` フラグは内容に確信がある場合のみ使用する。

### 3. steering を活用する

steering が充実しているほど、要件・設計の品質が上がる。
プロジェクトの初期段階で `/kiro:steering` を実行し、知識ベースを構築しておく。

### 4. このプロジェクトでの推奨フロー

```
1. Expo プロジェクト初期化後に /kiro:steering（Bootstrap）
2. 機能開発開始時に /kiro:spec-init "機能の説明"
3. 順番に spec-requirements → spec-design → spec-tasks
4. タスクごとにセッションを分けて spec-impl
5. 実装完了後に /kiro:validate-impl で検証
```

---

_最終更新: 2026-02-13_
