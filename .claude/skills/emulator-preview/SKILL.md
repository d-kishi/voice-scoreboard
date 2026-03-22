---
name: emulator-preview
description: >-
  Android エミュレータでアプリの画面表示や動作をプレビュー確認するためのワークフロー（WSL2 + Gradle + adb）。
  このスキルを使うべき場面: エミュレータでプレビューしたい、エミュレータで確認したい、
  エミュレータにデプロイして、x86_64 ビルドで試したい、emulator-preview、/emulator-preview。
  実機へのデプロイには device-deploy スキルを使うこと。
---

# Emulator Preview（WSL2 + Android エミュレータ）

WSL2 上のプロジェクトを Android エミュレータにビルド・デプロイして画面表示や動作を確認するワークフロー。

## 引数

| 引数       | 説明                                     |
| ---------- | ---------------------------------------- |
| `--debug`  | debug ビルド（Metro 接続あり）           |
| `--release`| release ビルド（デフォルト）              |
| `--logcat` | デプロイ後に logcat ストリーミングを開始 |
| `--clean`  | デプロイ前にアプリデータをクリア         |

## 環境情報

| 項目                      | 値                                              |
| ------------------------- | ----------------------------------------------- |
| Android SDK               | `/mnt/c/Users/ka837/AppData/Local/Android/Sdk`  |
| パッケージ名              | `com.voicescoreboard.app`                       |
| プロジェクト Windows パス | `C:\Develop\voice-scoreboard`                   |
| エミュレータ AVD          | `Pixel_7a`                                      |
| adb                       | `~/.local/bin/adb`（WSL2 ラッパー → `adb.exe`） |
| ターゲットアーキテクチャ  | `x86_64`                                        |

## ワークフロー

### Step 1: エミュレータ起動確認

```bash
adb.exe devices
```

- `emulator-5554 device` が表示されれば OK
- 未起動の場合:
  ```bash
  /mnt/c/Users/ka837/AppData/Local/Android/Sdk/emulator/emulator.exe -avd Pixel_7a &
  ```
  - 起動完了まで 30〜60 秒待つ
  - タッチが反応しない場合は `-no-snapshot-load` でコールドブートする

ADB シリアルを変数に格納する: `DEVICE_SERIAL=emulator-5554`

### Step 2: アプリデータクリア（`--clean` 時のみ）

```bash
adb.exe -s $DEVICE_SERIAL shell pm clear com.voicescoreboard.app
```

### Step 3: ネイティブコード変更の判断

- `android/` が存在しない → `bunx expo prebuild --platform android` を実行
- `app.json` やネイティブプラグインを変更した → `bunx expo prebuild --platform android --clean` を実行
  - **prebuild --clean 後の復元**: CLAUDE.md の「`expo prebuild --clean` 後に必要な復元」セクションを必ず参照
- JS/TS のみの変更 → prebuild 不要、Step 4 へ

### Step 4: JS バンドルキャッシュのクリア（常に実行・スキップ禁止）

**ビルド前に Gradle の JS バンドルキャッシュを必ず削除する。変更内容に関係なく常に実行すること。**

`git checkout` / `git stash` 等でソースを復元した場合、タイムスタンプが更新されず古い JS バンドルが再利用される問題が過去に複数回発生している。

```bash
rm -rf /mnt/c/Develop/voice-scoreboard/android/app/build/generated/assets/createBundleReleaseJsAndAssets/
rm -rf /mnt/c/Develop/voice-scoreboard/android/app/build/intermediates/sourcemaps/
```

### Step 5: ビルド（x86_64 固定）

```bash
cd /mnt/c/Develop/voice-scoreboard/android && \
  CMAKE_VERSION=3.28.3 \
  ./gradlew app:assembleRelease \
  -PreactNativeArchitectures=x86_64 \
  -x lint -x test --configure-on-demand --build-cache
```

- 初回: ~15 分、キャッシュ済み: ~9 分
- **バックグラウンドで実行**し、ユーザーに所要時間を伝える

### Step 6: APK インストール

```bash
adb.exe -s $DEVICE_SERIAL shell am force-stop com.voicescoreboard.app
adb.exe -s $DEVICE_SERIAL install -r -d "C:\\Develop\\voice-scoreboard\\android\\app\\build\\outputs\\apk\\release\\app-release.apk"
```

### Step 7: アプリ起動

```bash
adb.exe -s $DEVICE_SERIAL shell am start -n com.voicescoreboard.app/.MainActivity
```

### Step 8: logcat モニタリング（`--logcat` 時、または任意）

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

- エミュレータでアプリが起動したこと
- logcat モニタリングの状態（開始 / 未開始）

## WSL2 固有の注意事項

- **サンドボックス無効化必須**: Gradle ビルド（Step 5）は `~/.gradle/` への書き込みが必要。Bash ツールで `dangerouslyDisableSandbox: true` を指定すること
- **JS バンドルキャッシュ問題**: Step 4 のキャッシュクリアは常に実行すること（スキップ禁止）
- **パス変換**: APK インストール時は Windows パス（`C:\\...`）を使用
- **logcat パイプ問題**: `adb.exe shell "logcat -d"` 形式で回避
- **エミュレータタッチ無反応**: スナップショットの入力状態が壊れることがある。`-no-snapshot-load` でコールドブートすれば復旧する
