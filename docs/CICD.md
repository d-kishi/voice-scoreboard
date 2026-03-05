# CI/CD 計画

## CI パイプライン（GitHub Actions）

```yaml
# プルリクエスト / Push 時に実行
jobs:
  - lint        # ESLint + Prettier
  - typecheck   # TypeScript 型検査
  - test        # Jest 単体テスト
  - build-check # Expo ビルド検証
```

## CD パイプライン（EAS Build）

| ビルド種別 | タイミング | 用途 |
|-----------|-----------|------|
| Development | 必要時 | 開発用（実機テスト） |
| Preview | main マージ時 | テスト配布 |
| Production | リリース時 | ストア申請 |

## サービスと料金

| サービス | 用途 | 料金（Public リポジトリ） |
|---------|------|--------------------------|
| GitHub Actions | CI（テスト・リント・型チェック） | 無料 |
| EAS Build | アプリビルド | 無料枠（30 ビルド/月） |
| EAS Submit | ストア申請 | 無料 |

## アプリ配布方法

| 方法 | 用途 | ストア経由 | ネイティブモジュール |
|------|------|-----------|-------------------|
| Development Build | 開発・テスト | 不要 | 使える |
| Preview Build (APK) | 実地検証 | 不要 | 使える |
| Production Build | ストア公開 | 必要 | 使える |

## 実地検証フロー（ストア公開前）

```
開発（WSL2）
    ↓
ローカルビルド or EAS Build（Preview Build）
    ↓ APK ファイル生成
Android 実機に直接インストール（サイドローディング）
    ↓
実地検証（バレーボール練習時）
    ↓
問題なければ Production Build → ストア公開
```
