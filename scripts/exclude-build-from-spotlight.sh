#!/usr/bin/env bash
# 避免 Spotlight / 启动台搜到构建目录里的 delta-ink.app（正式应用在 /Applications）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/src-tauri/target"
APP="$TARGET/release/bundle/macos/delta-ink.app"
LSREG="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"

mkdir -p "$TARGET" "$TARGET/release/bundle/macos"
touch "$TARGET/.metadata_never_index"
touch "$TARGET/release/bundle/.metadata_never_index" 2>/dev/null || true
touch "$TARGET/release/bundle/macos/.metadata_never_index" 2>/dev/null || true

if [[ -d "$APP" ]]; then
  "$LSREG" -u "$APP" 2>/dev/null || true
  rm -rf "$APP"
  echo "已移除构建产物: $APP"
else
  echo "构建产物不存在，已写入 .metadata_never_index"
fi

echo "Spotlight 当前 app.delta.ink 路径:"
mdfind "kMDItemCFBundleIdentifier == 'app.delta.ink'" 2>/dev/null || true
