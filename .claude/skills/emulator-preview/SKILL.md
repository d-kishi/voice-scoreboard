---
name: emulator-preview
description: >-
  WSL2 環境で Android エミュレータにアプリをビルド・インストール・起動するスキル。
  以下のケースで使用する:
  (1) 「フロントでアプリケーションを表示して」「エミュレータで確認」「アプリを起動して」等の UI 確認依頼
  (2) UI 変更後のエミュレータプレビュー
  (3) M2 検証（デザインカンプとの比較）
  (4) 「emulator-preview」「/emulator-preview」と直接指定された場合
---

# Emulator Preview（WSL2 + Android）

WSL2 上のプロジェクトを Android エミュレータで表示するワークフロー。

## 引数

| 引数 | 説明 |
|------|------|
| `--logcat` | デプロイ後に logcat モニタリングを開始 |

## 環境情報

| 項目 | 値 |
|------|-----|
| Android SDK | `/mnt/c/Users/ka837/AppData/Local/Android/Sdk` |
| エミュレータ | `emulator.exe`（Windows 側） |
| AVD | `Pixel_7a` |
| adb | `~/.local/bin/adb`（WSL2 ラッパー → `adb.exe`） |
| プロジェクト Windows パス | `C:\Develop\voice-scoreboard` |

## ワークフロー

### Step 1: エミュレータ起動確認

エミュレータが既に起動中か確認し、未起動なら起動する。

```bash
# 起動中デバイスの確認
adb devices

# 未起動の場合、バックグラウンドで起動
/mnt/c/Users/ka837/AppData/Local/Android/Sdk/emulator/emulator.exe -avd Pixel_7a &
```

`adb devices` で `emulator-5554 device` が表示されれば起動済み。
起動には 30〜60 秒かかる。`device` 状態になるまで待つ。

### Step 2: native コード変更の有無を判断

- `android/` が存在しない → `bunx expo prebuild --platform android` を実行
- `app.json` や native plugin を変更した → `bunx expo prebuild --platform android --clean` を実行
- JS/TS のみの変更 → prebuild 不要、Step 3 へ

### Step 3: ビルド

実機（arm64）も接続されている場合、`expo run:android` が arm64 を自動選択してしまう。
エミュレータ（x86_64）向けには **Gradle を直接実行**してアーキテクチャを明示する:

```bash
cd /mnt/c/Develop/voice-scoreboard/android && \
  ORG_GRADLE_PROJECT_reactNativeArchitectures=x86_64 \
  CMAKE_VERSION=3.28.3 \
  ./gradlew app:assembleRelease -x lint -x test --configure-on-demand --build-cache
```

実機が未接続で、エミュレータのみの場合は `bunx expo run:android --variant release` でも可。

- 初回: 20〜26 分（9P ファイルシステムブリッジの影響）
- 2 回目以降: Gradle キャッシュにより短縮（CMake キャッシュ済みなら 5〜9 分）
- **バックグラウンドで実行**し、ユーザーに所要時間を伝える
- ビルド中はユーザーが他の作業を行えるよう配慮する

### Step 4: APK インストール

`expo run:android` の自動インストールは WSL パスを adb.exe に渡すため失敗する。
**Windows パス形式で手動インストール**する。

```bash
adb.exe install -r -d "C:\\Develop\\voice-scoreboard\\android\\app\\build\\outputs\\apk\\release\\app-release.apk"
```

### Step 5: アプリ起動

```bash
adb.exe shell am start -n com.voicescoreboard.app/.MainActivity
```

### Step 6: logcat モニタリング（`--logcat` 時、または任意）

**重要**: WSL2 では `adb.exe logcat` のパイプが正常に動作しないことがある。`adb.exe shell "logcat ..."` 形式を使用する。

```bash
# バッファクリア
adb.exe shell "logcat -c"

# ReactNativeJS ログをストリーミング（バックグラウンド）
adb.exe shell "logcat -s ReactNativeJS:V" &

# ダンプモード（過去ログ一括取得）
adb.exe shell "logcat -d" | grep ReactNativeJS
```

### Step 7: 確認報告

ユーザーに以下を報告する:
- アプリが起動したこと
- 横画面（ランドスケープ）表示の確認
- 画面の表示内容の概要

## WSL2 固有の注意事項

- **パス変換**: APK インストール時は Windows パス（`C:\\...`）を使用。WSL パス（`/mnt/c/...`）は adb.exe が解釈できない
- **logcat パイプ問題**: `adb.exe logcat -d | grep ...` は WSL2 で空結果になることがある。`adb.exe shell "logcat -d"` 形式で回避
- **adb ラッパー**: `~/.local/bin/adb` は `adb.exe` へのラッパー。`$ANDROID_HOME/platform-tools/adb` は `adb.exe` へのシンボリックリンク
- **ビルド速度**: `/mnt/c/` 上の Gradle ビルドは遅い。ユーザーに待ち時間を事前に伝える
