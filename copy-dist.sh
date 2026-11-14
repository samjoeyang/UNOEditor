#!/bin/sh
# UNOEditor — 零改动进壳：构建期把纯静态前端复制到 dist/ 供 Tauri 打包
# 根源码 (index.html / css / js / themes) 完全不动，仅此脚本做复制。
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST"
cp "$ROOT/index.html" "$DIST/"
cp -R "$ROOT/css" "$ROOT/js" "$ROOT/themes" "$DIST/"

echo "UNOEditor frontend copied -> $DIST"
