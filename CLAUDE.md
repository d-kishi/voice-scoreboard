# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 進捗状況

**セッション開始時に必ず @.kiro/specs/voice-scoreboard/tasks.md を確認すること。**

## プロジェクト概要

音声操作対応のスポーツスコアボードアプリ（React Native + Expo）。
バレーボール練習時の得点板代わりに使用。学習目的を兼ねた個人開発。

## パッケージマネージャー

**bun を使用（npm/yarn は使用しない）**

> **注意**: bunをメインで使用しますが、Node.js LTSも必要です。
> Expoの一部コマンド（`expo prebuild`、`eas build`など）が内部で`npm pack`を呼び出すため。

**ネイティブパッケージの追加時は `bun add` ではなく `bunx expo install <pkg>` を使うこと。**
`bun add` は npm レジストリの最新版を取得するため、Expo SDK の動作保証バージョンと一致しない場合がある。

## コマンド

```bash
# 依存関係インストール
bun install

# 開発サーバー起動
bun start

# テスト実行
bun run test

# 単一テスト実行
bun run test --testPathPattern="ファイル名"

# リント
bun run lint

# 型チェック
bun run typecheck

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

### 仕様策定フェーズ

1. `/kiro:spec-init` → 仕様作成
2. `/kiro:spec-requirements` → 要件定義
3. `/kiro:spec-design` → 技術設計
4. `/kiro:spec-tasks` → タスク分解

### 実装フェーズ（必須ルール）

**タスク実装時は必ず `/dev-cycle` スキルを Opus モデルで使用すること。**

```
/dev-cycle <spec-name> <task-id>
```

以下の3ステップを順序通りに実行し、スキップしてはならない:

1. **Plan モード**: 実装計画を立て、ユーザーの承認を得る
2. **`/kiro:spec-impl`**: TDD 実装（Red → Green → Refactor）
3. **実行記録作成**: `docs/02_TaskLog/` にタスクログを作成

**禁止事項**:
- `/kiro:spec-impl` をスキップして直接コードを書くこと
- Plan 承認前に実装に着手すること
- 実行記録の作成を省略すること

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

## Claude Code設定

- **Agent Teams**: 有効（ユーザ設定 `~/.claude/settings.json` で `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` を設定済み）

## エミュレータプレビュー

**UI 確認時は `/emulator-preview` スキルを使用する。** WSL2 + Android エミュレータのビルド・起動手順が定義されている。

## テスト環境のナレッジ

### ネイティブモジュールのモック

`@expo/vector-icons` など `expo-font` に依存するモジュールは、Jest 環境で `loadedNativeFonts.forEach is not a function` エラーを起こす。`__mocks__/` ディレクトリに手動モックを配置して解決する。

```
__mocks__/@expo/vector-icons.js   ← 作成済み（Feather, Ionicons）
```

新しいアイコンセット（MaterialIcons 等）を使う場合は、このモックファイルに export を追加すること。

### jest.setup.ts でのモック制限

`jest.setup.ts` は `.ts` 拡張子のため JSX が使えない。さらに NativeWind（react-native-css-interop）が挿入する `_ReactNativeCSSInterop` 変数により、`jest.mock()` ファクトリ内での `require()` 呼び出しがスコープ制限に抵触する。

**対処法**: `jest.setup.ts` 内の `jest.mock()` ではなく、`__mocks__/` ディレクトリ方式を使う。

### zustand persist のテスト

`await rehydrate()` の Promise 解決は状態更新完了を保証しない。テストでリハイドレーションを待つ場合は `onFinishHydration` コールバックを使うこと。

## Android ビルド環境の注意事項（WSL2）

### `bun install` 後に必要な手動パッチ

`react-native-worklets@0.7.4` は RN 0.76 をサポート対象外としているため、`bun install` や `rm -rf node_modules` の後に compatibility.json を手動パッチする必要がある:

```bash
# node_modules/react-native-worklets/compatibility.json の "0.7.x".react-native 配列に "0.76" を追加
node -e "
const fs = require('fs');
const p = 'node_modules/react-native-worklets/compatibility.json';
const j = JSON.parse(fs.readFileSync(p));
if (!j['0.7.x']['react-native'].includes('0.76')) {
  j['0.7.x']['react-native'].unshift('0.76');
  fs.writeFileSync(p, JSON.stringify(j, null, 2));
  console.log('Patched');
} else { console.log('Already patched'); }
"
```

### `expo prebuild --clean` 後に必要な復元

`expo prebuild --clean` は `android/` を再生成するため、以下のカスタマイズが消える:

1. **`android/app/build.gradle`**: `packagingOptions` に `pickFirsts += ['**/libworklets.so']` を再追加
   - react-native-reanimated と react-native-worklets の両方が `libworklets.so` を生成するため重複解消が必要
2. **`android/local.properties`**: `sdk.dir=/mnt/c/Users/ka837/AppData/Local/Android/Sdk` を再作成

### release ビルドコマンド

```bash
CMAKE_VERSION=3.28.3 bunx expo run:android --variant release
```

`CMAKE_VERSION` 環境変数は、ネイティブ Linux cmake（3.28.3）と build.gradle が期待するバージョン（3.22.1）の不一致を解消するために必要。

## 制約事項

- **Expo Goは使用不可**: 音声認識（@react-native-voice/voice）にネイティブモジュールが必要
- **横画面専用**: ランドスケープモードのみ対応
- **日本語音声認識**: ja-JP ロケールを使用

## cc-sdd

- 現在: `--claude`（11コマンド）で運用中
- 近日: `--claude-agent`（12コマンド + 9サブエージェント）に移行予定

## 学習ドキュメント

開発中に `docs/learning/` へ以下を生成する：
- React Native基礎
- Expo / Development Build
- EAS Build / EAS Submit
