#!/bin/sh
# 把应用前端同步进官网：
#   dist/                -> docs/app/          （在线试用，完整可交互）
#   js/theme-styles.js   -> docs/assets/       （官网「主题实时演示」用的同一份样式）
#   js/themes.js         -> docs/assets/       （主题元数据）
#   scripts/app-index.md -> docs/app/index.md  （在线试用页的 Markdown 镜像，供 AI 读取）
#   docs/index.html 的 GTM 片段 -> docs/app/index.html（统计代码，见下方注入步骤）
# 先执行 sh copy-dist.sh 生成最新 dist，再执行本脚本；不触碰官网其它文件。
# 注意：docs/app/ 每次被 dist 整体覆盖，官网两页的 GTM 片段必须以 docs/index.html
#       为唯一来源重新注入；根 index.html / dist 保持零外部请求（Tauri 桌面壳也用它）。
# 同步完成后校验 AI 文件与统计代码的一致性。
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/docs/app"

if [ ! -f "$ROOT/dist/index.html" ]; then
  echo "dist/index.html 不存在，先运行: sh copy-dist.sh" >&2
  exit 1
fi

rm -rf "$SITE"
mkdir -p "$SITE"
# BSD cp 与 GNU cp 对 "src/" 尾斜杠的处理不同（GitHub Actions 是 GNU cp，
# 会把 dist 复制成 docs/app/dist 子目录）；用 "/." 明确复制目录内容，两边一致。
cp -R "$ROOT/dist/." "$SITE/"
if [ ! -f "$SITE/index.html" ]; then
  echo "同步失败：$SITE/index.html 不存在" >&2
  exit 1
fi
cp "$ROOT/js/theme-styles.js" "$ROOT/docs/assets/theme-styles.js"
cp "$ROOT/js/themes.js" "$ROOT/docs/assets/themes.js"
cp "$ROOT/scripts/app-index.md" "$SITE/index.md"

# 统计代码：docs/app/index.html 刚被 dist 覆盖，需按首页的片段重新注入（幂等）。
python3 - "$ROOT" <<'PY'
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
home = (root / "docs/index.html").read_text(encoding="utf-8")
app_path = root / "docs/app/index.html"

HEAD_BEGIN = "<!-- Google Tag Manager -->"
HEAD_END = "<!-- End Google Tag Manager -->"
BODY_BEGIN = "<!-- Google Tag Manager (noscript) -->"
BODY_END = "<!-- End Google Tag Manager (noscript) -->"


def extract(text, begin, end):
    match = re.search(re.escape(begin) + r".*?" + re.escape(end), text, re.S)
    if not match:
        raise SystemExit(f"docs/index.html 缺少统计片段: {begin}")
    return match.group(0)


head = extract(home, HEAD_BEGIN, HEAD_END)
body = extract(home, BODY_BEGIN, BODY_END)
container = re.search(r"GTM-[A-Z0-9]+", head)
if not container:
    raise SystemExit("docs/index.html 的 GTM 容器 ID 缺失")
container = container.group(0)

app = app_path.read_text(encoding="utf-8")
# 幂等：先剥离可能已存在的旧片段，再按固定位置插入
app = re.sub(re.escape(HEAD_BEGIN) + r".*?" + re.escape(HEAD_END) + r"\n?", "", app, flags=re.S)
app = re.sub(re.escape(BODY_BEGIN) + r".*?" + re.escape(BODY_END) + r"\n?", "", app, flags=re.S)
if "<head>\n" not in app or "<body>\n" not in app:
    raise SystemExit("docs/app/index.html 的 <head>/<body> 结构与预期不符")
app = app.replace("<head>\n", "<head>\n" + head + "\n", 1)
app = app.replace("<body>\n", "<body>\n" + body + "\n\n", 1)
if app.count(container) != 2:
    raise SystemExit(f"GTM 注入异常：{container} 出现次数应为 2")
app_path.write_text(app, encoding="utf-8")
print(f"Injected GTM {container} -> docs/app/index.html")
PY

python3 "$ROOT/scripts/check-ai-files.py" || exit 1

echo "Synced: dist -> docs/app, themes.js + theme-styles.js -> docs/assets, app-index.md -> docs/app/index.md (+ GTM)"
