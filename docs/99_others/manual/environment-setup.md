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

- [ ] VSCode
- [ ] Docker Desktop
- [ ] WSL2 (Ubuntu)

### VSCode拡張機能

以下の拡張機能をインストールしてください。

- [ ] **Dev Containers** - コンテナ開発環境
- [ ] **Remote - WSL** - WSL連携
- [ ] **ESLint** - Linter
- [ ] **Prettier** - コードフォーマッター
- [ ] **TypeScript and JavaScript Language Features** - 言語サポート（ビルトイン）

### Android Studio

Android実機テストやエミュレータを使用する場合に必要です。

#### インストール

- [ ] [Android Studio公式サイト](https://developer.android.com/studio)からダウンロード
- [ ] インストーラーを実行
- [ ] セットアップウィザードを完了

#### SDK Managerの設定

Android Studioを起動し、`Tools > SDK Manager` から以下をインストールしてください。

**SDK Platforms タブ:**
- [ ] Android 14 (API 34) または最新の安定版

**SDK Tools タブ:**
- [ ] Android SDK Build-Tools
- [ ] Android SDK Command-line Tools
- [ ] Android SDK Platform-Tools
- [ ] Android Emulator

#### 環境変数の設定

Windows環境変数に以下を追加してください。

- [ ] `ANDROID_HOME` を設定
  - 通常: `C:\Users\<ユーザー名>\AppData\Local\Android\Sdk`

- [ ] `PATH` に以下を追加
  - `%ANDROID_HOME%\platform-tools`
  - `%ANDROID_HOME%\emulator`

#### エミュレータの作成（任意）

- [ ] Android Studio > `Tools > Device Manager`
- [ ] `Create Device` をクリック
- [ ] デバイスを選択（例: Pixel 6）
- [ ] システムイメージを選択（API 34推奨）
- [ ] エミュレータを作成

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

- [ ] mise (v2026.1.11)
- [ ] bun (v1.3.8 via mise)
- [ ] git (v2.43.0)

### Node.js LTSのインストール

> **なぜNode.jsが必要か？**
>
> bunをメインのパッケージマネージャーとして使用しますが、Expoの一部コマンド（特に`expo prebuild`や`eas build`）が内部で`npm pack`を呼び出すため、Node.jsも必要です。

- [ ] mise経由でNode.js LTSをインストール
  ```bash
  mise use node@lts
  ```

- [ ] バージョン確認
  ```bash
  node --version
  # v22.x.x（LTS）が表示されること
  ```

- [ ] npmが利用可能か確認
  ```bash
  npm --version
  ```

### Java/JDK 17のインストール

Android開発に必要なJDKをインストールします。

- [ ] mise経由でJDK 17をインストール
  ```bash
  mise use java@temurin-17
  ```

- [ ] バージョン確認
  ```bash
  java --version
  # openjdk 17.x.x が表示されること
  ```

- [ ] JAVA_HOMEが設定されているか確認
  ```bash
  echo $JAVA_HOME
  # パスが表示されること
  ```

### EAS CLIのインストール

Expo Application Services (EAS) のCLIをインストールします。

- [ ] bunでグローバルインストール
  ```bash
  bun install -g eas-cli
  ```

- [ ] バージョン確認
  ```bash
  eas --version
  ```

- [ ] Expoアカウントを作成（まだの場合）
  - [expo.dev](https://expo.dev/signup) でアカウント作成

- [ ] EAS CLIでログイン
  ```bash
  eas login
  ```

- [ ] ログイン確認
  ```bash
  eas whoami
  # ユーザー名が表示されること
  ```

### Watchman（任意）

ファイル監視の効率化のため、Watchmanのインストールを検討できます。

> **注意**: WSL環境ではWatchmanの恩恵が限定的な場合があります。問題が発生した場合にインストールを検討してください。

- [ ] 必要に応じてインストール
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

- [ ] Node.js LTSがインストールされている
- [ ] bunがインストールされている
- [ ] Java 17がインストールされている
- [ ] EAS CLIがインストールされ、ログイン済み
- [ ] Android SDK（Windows側）がインストールされている

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
