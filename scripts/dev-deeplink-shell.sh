#!/bin/sh
# UNOEditor — 调试深链壳：把 target/debug 裸二进制包进最小 .app 并注册 unoeditor:// 协议
# 背景：tauri-plugin-deep-link 在 macOS 上依赖 .app 的 Info.plist (CFBundleURLTypes)，
# 直接运行裸二进制不会向 LaunchServices 注册协议，浏览器跳 unoeditor://callback/ 会无人认领。
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/src-tauri/target/debug/unoeditor"
APP="$ROOT/src-tauri/target/debug/bundle/macos/UNOEditor.app"

[ -x "$BIN" ] || { echo "debug binary not found: $BIN (先 cargo build)"; exit 1; }

mkdir -p "$APP/Contents/MacOS"
cp "$BIN" "$APP/Contents/MacOS/UNOEditor"

cat > "$APP/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key><string>com.unoeditor.app</string>
  <key>CFBundleName</key><string>UNOEditor</string>
  <key>CFBundleExecutable</key><string>UNOEditor</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.6</string>
  <key>LSMinimumSystemVersion</key><string>10.15</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key><string>com.unoeditor.app.callback</string>
      <key>CFBundleURLSchemes</key>
      <array><string>unoeditor</string></array>
    </dict>
  </array>
</dict>
</plist>
EOF

# 让 LaunchServices 认领 unoeditor:// 协议
open "$APP" 2>/dev/null || /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP"

sleep 2
if open "unoeditor://callback/?code=diagtest" 2>/dev/null; then
  echo "✅ unoeditor:// 协议已注册，深链可路由到客户端"
else
  echo "❌ 协议注册未生效，尝试 lsregister 重试"
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP"
fi
