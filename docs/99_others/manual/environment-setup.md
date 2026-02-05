# 環境構築手順書

Voice Scoreboardプロジェクトの開発環境構築手順です。

## 前提条件

- Windows 11
- WSL2 (Ubuntu)
- Docker Desktop

---

## Windows側の設定

### インストール済みツールの確認

以下のツールがインストール済みであることを確認してください。

- [x] VSCode
- [x] Docker Desktop
- [x] WSL2 (Ubuntu)

### VSCode拡張機能

以下の拡張機能をインストールしてください。

- [x] **Dev Containers** - コンテナ開発環境
- [x] **Remote - WSL** - WSL連携
- [x] **ESLint** - Linter
- [x] **Prettier** - コードフォーマッター

### Android Studio

Android実機テストやエミュレータを使用する場合に必要です。

#### インストール

- [x] [Android Studio公式サイト](https://developer.android.com/studio)からダウンロード
- [x] インストーラーを実行
- [x] セットアップウィザードを完了

#### SDK Managerの設定

Android Studioを起動し、SDK Managerを開いてください。
- プロジェクトを開いている場合: `Tools > SDK Manager`
- Welcome画面の場合: `Projects` タブを選択 → `More Actions > SDK Manager`

**SDK Platforms タブ:**
- [x] Android 16 (API 36) ※実機に合わせる

**SDK Tools タブ:**
- [x] Android SDK Build-Tools
- [x] Android SDK Command-line Tools
- [x] Android SDK Platform-Tools
- [x] Android Emulator

#### 環境変数の設定

Windows環境変数に以下を追加してください。

- [x] `ANDROID_HOME` を設定
  - 通常: `C:\Users\<ユーザー名>\AppData\Local\Android\Sdk`

- [x] `PATH` に以下を追加
  - `%ANDROID_HOME%\platform-tools`
  - `%ANDROID_HOME%\emulator`

#### エミュレータの作成（任意）

- [x] Device Managerを開く
  - プロジェクトを開いている場合: `Tools > Device Manager`
  - Welcome画面の場合: `Projects` タブを選択 → `More Actions > Virtual Device Manager`
- [x] `Create Device` をクリック
- [x] デバイスを選択（例: Pixel 6）
- [x] システムイメージを選択（API 36 ※実機に合わせる）
- [x] エミュレータを作成

---

## WSL側の設定

### インストール済みツールの確認

以下がインストール済みであることを確認してください。

```bash
# バージョン確認コマンド
mise --version   # v2026.1.11以上
bun --version    # v1.3.8以上（mise経由）
git --version    # v2.43.0以上
```

- [x] mise (v2026.1.11)
- [x] bun (v1.3.8 via mise)
- [x] git (v2.43.0)

### Node.js LTSのインストール

> **なぜNode.jsが必要か？**
>
> bunをメインのパッケージマネージャーとして使用しますが、Expoの一部コマンド（特に`expo prebuild`や`eas build`）が内部で`npm pack`を呼び出すため、Node.jsも必要です。

- [x] mise経由でNode.js LTSをインストール
  ```bash
  mise use node@lts
  ```

- [x] バージョン確認
  ```bash
  node --version
  # LTSバージョンが表示されること
  ```

- [x] npmが利用可能か確認
  ```bash
  npm --version
  ```

### Java/JDK 17のインストール

Android開発に必要なJDKをインストールします。

- [x] mise経由でJDK 17をインストール
  ```bash
  mise use java@temurin-17
  ```

- [x] バージョン確認
  ```bash
  java --version
  # openjdk 17.x.x が表示されること
  ```

- [x] JAVA_HOMEが設定されているか確認
  ```bash
  echo $JAVA_HOME
  # パスが表示されること
  ```

### EAS CLIのインストール

Expo Application Services (EAS) のCLIをインストールします。

- [x] bunでグローバルインストール
  ```bash
  bun install -g eas-cli
  ```

- [x] bunのグローバルbinフォルダをPATHに追加（未設定の場合）
  ```bash
  # ~/.bashrc または ~/.zshrc に追加
  export PATH="$HOME/.bun/bin:$PATH"
  ```
  ```bash
  # 反映
  source ~/.bashrc
  ```

- [x] バージョン確認
  ```bash
  eas --version
  ```

- [x] Expoアカウントを作成（まだの場合）
  - [expo.dev](https://expo.dev/signup) でアカウント作成

- [x] EAS CLIでログイン
  ```bash
  eas login
  ```

- [x] ログイン確認
  ```bash
  eas whoami
  # ユーザー名が表示されること
  ```

### Watchman（任意）

ファイル監視の効率化のため、Watchmanのインストールを検討できます。

> **注意**: WSL環境ではWatchmanの恩恵が限定的な場合があります。問題が発生した場合にインストールを検討してください。

- [x] 必要に応じてインストール
  ```bash
  # Ubuntuの場合
  sudo apt update
  sudo apt install watchman
  ```

---

## 環境構築の検証

すべてのセットアップ完了後、以下のコマンドで環境を確認してください。

```bash
# 一括確認スクリプト
echo "=== 環境確認 ==="
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "bun: $(bun --version)"
echo "Java: $(java --version 2>&1 | head -1)"
echo "EAS CLI: $(eas --version)"
echo "Git: $(git --version)"
echo "mise: $(mise --version)"
```

### チェックリスト

- [x] Node.js LTSがインストールされている
- [x] bunがインストールされている
- [x] Java 17がインストールされている
- [x] EAS CLIがインストールされ、ログイン済み
- [x] Android SDK（Windows側）がインストールされている

---

## トラブルシューティング

### `expo prebuild`でnpmエラーが発生する

Node.jsがインストールされているか確認してください。bunだけではExpoの一部機能が動作しません。

```bash
node --version
npm --version
```

### WSLからAndroid Studioのエミュレータに接続できない

1. Windows側でエミュレータを起動
2. WSL側で`adb devices`を実行
3. 接続されない場合は、Windows側のadbサーバーに接続:
   ```bash
   export ADB_SERVER_SOCKET=tcp:host.docker.internal:5037
   ```

### EAS Buildが失敗する

1. `eas whoami`でログイン状態を確認
2. `eas build:configure`でプロジェクト設定を確認
3. Expoダッシュボードでビルドログを確認

---

## 参考リンク

- [Expo公式: Using Bun](https://docs.expo.dev/guides/using-bun/)
- [Expo公式: create-expo-app](https://docs.expo.dev/more/create-expo/)
- [Expo公式: Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

*最終更新: 2026-02-05*
