#!/bin/bash
set -euo pipefail

# 【目的】DevContainer作成後にツール群を自動セットアップする
# 【根拠】mise install で .mise.toml に定義されたバージョンを一括インストール。
#        コンテナ再作成時にも同一環境を再現できる

# 【目的】.mise.toml をコンテナ内で信頼済みとしてマークする
# 【根拠】mise はセキュリティ上、未信頼の設定ファイルを拒否する。
#        DevContainer は毎回新規作成されるため、自動で trust する必要がある
echo "=== mise trust ==="
~/.local/bin/mise trust

echo "=== mise でツールをインストール ==="
~/.local/bin/mise install

# 【目的】mise の shims を PATH に追加して bun/node/java を直接呼べるようにする
eval "$(~/.local/bin/mise activate bash)"

# 【目的】bun のグローバルインストール先を PATH に追加
# 【根拠】bun install -g で入れたコマンド（eas等）をこのスクリプト内でも実行可能にする
export PATH="$HOME/.bun/bin:$PATH"

echo "=== EAS CLI をグローバルインストール ==="
bun install -g eas-cli

echo ""
echo "=== 環境確認 ==="
echo "Node.js: $(node --version)"
echo "bun:     $(bun --version)"
echo "Java:    $(java --version 2>&1 | head -1)"
echo "EAS CLI: $(eas --version)"
echo ""
echo "セットアップ完了"
echo "※ EAS を使うには 'eas login' を手動で実行してください"
