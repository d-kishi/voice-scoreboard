---
name: device-deploy
description: >-
  WSL2 環境から Android 実機（Pixel 7a）またはエミュレータにアプリをビルド・デプロイするスキル。
  以下のケースで使用する:
  (1) 「実機にデプロイして」「Pixel にインストールして」等のデプロイ依頼
  (2) 「device-deploy」「/device-deploy」と直接指定された場合
  (3) logcat でデバッグログを確認したい場合
---

# Device Deploy（WSL2 + Android）

WSL2 上のプロジェクトを Android 実機またはエミュレータにビルド・デプロイするワークフロー。

## 引数

| 引数 | 説明 |
|------|------|
| `--clean` | デプロイ前にアプリデータをクリア |
| `--logcat` | デプロイ後に logcat ストリーミングを開始 |
| `--emulator` | 実機ではなくエミュレータをターゲットにする |

## 環境情報

| 項目 | 値 |
|------|-----|
| Android SDK | `/mnt/c/Users/ka837/AppData/Local/Android/Sdk` |
| Pixel 7a デバイスID | `32271JEHN19359` |
| パッケージ名 | `com.voicescoreboard.app` |
| プロジェクト Windows パス | `C:\Develop\voice-scoreboard` |
| エミュレータ AVD | `Pixel_7a` |
| adb | `~/.local/bin/adb`（WSL2 ラッパー → `adb.exe`） |

## ワークフロー

### Step 1: ターゲットデバイス確認

デバイスが接続されているか確認する。

```bash
# 接続デバイス一覧
adb.exe devices
```

- **実機**: `32271JEHN19359 device` が表示されれば OK
- **エミュレータ** (`--emulator`): `emulator-5554 device` が表示されれば OK
  - 未起動の場合: `/mnt/c/Users/ka837/AppData/Local/Android/Sdk/emulator/emulator.exe -avd Pixel_7a &`
  - 起動完了まで 30〜60 秒待つ

ターゲットデバイスの ADB シリアルを変数に格納する:
- 実機: `DEVICE_SERIAL=32271JEHN19359`
- エミュレータ: `DEVICE_SERIAL=emulator-5554`

### Step 2: アプリデータクリア（`--clean` 時のみ）

```bash
adb.exe -s $DEVICE_SERIAL shell pm clear com.voicescoreboard.app
```

AsyncStorage の設定データ等がリセットされる。

### Step 3: ネイティブコード変更の判断

- `android/` が存在しない → `bunx expo prebuild --platform android` を実行
- `app.json` やネイティブプラグインを変更した → `bunx expo prebuild --platform android --clean` を実行
  - **prebuild --clean 後の復元**: CLAUDE.md の「`expo prebuild --clean` 後に必要な復元」セクションを必ず参照
- JS/TS のみの変更 → prebuild 不要、Step 4 へ

### Step 4: JS バンドルキャッシュのクリア（JS/TS 変更時は必須）

JS/TS ソースコードを変更した場合、**ビルド前に Gradle の JS バンドルキャッシュを必ず削除する**。
Gradle の `createBundleReleaseJsAndAssets` タスクは UP-TO-DATE 判定で古いバンドルを再利用することがあり、ソースコード変更が APK に反映されない。

```bash
rm -rf /mnt/c/Develop/voice-scoreboard/android/app/build/generated/assets/createBundleReleaseJsAndAssets/
```

ネイティブコード（Java/Kotlin/C++）のみの変更ではこの手順は不要。

### Step 5: ビルド

ターゲットに応じてアーキテクチャを指定する:

```bash
# 実機（arm64-v8a）
CMAKE_VERSION=3.28.3 bunx expo run:android --variant release

# エミュレータ（x86_64）— 実機も接続中の場合は Gradle 直接実行
cd /mnt/c/Develop/voice-scoreboard/android && \
  ORG_GRADLE_PROJECT_reactNativeArchitectures=x86_64 \
  CMAKE_VERSION=3.28.3 \
  ./gradlew app:assembleRelease -x lint -x test --configure-on-demand --build-cache
```

- 初回: 20〜26 分、キャッシュ済み: 5〜9 分
- **バックグラウンドで実行**し、ユーザーに所要時間を伝える

**重要**: `expo run:android` は接続中デバイスのアーキテクチャを自動検出する。実機（arm64）とエミュレータ（x86_64）が同時接続の場合、arm64 が選択されてエミュレータで `libreactnative.so` が見つからずクラッシュする。エミュレータ向けには `ORG_GRADLE_PROJECT_reactNativeArchitectures=x86_64` で Gradle を直接実行すること。

### Step 6: APK インストール

`expo run:android` の自動インストールは WSL パスで失敗するため、**Windows パス形式で手動インストール**する。
インストール前に既存プロセスを強制停止する（古いプロセスが残っていると新しい APK のコードが反映されない）。

```bash
adb.exe -s $DEVICE_SERIAL shell am force-stop com.voicescoreboard.app
adb.exe -s $DEVICE_SERIAL install -r -d "C:\\Develop\\voice-scoreboard\\android\\app\\build\\outputs\\apk\\release\\app-release.apk"
```

### Step 7: アプリ起動

```bash
adb.exe -s $DEVICE_SERIAL shell am start -n com.voicescoreboard.app/.MainActivity
```

### Step 8: logcat モニタリング（`--logcat` 時、または任意）

**重要**: WSL2 では `adb.exe logcat` のパイプが正常に動作しないことがある。`adb.exe shell "logcat ..."` 形式を使用する。

```bash
# バッファクリア
adb.exe -s $DEVICE_SERIAL shell "logcat -c"

# ReactNativeJS ログをストリーミング（バックグラウンド）
adb.exe -s $DEVICE_SERIAL shell "logcat -s ReactNativeJS:V" &

# ダンプモード（過去ログ一括取得）
adb.exe -s $DEVICE_SERIAL shell "logcat -d" | grep ReactNativeJS
```

### Step 9: 確認報告

ユーザーに以下を報告する:
- ターゲットデバイス（実機 / エミュレータ）
- アプリが起動したこと
- logcat モニタリングの状態（開始 / 未開始）

## WSL2 固有の注意事項

- **サンドボックス無効化必須**: Gradle ビルド（Step 5）は `~/.gradle/` への書き込みが必要。Bash ツールで `dangerouslyDisableSandbox: true` を指定すること。サンドボックス有効のままだと `gradle-*.zip.lck (Read-only file system)` エラーで失敗する
- **JS バンドルキャッシュ問題**: Gradle は JS バンドルの UP-TO-DATE 判定を誤ることがある。JS/TS を変更した場合は **Step 4 のキャッシュクリアを必ず実行すること**。これを怠るとソースコード変更がデバイスに反映されない（2026-02-25 に発生）
- **パス変換**: APK インストール時は Windows パス（`C:\\...`）を使用。WSL パス（`/mnt/c/...`）は adb.exe が解釈できない
- **logcat パイプ問題**: `adb.exe logcat -d | grep ...` は WSL2 で空結果になることがある。`adb.exe shell "logcat -d"` 形式で回避
- **adb ラッパー**: `~/.local/bin/adb` は `adb.exe` へのラッパー。直接 `adb.exe` を呼んでも同じ
