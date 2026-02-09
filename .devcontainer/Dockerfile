FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# 【目的】mise（ツールバージョンマネージャー）をインストール
# 【根拠】bun / node / java のバージョンを .mise.toml で一元管理するため。
#        mise により WSL とコンテナで同一バージョンを保証できる
# 【補足】RUN はデフォルトで root 実行されるため、USER で vscode に切り替える
USER vscode
RUN curl https://mise.run | sh \
    && echo 'eval "$(~/.local/bin/mise activate bash)"' >> /home/vscode/.bashrc \
    && echo 'export PATH="$HOME/.bun/bin:$PATH"' >> /home/vscode/.bashrc
