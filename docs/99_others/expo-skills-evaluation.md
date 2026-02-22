# Expo Skills 導入評価レポート

> **評価日**: 2026-02-22
> **結論**: 現時点では導入しない

## Context

Expo チームが公式リリースした AI エージェント向けスキル集「Expo Skills」（https://github.com/expo/skills）の導入可否を評価した。Claude Code プラグインとして動作し、Expo 開発時のガイダンスをコンテキストに注入する仕組み。

## 結論: 現時点では導入しない

理由は3点:
1. **スキルの前提とプロジェクト構成が根本的に不一致**
2. **NativeWind v4/v5 の非互換性が致命的**
3. **現フェーズ（Task 5〜8）で有用なスキルがゼロ**

---

## 各スキルの評価

| スキル | 関連度 | リスク | 判定 |
|--------|--------|--------|------|
| building-native-ui | **Negative** | 高（5箇所で矛盾） | 導入しない |
| expo-tailwind-setup | **Negative** | 致命的（ビルド破壊） | 導入しない |
| expo-api-routes | None | - | 導入しない |
| native-data-fetching | None | - | 導入しない |
| expo-dev-client | Low | 低 | 導入しない（構築済み） |
| use-dom | None | - | 導入しない |
| deployment | Low→将来Medium | 低 | 将来、必要時に単独導入 |
| cicd-workflows | None | - | 導入しない |
| upgrading-expo | Low→将来Medium | 低 | 将来、必要時に単独導入 |

## 矛盾の詳細

### 致命的: NativeWind バージョン不一致

- **本プロジェクト**: NativeWind **v4.2.1** + Tailwind CSS **v3.4.17**
- **スキル推奨**: NativeWind **v5** + Tailwind CSS **v4**
- v4→v5 で設定ファイル構成が根本的に異なる（tailwind.config.js 廃止、CSS-first 構成等）
- research.md で「v5 はプレリリース、RN 0.81+ 必須、本番非推奨」と判断済み
- **スキル有効時にスタイリング作業をすると、動作中の設定を破壊するリスク**

### 高: プロジェクト制約との矛盾

| スキルの推奨 | プロジェクトの実態 |
|---|---|
| 「Always try Expo Go first」 | ネイティブモジュール必須で使用不可 |
| Expo Router 前提のナビゲーション | 単一画面アプリ、Router 未使用 |
| expo-audio/expo-video over expo-av | expo-av を設計決定済み（research.md で文書化） |
| kebab-case ファイル名を一律適用 | PascalCase（コンポーネント）+ kebab-case（ロジック）の混合規約が確立済み |

### 無関係: スコープ外のスキル

- **expo-api-routes**: オフラインアプリにサーバーサイド API は不要
- **native-data-fetching**: 外部データソースなし、zustand で完結
- **use-dom**: Web ライブラリのネイティブ実行は不要
- **cicd-workflows**: CI/CD パイプラインなし（個人開発）

## 将来の導入タイミング

| タイミング | 対象スキル | アクション |
|---|---|---|
| SDK アップグレード時 | `upgrading-expo` | 単独インストール → 作業完了後にアンインストール |
| ストア提出時 | `deployment` | 単独インストール → 作業完了後にアンインストール |
| NativeWind v5 安定版 + RN 0.81+ 移行後 | `expo-tailwind-setup` | 再評価（research.md に判断を文書化してから） |

## 将来必要時のインストールコマンド

```bash
# SDK アップグレード時
/plugin marketplace add expo/skills
/plugin install upgrading-expo

# ストア提出時
/plugin marketplace add expo/skills
/plugin install expo-deployment
```
