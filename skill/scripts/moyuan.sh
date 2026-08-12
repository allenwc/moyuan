#!/usr/bin/env bash
# 墨缘 CLI 调用包装：从仓库任意位置运行 CLI 并把参数透传。
# 用法：bash skill/scripts/moyuan.sh <subcommand> [options]
set -euo pipefail

# 定位仓库根（scripts -> skill -> repo root = 2 级）。
# 用 cd -P / pwd -P 解析符号链接，兼容 skill 被 symlink 安装到
# ~/.pi/agent/skills/moyuan 等目录后从任意 cwd 调用的场景。
SCRIPT_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -P "$SCRIPT_DIR/../.." && pwd -P)"

cd "$REPO_ROOT"
exec npm run cli -- "$@"
