# Research & Design Decisions

## Summary
- **Feature**: `voice-scoreboard`
- **Discovery Scope**: New Feature（グリーンフィールド）
- **Key Findings**:
  - `@react-native-voice/voice` は2026年1月31日にアーカイブ済み。`expo-speech-recognition` に移行が必要
  - `expo-av` はSDK 52で非推奨。SDK 52では動作するが、SDK 55で削除予定。効果音再生には `expo-av` を使用し、将来 `expo-audio` に移行
  - `zundo` ミドルウェアでzustandのundo/redo（ロールバック）を実現可能

## Research Log

### 音声認識ライブラリの選定
- **Context**: README.mdでは `@react-native-voice/voice` を採用予定としていた
- **Sources Consulted**:
  - https://github.com/react-native-voice/voice （Issue #507, #441, #542）
  - https://github.com/jamsch/expo-speech-recognition
  - https://www.npmjs.com/package/@react-native-voice/voice
- **Findings**:
  - `@react-native-voice/voice` v3.2.4（最終更新2022年5月）は2026年1月31日にアーカイブ済み
  - Expo SDK 52との `@expo/config-plugins` バージョン不一致（^2.0.4 vs ~9.0.0）が未解決
  - 連続認識モード（continuous mode）は未実装のままアーカイブ
  - `expo-speech-recognition` がExpo SDK 52+対応で、config plugin内蔵、`continuous: true`、`contextualStrings`、`androidIntentOptions` をサポート
- **Implications**: `expo-speech-recognition` を採用する。README.mdの技術スタック表を更新する必要がある

### Androidでの音声認識タイムアウト
- **Context**: 常時リスニング方式でウェイクワード検出を行う設計
- **Sources Consulted**:
  - https://github.com/react-native-voice/voice/issues/441
  - https://github.com/jamsch/expo-speech-recognition/blob/main/README.md
- **Findings**:
  - Androidでは約10秒、または最初の無音検出で音声認識が自動停止する
  - `expo-speech-recognition` では `androidIntentOptions.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS` で無音判定時間を制御可能
  - `end` イベントで `start()` を再呼び出しする再起動ループパターンが標準的な解決策
  - K.I.T.T.スタイルのLISTENING状態（3秒間）はAndroidの自動停止よりも短いため問題なし
- **Implications**: IDLE状態での常時リスニングは再起動ループで実装。LISTENING状態は3秒タイマーで制御

### expo-avの非推奨と移行パス
- **Context**: ホイッスル音などの効果音再生にexpo-avを使用予定
- **Sources Consulted**:
  - https://docs.expo.dev/versions/latest/sdk/av/
  - https://docs.expo.dev/versions/latest/sdk/audio/
  - https://github.com/expo/expo/blob/sdk-52/packages/expo-av/package.json
  - https://github.com/expo/expo/blob/sdk-52/packages/expo-audio/package.json
- **Findings**:
  - expo-av 15.0.2: SDK 52で安定動作。SDK 53以降メンテナンスのみ、SDK 55で削除予定
  - expo-audio 0.3.5: SDK 52でアルファステータス。breaking changes のリスクあり
  - ホイッスル音（5秒）のような単純な効果音再生はどちらでも実装可能
- **Implications**: SDK 52ではexpo-av（安定版）を使用。SDK 53以降でexpo-audioへ移行を検討

### 音声読み上げと音声認識の競合
- **Context**: 「Ready」「Roger」応答の読み上げと常時リスニングの共存
- **Sources Consulted**:
  - https://docs.expo.dev/versions/latest/sdk/speech/
- **Findings**:
  - Androidでは同時に1つのマイクアクセスしか許可されない
  - 音声認識を一旦停止 → 読み上げ → 読み上げ完了後に音声認識を再開する逐次実行パターンが推奨
  - K.I.T.T.スタイルの状態マシン（ウェイクワード検知→Ready応答→LISTENING→コマンド検知→Roger応答→IDLE）は逐次実行と自然に合致
- **Implications**: 状態マシンの遷移時に音声認識を停止→読み上げ→音声認識再開の順で処理

### zustandでの操作履歴（ロールバック）
- **Context**: ロールバック機能の実装方式
- **Sources Consulted**:
  - https://github.com/charkour/zundo
  - https://zustand.docs.pmnd.rs/integrations/immer-middleware
  - https://zustand.docs.pmnd.rs/integrations/persisting-store-data
- **Findings**:
  - `zundo`（700B未満）: zustand v5対応のtemporal（時間軸）ミドルウェア。`undo()`, `redo()`, `clear()`, `pastStates`, `futureStates` を提供
  - zustand v5.0.11が最新。React 18が最低要件
  - `immer` ミドルウェアでミューテーション風のコードが書ける
  - `persist` + `createJSONStorage(() => AsyncStorage)` で設定の永続化が可能
- **Implications**: ロールバックは `zundo` の `undo()` で実装。リセットは直接 `set()` で0-0に戻す

### NativeWindバージョン選定
- **Context**: スタイリングにNativeWind（Tailwind CSS for React Native）を使用
- **Sources Consulted**:
  - https://www.nativewind.dev/
  - https://github.com/nativewind/nativewind
  - https://www.nativewind.dev/v5/guides/migrate-from-v4
  - https://github.com/nativewind/nativewind/issues/1342
- **Findings**:
  - v4.1.21: 安定版。Tailwind CSS ^3.4.17。Expo SDK 52で動作確認済み
  - v5: プレリリース。React Native 0.81+、Tailwind CSS 4.1+が必要。本番非推奨
  - SDK 52ではmetro.config.jsとbabel.config.jsの手動作成が必要
  - ダークモードは `useColorScheme` hook + `dark:` プレフィックスで対応
  - React Nativeの制限: スタイルカスケードなし、影の挙動差異、flexデフォルト値の違い
- **Implications**: v4.1.21を採用。横画面スコアボードというシンプルUIでは制限事項の影響は軽微

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Feature-based + Clean Architecture軽量版 | 機能ごとにディレクトリ分割 + 責務分離 | 将来の競技追加に対応しやすい。テスト容易 | 小規模アプリにはやや重い | README.mdで採用決定済み |
| フラット構造 | 単純なファイル構成 | 初期開発が速い | 機能追加時にスケールしない | 不採用: 将来の競技追加を考慮 |

## Design Decisions

### Decision: 音声認識ライブラリの変更
- **Context**: README.mdでは `@react-native-voice/voice` を計画していた
- **Alternatives Considered**:
  1. `@react-native-voice/voice` — 元の計画通り
  2. `expo-speech-recognition` — Expo統合の音声認識ライブラリ
  3. `react-native-vosk` — オフラインSTTエンジン
- **Selected Approach**: `expo-speech-recognition`（`@jamsch/expo-speech-recognition`）
- **Rationale**: 元のライブラリがアーカイブ済みでSDK 52非互換。expo-speech-recognitionはExpoエコシステムに統合され、`contextualStrings`やcontinuousモードなど本プロジェクトに有用な機能がある
- **Trade-offs**: サードパーティ（非公式Expo）ライブラリだが、アクティブにメンテナンスされている
- **Follow-up**: README.mdの技術スタック表を更新する

### Decision: SDK 52での効果音再生ライブラリ
- **Context**: ホイッスル音の再生に使用するライブラリ
- **Alternatives Considered**:
  1. `expo-av` — 非推奨だがSDK 52で安定
  2. `expo-audio` — 新しいがアルファ品質
- **Selected Approach**: `expo-av`（SDK 52では15.0.2）
- **Rationale**: SDK 52ではexpo-audioがアルファステータスで、API変更リスクがある。expo-avはSDK 52で完全に安定動作する
- **Trade-offs**: SDK 53以降でexpo-audioへの移行が必要
- **Follow-up**: SDK 53リリース時にexpo-audio移行を検討

### Decision: ロールバック実装方式
- **Context**: 「直前の1操作のみ取り消し可能」の要件
- **Alternatives Considered**:
  1. 自前の操作スタック管理
  2. `zundo`（zustand temporal middleware）
- **Selected Approach**: `zundo` を使用
- **Rationale**: 700B未満の軽量ライブラリ。zustandのストアに `temporal()` を巻くだけで `undo()` / `redo()` が使える。自前実装の手間とバグリスクを回避
- **Trade-offs**: 外部依存が1つ増える（ただし非常に軽量）
- **Follow-up**: ロールバックは直前1操作のみに限定（zundoの `undo(1)` で実現）

## Risks & Mitigations
- **expo-speech-recognitionのメンテナンス継続性** — 個人開発（jamsch）のライブラリ。代替案としてreact-native-voskを念頭に置く
- **音声認識と読み上げの競合** — 逐次実行パターンで対応。状態マシンの設計で排他制御を保証
- **expo-avの非推奨** — SDK 52では問題なし。SDK 53以降の移行パスは明確（expo-audio）
- **Androidの音声認識タイムアウト** — 再起動ループ + androidIntentOptionsで緩和
- **NativeWindのRN制限** — 横画面スコアボードはシンプルUIのため影響軽微

## References
- [expo-speech-recognition GitHub](https://github.com/jamsch/expo-speech-recognition) — 音声認識ライブラリ（採用決定）
- [react-native-voice/voice GitHub](https://github.com/react-native-voice/voice) — アーカイブ済み（不採用）
- [expo-speech ドキュメント](https://docs.expo.dev/versions/latest/sdk/speech/) — TTS
- [expo-av ドキュメント](https://docs.expo.dev/versions/latest/sdk/av/) — 効果音再生（非推奨だがSDK 52で安定）
- [expo-keep-awake ドキュメント](https://docs.expo.dev/versions/latest/sdk/keep-awake/) — 画面スリープ防止
- [zustand GitHub](https://github.com/pmndrs/zustand) — 状態管理
- [zundo GitHub](https://github.com/charkour/zundo) — undo/redoミドルウェア
- [NativeWind ドキュメント](https://www.nativewind.dev/) — スタイリング
- [NativeWind ダークモード](https://www.nativewind.dev/docs/core-concepts/dark-mode) — ダークモード実装
