---
name: dev-cycle
description: 'SDD開発サイクルの実行。Plan モードで実装計画を立て、/kiro:spec-impl で TDD 実装し、実行記録を作成する一連のワークフロー。タスク実装時に使用する（例: Task 1.2 を実装して、dev-cycle で 2.1 をやって）。'
---

# Dev-Cycle: SDD 開発サイクル

cc-sdd（Spec-Driven Development）に基づく開発サイクルを順守するためのワークフロー。
**このスキルの各ステップは順序通りに実行し、スキップしてはならない。**

## ワークフロー

引数: `<spec-name> <task-id>`（例: `dev-cycle voice-scoreboard 1.2`）

### Step 1: Plan モードで実装計画を立てる

1. `EnterPlanMode` ツールを使って Plan モードに入る
2. 以下を読み込んで実装計画を立てる:
   - `.kiro/specs/<spec-name>/tasks.md` から対象タスクの詳細
   - `.kiro/specs/<spec-name>/design.md` から関連する Contract・技術設計
   - 既存のコードベース（必要に応じて）
3. Plan に以下の 2 点を **必ず明示的に** 含める:
   - **`/kiro:spec-impl <spec-name> <task-id>` を呼び出して TDD 実装を実行する**（Step 2）
   - **実行記録の作成**（Step 3）
4. `ExitPlanMode` でユーザーの承認を得る
5. Plan 承認後、`TaskCreate` で実装ステップを Tasks として登録する（進捗の可視化のため）

**重要**: Plan の承認が得られるまで、実装コードの作成に着手してはならない。

### Step 2: /kiro:spec-impl で TDD 実装

1. Plan 承認後、**必ず** `/kiro:spec-impl` スキルを呼び出す:
   ```
   Skill tool: skill="kiro:spec-impl", args="<spec-name> <task-id>"
   ```
2. spec-impl が TDD サイクル（Red → Green → Refactor）を管理する
3. spec-impl の指示に従い、テスト作成 → 実装 → リファクタリング を実施する

**絶対禁止**: spec-impl をスキップして直接コードを書くこと。

### Step 3: 実行記録の作成

spec-impl 完了後、タスクログを作成する:

1. `references/task-log-template.md` のテンプレートを読み込む
2. `docs/02_TaskLog/<task-id>-<slug>.md` にタスクログを作成する
   - 例: `docs/02_TaskLog/1.2-nativewind-setup.md`
3. テンプレートの各セクションを実際の作業内容で埋める
4. `.kiro/specs/<spec-name>/tasks.md` の対象タスクを `[x]` に更新する

## References

- `references/task-log-template.md` - タスクログのテンプレート
