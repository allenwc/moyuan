#!/usr/bin/env bash
# 墨缘 CLI 调用包装：从仓库任意位置运行 CLI 并把参数透传。
# 用法：bash skill/scripts/moyuan.sh <subcommand> [options]
set -euo pipefail

# 定位仓库根（scripts -> skill -> repo root = 2 级）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"
exec npm run cli -- "$@"
