# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 進捗状況

**セッション開始時に必ず @docs/STATUS.md を確認すること。**

## プロジェクト概要

音声操作対応のスポーツスコアボードアプリ（React Native + Expo）。
バレーボール練習時の得点板代わりに使用。学習目的を兼ねた個人開発。

## コマンド

```bash
# 開発サーバー起動
npm start

# テスト実行
npm test

# 単一テスト実行
npm test -- --testPathPattern="ファイル名"

# リント
npm run lint

# 型チェック
npm run typecheck

# Preview Build（Android実機テスト用）
eas build --platform android --profile preview
```

## アーキテクチャ

**Feature-based + Clean Architecture 軽量版**

```
src/
├── features/           # 機能モジュール（score, voice, settings）
│   └── [feature]/
│       ├── components/ # UI（Presentation）
│       ├── hooks/      # ロジック（UseCase相当）
│       ├── services/   # 外部サービス連携
│       └── types/      # 型定義（Entity相当）
├── components/         # 共通UIコンポーネント
├── stores/             # zustand ストア
├── utils/              # 共通ユーティリティ
└── types/              # 共通型定義
```

## 状態管理

- **zustand**: ランタイム状態（スコア、操作履歴）
- **AsyncStorage**: 永続化（設定のみ）

## 音声認識の状態マシン（K.I.T.T.スタイル）

```
IDLE（待機）──「スコア」検出──→ 「Ready」応答 ──→ LISTENING（認識モード・3秒間）
     ↑                                                    │
     └──────「Roger」応答 + コマンド実行 or タイムアウト───┘
```

- IDLE: ウェイクワード「スコア」のみ認識
- LISTENING: 「右」「左」「ロールバック」「リセット」を認識
- ロールバック/リセット実行後はスコア読み上げ

## 開発ワークフロー

**SDD（cc-sdd）+ TDD**

1. `/kiro:spec-init` → 仕様作成
2. `/kiro:spec-requirements` → 要件定義
3. `/kiro:spec-design` → 技術設計
4. `/kiro:spec-tasks` → タスク分解
5. `/kiro:spec-impl` → TDD実装（Red→Green→Refactor）

## コーディング規約

### コメント方針（必須）

すべてのコードに「目的」と「根拠」を記載する：

```typescript
// 【目的】音声認識の結果をコマンドとして解釈する
// 【根拠】コールバック形式を採用。Promiseではなくコールバックを使う理由は、
//        認識中に部分的な結果も受け取れるようにするため
const handleSpeechResult = (result: string) => {
  // ...
};
```

### その他

- 関数・コンポーネントの冒頭にJSDocで概要を記述
- React Native / Expo特有の概念は補足説明を追加
- 「なぜそうしないか」も必要に応じて記載

## 制約事項

- **Expo Goは使用不可**: 音声認識（@react-native-voice/voice）にネイティブモジュールが必要
- **横画面専用**: ランドスケープモードのみ対応
- **日本語音声認識**: ja-JP ロケールを使用

## 学習ドキュメント

開発中に `docs/learning/` へ以下を生成する：
- React Native基礎
- Expo / Development Build
- EAS Build / EAS Submit
