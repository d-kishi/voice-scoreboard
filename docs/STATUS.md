# プロジェクト進捗

## 現在の状況

| 項目 | 状態 |
|------|------|
| 要件定義 | ✅ 完了（README.md） |
| Gitリポジトリ | ✅ 作成済み（GitHub Public） |
| CLAUDE.md | ✅ 作成済み |
| 環境構築 | ✅ 完了（Windows + WSL + Android Studio） |
| DevContainer | ✅ 完了 |
| cc-sdd | ✅ 完了（--claude、11コマンド） |
| CodeRabbit | ✅ 完了（GitHub App + CLI + Claude Code プラグイン） |
| Figma Make | ⏳ 未着手 |
| 設計書 | ⏳ 未着手 |
| Expoプロジェクト | ⏳ 未着手 |

## 次回のタスク

1. **Figma Makeセットアップ** - 画面レイアウト設計
2. **設計書作成** - SDDで仕様→要件→技術設計→タスク分解
3. **Expoプロジェクト初期化** - 設計に基づき実装開始

## 完了済みタスク

- [x] プロジェクト企画・要件定義
- [x] 技術スタック選定
- [x] アーキテクチャ設計
- [x] 開発ワークフロー決定（SDD + TDD）
- [x] Gitリポジトリ作成・初回コミット
- [x] CLAUDE.md作成
- [x] 環境構築手順書作成・環境構築実施
- [x] DevContainer構築（Dockerfile + mise + post-create.sh + VSCode設定）
- [x] cc-sddセットアップ（--claude、11コマンド）
- [x] CodeRabbit導入（.coderabbit.yaml作成、GitHub Appは要インストール）
- [x] CodeRabbit CLI導入（v0.3.5、WSL環境で認証・レビュー動作確認済み）
- [x] CodeRabbit Claude Codeプラグイン導入（coderabbit:review）

## メモ

- 開発環境: Windows 11 + Docker Desktop + DevContainer
- 音声認識にネイティブモジュールが必要なため、Expo Goは使用不可
- 実地検証はAndroid実機（Preview Build）で実施予定
- Android実機: Android 16 (API 36)

---

*最終更新: 2026-02-11*
