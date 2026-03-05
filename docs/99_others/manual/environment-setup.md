# 環境構築手順書

Voice Scoreboard プロジェクトの開発環境構築手順です。

## 前提条件

- Windows 11
- WSL2 (Ubuntu)

> Docker Desktop は不要です。WSL2 上で直接開発します。

---

## 1. Windows 側の設定

### 1.1 必要なツール

1. [VSCode](https://code.visualstudio.com/) をインストールする
2. [WSL2 (Ubuntu)](https://learn.microsoft.com/ja-jp/windows/wsl/install) をインストールする

### 1.2 VSCode 拡張機能

1. **WSL** — WSL 連携（旧 Remote - WSL）
2. **ESLint** — Linter
3. **Prettier** — コードフォーマッター

### 1.3 Android Studio

Android 実機テストやエミュレータを使用するために必要です。

#### インストール

1. [Android Studio 公式サイト](https://developer.android.com/studio)からダウンロードする
2. インストーラーを実行し、セットアップウィザードを完了する

#### SDK Manager の設定

Android Studio を起動し、SDK Manager を開く。

- プロジェクトを開いている場合: `Tools > SDK Manager`
- Welcome 画面の場合: `Projects` タブ → `More Actions > SDK Manager`

**SDK Platforms タブ:**

1. Android 15 (API 35) をインストールする（実機の OS バージョンに合わせる）

**SDK Tools タブ:**

1. Android SDK Build-Tools をインストールする
2. Android SDK Command-line Tools をインストールする
3. Android SDK Platform-Tools をインストールする
4. Android Emulator をインストールする
5. CMake をインストールする（NDK ビルドに使用）

#### Windows 環境変数の設定

1. `ANDROID_HOME` を設定する
   - 通常: `C:\Users\<ユーザー名>\AppData\Local\Android\Sdk`
2. `PATH` に以下を追加する
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\emulator`

#### エミュレータの作成（任意）

1. Device Manager を開く（`Tools > Device Manager` または Welcome 画面の `More Actions > Virtual Device Manager`）
2. `Create Device` をクリックする
3. デバイスを選択する（例: Pixel 7a）
4. システムイメージを選択する（API 35）
5. エミュレータを作成する

---

## 2. WSL 側の基本ツール

### 2.1 mise / bun / git の確認

以下がインストール済みであることを確認する。

```bash
mise --version   # v2026.1.11 以上
bun --version    # v1.3.8 以上（mise 経由）
git --version    # v2.43.0 以上
```

mise が未インストールの場合は [公式サイト](https://mise.jdx.dev/) を参照。

### 2.2 Node.js LTS のインストール

> **なぜ Node.js が必要か？**
> bun をメインのパッケージマネージャーとして使用するが、Expo の一部コマンド（`expo prebuild`、`eas build` 等）が内部で `npm pack` を呼び出すため、Node.js も必要。

1. mise 経由でインストールする
   ```bash
   mise use node@lts
   ```
2. バージョンを確認する
   ```bash
   node --version
   npm --version
   ```

### 2.3 Java/JDK 17 のインストール

1. mise 経由でインストールする
   ```bash
   mise use java@temurin-17
   ```
2. バージョンと JAVA_HOME を確認する
   ```bash
   java --version    # openjdk 17.x.x が表示されること
   echo $JAVA_HOME   # パスが表示されること
   ```

### 2.4 cmake / ninja のインストール

Android ネイティブビルド（React Native の C++ 部分）に必要。

1. apt でインストールする
   ```bash
   sudo apt update
   sudo apt install cmake ninja-build
   ```
2. バージョンを確認する
   ```bash
   cmake --version   # 3.28.x 程度
   ninja --version   # 1.11.x 程度
   ```

### 2.5 EAS CLI のインストール

1. bun でグローバルインストールする
   ```bash
   bun install -g eas-cli
   ```
2. bun のグローバル bin フォルダを PATH に追加する（未設定の場合）
   ```bash
   # ~/.bashrc に追加
   export PATH="$HOME/.bun/bin:$PATH"
   source ~/.bashrc
   ```
3. Expo アカウントを作成する（まだの場合）
   - [expo.dev](https://expo.dev/signup) でアカウント作成
4. EAS CLI でログインする
   ```bash
   eas login
   eas whoami   # ユーザー名が表示されること
   ```

### 2.6 Watchman（任意）

ファイル監視の効率化のためにインストールを検討できる。

> WSL 環境では Watchman の恩恵が限定的な場合がある。問題が発生した場合にインストールを検討する。

```bash
sudo apt update
sudo apt install watchman
```

---

## 3. WSL 側の Android SDK 連携設定

WSL から Windows 側の Android SDK を利用するための設定。

### 3.1 ANDROID_HOME の設定

1. `~/.bashrc` に以下を追加する
   ```bash
   export ANDROID_HOME=/mnt/c/Users/<ユーザー名>/AppData/Local/Android/Sdk
   export PATH="$ANDROID_HOME/platform-tools:$PATH"
   ```
2. 反映する
   ```bash
   source ~/.bashrc
   ```

### 3.2 adb ラッパースクリプトの作成

WSL から Windows 側の `adb.exe` を呼び出すためのラッパーを作成する。

1. `~/.local/bin/` が PATH に含まれていることを確認する
2. ラッパースクリプトを作成する
   ```bash
   cat > ~/.local/bin/adb << 'EOF'
   #!/bin/bash
   adb.exe "$@"
   EOF
   chmod +x ~/.local/bin/adb
   ```
3. 動作を確認する
   ```bash
   adb devices   # 接続中のデバイスが表示されること
   ```

### 3.3 cmake / ninja のシンボリックリンク設定

Android SDK の cmake は Windows バイナリ（`.exe`）のため、WSL では動作しない。WSL ネイティブの cmake/ninja へのシンボリックリンクを作成する。

1. SDK の cmake ディレクトリを確認する
   ```bash
   ls $ANDROID_HOME/cmake/
   # 3.22.1 などのバージョンが表示される
   ```
2. SDK の cmake/ninja を WSL ネイティブへのシンボリックリンクに置換する
   ```bash
   SDK_CMAKE_DIR="$ANDROID_HOME/cmake/3.22.1/bin"
   # バックアップ（初回のみ）
   mv "$SDK_CMAKE_DIR/cmake" "$SDK_CMAKE_DIR/cmake.exe.bak" 2>/dev/null
   mv "$SDK_CMAKE_DIR/ninja" "$SDK_CMAKE_DIR/ninja.exe.bak" 2>/dev/null
   # シンボリックリンク作成
   ln -sf /usr/bin/cmake "$SDK_CMAKE_DIR/cmake"
   ln -sf /usr/bin/ninja "$SDK_CMAKE_DIR/ninja"
   ```

> cmake のバージョン番号（3.22.1）は SDK Manager でインストールしたバージョンに合わせること。

---

## 4. プロジェクトのセットアップ

### 4.1 リポジトリのクローンと依存関係インストール

1. リポジトリをクローンする
   ```bash
   git clone https://github.com/d-kishi/voice-scoreboard.git
   cd voice-scoreboard
   ```
2. 依存関係をインストールする
   ```bash
   bun install
   ```
3. `unrs-resolver` の信頼設定を行う（初回のみ）
   ```bash
   bun pm trust unrs-resolver
   bun install   # 再実行
   ```

### 4.2 react-native-worklets のパッチ適用

`react-native-worklets@0.7.4` は RN 0.76 をサポート対象外としているため、`bun install` や `rm -rf node_modules` の後に毎回パッチが必要。

```bash
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

> **重要**: `bun install` を実行するたびにこのパッチを再適用すること。

### 4.3 Android ネイティブプロジェクトの生成

1. `expo prebuild` で `android/` ディレクトリを生成する
   ```bash
   bunx expo prebuild --platform android
   ```
2. `android/local.properties` に SDK パスを設定する
   ```bash
   echo "sdk.dir=/mnt/c/Users/<ユーザー名>/AppData/Local/Android/Sdk" > android/local.properties
   ```
3. `android/app/build.gradle` に `libworklets.so` の重複解消設定を追加する

   `android` ブロック内に以下を追加する:
   ```groovy
   packagingOptions {
       pickFirsts += ['**/libworklets.so']
   }
   ```

   > react-native-reanimated と react-native-worklets の両方が同名の `.so` を生成するため、この設定がないとビルドが失敗する。

### 4.4 動作確認

1. テストを実行する
   ```bash
   bun run test
   ```
2. リントを実行する
   ```bash
   bun run lint
   ```
3. 型チェックを実行する
   ```bash
   bun run typecheck
   ```

---

## 5. ビルドとデプロイ

### 5.1 release ビルド

```bash
# 実機向け（arm64-v8a）
cd android && CMAKE_VERSION=3.28.3 ./gradlew app:assembleRelease \
  -PreactNativeArchitectures=arm64-v8a \
  -x lint -x test --configure-on-demand --build-cache

# エミュレータ向け（x86_64）
cd android && CMAKE_VERSION=3.28.3 ./gradlew app:assembleRelease \
  -PreactNativeArchitectures=x86_64 \
  -x lint -x test --configure-on-demand --build-cache
```

> `CMAKE_VERSION` 環境変数は、WSL ネイティブの cmake（3.28.3）と build.gradle が期待するバージョン（3.22.1）の不一致を解消するために必要。cmake のバージョンは `cmake --version` で確認すること。

### 5.2 APK のインストール

```bash
# 実機にインストール（Windows パスで指定）
adb.exe install -r -d "C:\\Develop\\voice-scoreboard\\android\\app\\build\\outputs\\apk\\release\\app-release.apk"
```

> WSL パスでは `adb install` が失敗するため、Windows パス形式で指定する。

---

## 6. 環境構築の検証

すべてのセットアップ完了後、以下のコマンドで環境を確認する。

```bash
echo "=== 環境確認 ==="
echo "Node.js: $(node --version)"
echo "npm:     $(npm --version)"
echo "bun:     $(bun --version)"
echo "Java:    $(java --version 2>&1 | head -1)"
echo "cmake:   $(cmake --version 2>&1 | head -1)"
echo "ninja:   $(ninja --version)"
echo "EAS CLI: $(eas --version)"
echo "Git:     $(git --version)"
echo "mise:    $(mise --version)"
echo "ANDROID_HOME: $ANDROID_HOME"
echo "JAVA_HOME:    $JAVA_HOME"
```

### チェックリスト

- Node.js LTS がインストールされている
- bun がインストールされている
- Java 17 がインストールされている
- cmake / ninja がインストールされている
- EAS CLI がインストールされ、ログイン済み
- Android SDK（Windows 側）がインストールされている
- WSL の `ANDROID_HOME` が Windows 側の SDK を指している
- adb ラッパースクリプトが動作する
- SDK の cmake/ninja がシンボリックリンクに置換されている
- react-native-worklets のパッチが適用されている
- `android/local.properties` が作成されている
- `android/app/build.gradle` に `pickFirsts` が設定されている

---

## トラブルシューティング

### `expo prebuild` で npm エラーが発生する

Node.js がインストールされているか確認する。bun だけでは Expo の一部機能が動作しない。

```bash
node --version
npm --version
```

### `expo prebuild --clean` 後にビルドが失敗する

`expo prebuild --clean` は `android/` を再生成するため、以下の手動カスタマイズが消える。再設定が必要:

1. `android/local.properties` の `sdk.dir` 設定（手順 4.3-2）
2. `android/app/build.gradle` の `pickFirsts` 設定（手順 4.3-3）

### WSL から adb でデバイスが見つからない

1. Windows 側で USB デバッグが有効になっているか確認する
2. `adb.exe devices` で直接確認する
3. エミュレータの場合は Windows 側で起動してから WSL で接続する

### Gradle ビルドで cmake バージョンエラーが出る

`CMAKE_VERSION` 環境変数を設定してビルドする（手順 5.1 参照）。

```bash
cmake --version   # インストール済みバージョンを確認
# 表示されたバージョンを CMAKE_VERSION に設定してビルド
```

### `bun install` 後にビルドが失敗する

react-native-worklets のパッチを再適用する（手順 4.2 参照）。

---

## 参考リンク

- [Expo 公式: Using Bun](https://docs.expo.dev/guides/using-bun/)
- [Expo 公式: Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

*最終更新: 2026-03-06*
