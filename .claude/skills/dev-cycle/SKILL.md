---
name: dev-cycle
description: 'SDD開発サイクルの実行。Plan モードで実装予測を行い、/kiro:spec-impl で TDD 実装し、実行記録を作成する一連のワークフロー。タスク実装時に使用する（例: Task 1.2 を実装して、dev-cycle で 2.1 をやって）。'
---

# Dev-Cycle: SDD 開発サイクル

cc-sdd（Spec-Driven Development）に基づく開発サイクルを順守するためのワークフロー。
**このスキルの各ステップは順序通りに実行し、スキップしてはならない。**

## 基本原則

- **実装コードを直接書いてはならない。** 実装は全て `/kiro:spec-impl` に委任する。
- Plan の出力は「予測」であり「実装指示」ではない。
- spec-impl は tasks.md・design.md を自律的に読み込んで TDD を実行する。Plan の内容を spec-impl に渡す必要はない。

## ワークフロー

引数: `<spec-name> <task-id>`（例: `dev-cycle voice-scoreboard 1.2`）

### Step 1: Plan モードで実装予測レポートを作成する

1. `EnterPlanMode` ツールを使って Plan モードに入る
2. 以下を読み込んで対象タスクの実装予測を行う:
   - `.kiro/specs/<spec-name>/tasks.md` から対象タスクの詳細
   - `.kiro/specs/<spec-name>/design.md` から関連する Contract・技術設計
   - 既存のコードベース（必要に応じて）
3. **以下のフォーマットで Plan を出力する**:

```markdown
# Task <task-id> 実装予測レポート

## 対象タスク
（tasks.md から対象タスクの内容を転記）

## 実装予測

> ⚠️ 以下は spec-impl が行う実装の予測です。直接実装する指示ではありません。
> 実装は `/kiro:spec-impl` が tasks.md + design.md を基に自律的に行います。

### 予測: 変更対象ファイル
（新規作成・変更が予想されるファイルのリスト）

### 予測: 主要な技術的判断
（ライブラリ選定・設計パターンなど、事前に把握しておくべき判断）

### 予測: リスク・懸念事項
（互換性問題・既知の制約など）

## 承認後の実行手順

以下の 2 ステップのみを順序通りに実行する:

1. `/kiro:spec-impl <spec-name> <task-id>` を Skill ツールで呼び出す
2. 実行記録を `docs/02_TaskLog/<task-id>-<slug>.md` に作成する
```

4. `ExitPlanMode` でユーザーの承認を得る

**重要**: Plan の承認が得られるまで、いかなるコードの作成にも着手してはならない。

### Step 2: /kiro:spec-impl で TDD 実装

Plan 承認後、**即座に** `/kiro:spec-impl` スキルを Skill ツールで呼び出す:

```
Skill tool: skill="kiro:spec-impl", args="<spec-name> <task-id>"
```

spec-impl が以下を自律的に実行する:
- tasks.md・design.md・requirements.md を読み込み
- TDD サイクル（Red → Green → Refactor）で実装
- tasks.md のチェックボックスを更新

**このステップで dev-cycle が行うのは spec-impl の呼び出しのみ。** 自分でコードを書いてはならない。

### Step 3: 実行記録の作成

spec-impl 完了後、タスクログを作成する:

1. `references/task-log-template.md` のテンプレートを読み込む
2. `docs/02_TaskLog/<task-id>-<slug>.md` にタスクログを作成する
3. Step 1 の予測と spec-impl の実際の結果を比較して記録する
4. `.kiro/specs/<spec-name>/tasks.md` の対象タスクが `[x]` になっていることを確認する
   （spec-impl が更新済みのはずだが、漏れがあれば更新する）

## 禁止事項

- `/kiro:spec-impl` をスキップして直接コードを書くこと
- Plan の予測セクションの内容を実装指示として扱うこと
- Plan 承認前に実装に着手すること
- 実行記録の作成を省略すること

## References

- `references/task-log-template.md` - タスクログのテンプレート
