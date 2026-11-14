#!/usr/bin/env python3
"""UNOEditor 官网 AI 友好文件一致性校验。

在 scripts/sync-site.sh 末尾自动运行，也可单独执行：
    python3 scripts/check-ai-files.py

检查：域名残留、必需文件、JSON-LD 可解析、sitemap XML、llms.txt 本地链接、
Markdown 镜像关键事实、robots.txt 策略与 Content-Signal 是否自相矛盾、
GTM 统计代码在官网两页的一致性（桌面端源码不得含外部统计请求）。
"""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
DOMAIN = "https://unoeditor.zhenzhidaole.com"
OLD_ORIGIN = "samjoeyang.github.io/UNOEditor"

ok: list[str] = []
bad: list[str] = []


def check(condition: bool, label: str) -> None:
    (ok if condition else bad).append(label)


def read(rel: str) -> str:
    return (DOCS / rel).read_text(encoding="utf-8")


# --- 1. 必需文件 ---
required = [
    "index.html", "index.zh.md", "index.en.md", "llms.txt",
    "robots.txt", "sitemap.xml", ".nojekyll", "CNAME",
    "app/index.html", "app/index.md",
    "assets/theme-styles.js", "assets/themes.js",
]
for rel in required:
    check((DOCS / rel).is_file(), f"存在 {rel}")
check((ROOT / "LICENSE").is_file(), "存在 LICENSE (MIT)")
check("unoeditor.zhenzhidaole.com" in read("CNAME"), "CNAME 指向已绑定域名")
check("MIT License" in (ROOT / "LICENSE").read_text(encoding="utf-8"), "LICENSE 为 MIT")

# --- 2. 旧域名不得残留在发布文件中 ---
scan = ["index.html", "llms.txt", "robots.txt", "sitemap.xml", "index.zh.md", "index.en.md"]
for rel in scan:
    check(OLD_ORIGIN not in read(rel), f"{rel} 无旧域名残留")

# --- 3. 官网首页 head 与 JSON-LD ---
home = read("index.html")
for token in [
    'rel="describedby"', 'rel="alternate" type="text/markdown"',
    'hreflang="en"', 'rel="canonical" href="' + DOMAIN + '/"',
    'og:image:alt', 'lang="zh-CN" data-lang="zh"', 'lang="en" data-lang="en"',
    '<time datetime="2026-11-14">', '<noscript>',
]:
    check(token in home, f"首页含 {token[:52]}")

m = re.search(r'<script type="application/ld\+json">(.*?)</script>', home, re.S)
check(m is not None, "首页存在 JSON-LD 块")
if m:
    try:
        graph = json.loads(m.group(1))["@graph"]
        types = {node.get("@type") for node in graph}
        check({"SoftwareApplication", "Organization", "WebSite", "WebPage", "FAQPage"} <= types,
              "JSON-LD 含 5 类实体")
        app = next(n for n in graph if n["@type"] == "SoftwareApplication")
        check(app.get("license", "").endswith("/mit"), "JSON-LD license = MIT")
        check(app.get("isAccessibleForFree") is True, "JSON-LD isAccessibleForFree")
        check(len(app.get("screenshot", [])) == 8, "JSON-LD 8 张截图")
        check(len(app.get("featureList", [])) == 9, "JSON-LD 9 项功能")
        faq = next(n for n in graph if n["@type"] == "FAQPage")
        check(len(faq["mainEntity"]) == 8, "JSON-LD 8 条 FAQ")
        check(all(q["acceptedAnswer"]["text"] for q in faq["mainEntity"]), "FAQ 答案非空")
        # FAQ 文案必须与可见 HTML 一致（避免结构化数据与页面不符）
        visible = re.sub(r"<[^>]+>", "", home)
        check(all(q["name"] in visible for q in faq["mainEntity"]), "FAQ 问题在页面中可见")
    except Exception as exc:  # noqa: BLE001
        bad.append(f"JSON-LD 解析失败: {exc}")

# --- 4. llms.txt v2 结构 ---
llms = read("llms.txt")
check(llms.startswith("# UNOEditor"), "llms.txt 以 H1 项目名开头")
check("\n> " in llms, "llms.txt 含 blockquote 摘要")
check("## Optional" in llms, "llms.txt 含 Optional 分节")
check("index.zh.md" in llms and "index.en.md" in llms, "llms.txt 链接指向 Markdown 镜像")
check(DOMAIN in llms, "llms.txt 使用正式域名")

# --- 5. sitemap ---
try:
    root = ET.fromstring(read("sitemap.xml"))
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [e.text or "" for e in root.findall("s:url/s:loc", ns)]
    lastmods = root.findall("s:url/s:lastmod", ns)
    check(len(locs) >= 5, f"sitemap 收录 {len(locs)} 个 URL")
    check(all(loc.startswith(DOMAIN) for loc in locs), "sitemap 全部使用正式域名")
    check(len(lastmods) == len(locs), "sitemap 每条 URL 均有 lastmod")
except Exception as exc:  # noqa: BLE001
    bad.append(f"sitemap.xml 解析失败: {exc}")

# --- 6. llms.txt 内指向本站文件的链接必须在磁盘上存在 ---
for target in re.findall(r"\]\(https://unoeditor\.zhenzhidaole\.com/([^)#?]+)\)", llms):
    if target.endswith((".md", ".txt")):
        check((DOCS / target).is_file(), f"llms.txt 链接可解析: {target}")

# --- 7. Markdown 镜像关键事实 ---
for rel in ["index.zh.md", "index.en.md"]:
    txt = read(rel)
    check("0.1.0" in txt and "2026-11-14" in txt, f"{rel} 含版本与核对日期")
    check("MIT" in txt, f"{rel} 含 MIT 许可证")
    theme_ids = ["wechat", "economist", "nyt", "swiss", "morandi", "hara",
                 "apple", "nocturne", "gfm", "obsidian", "typora"]
    check(all(f"`{tid}`" in txt for tid in theme_ids), f"{rel} 含完整 11 套主题表")
    check("Releases" in txt, f"{rel} 说明下载状态")
check("index.en.md" in read("index.zh.md"), "中英镜像互相引用")

# --- 8. robots.txt 策略一致性 ---
robots = read("robots.txt")
check("Content-Signal:" in robots, "robots.txt 含 Content-Signal")
rule_lines = [ln.strip() for ln in robots.splitlines()
              if ln.strip() and not ln.strip().startswith("#")]
check("ai-train=yes" in robots
      and not any(ln.startswith("Disallow:") for ln in rule_lines),
      "robots.txt 规则与 ai-train=yes 不矛盾")
for ua in ["OAI-SearchBot", "GPTBot", "ClaudeBot", "Claude-User", "Claude-SearchBot", "Google-Extended"]:
    check(f"User-agent: {ua}" in robots, f"robots.txt 声明 {ua}")
check("llms-txt:" in robots, "robots.txt 标注 llms.txt 位置")

# --- 9. 应用页 ---
app = read("app/index.html")
check('rel="describedby"' in app and 'rel="alternate" type="text/markdown"' in app,
      "应用页含 v2 发现链接")
check("<noscript>" in app, "应用页含无脚本说明")
check((DOCS / "app/index.md").is_file(), "应用页 Markdown 镜像存在")

# --- 10. 统计代码（GTM）一致性 ---
# docs/app/index.html 会被 sync-site.sh 从 dist 整体覆盖后重新注入，必须保证
# 官网两页片段齐全、容器 ID 一致；根 index.html / dist 供 Tauri 桌面端使用，
# 不得引入任何外部统计请求（离线可用、零网络依赖）。
GTM_HEAD = "<!-- Google Tag Manager -->"
GTM_HEAD_END = "<!-- End Google Tag Manager -->"
GTM_BODY = "<!-- Google Tag Manager (noscript) -->"
GTM_BODY_END = "<!-- End Google Tag Manager (noscript) -->"

home_ids = set(re.findall(r"GTM-[A-Z0-9]+", home))
app_ids = set(re.findall(r"GTM-[A-Z0-9]+", app))
check(len(home_ids) == 1, "首页 GTM 容器 ID 唯一")
check(home_ids == app_ids and len(app_ids) == 1, "两页 GTM 容器 ID 一致")

for rel, text in (("index.html", home), ("app/index.html", app)):
    check(re.search(re.escape(GTM_HEAD) + r".*?" + re.escape(GTM_HEAD_END), text, re.S) is not None,
          f"{rel} 含 GTM head 片段")
    check("gtm.start" in text and "event:'gtm.js'" in text,
          f"{rel} GTM 含 gtm.start 初始化")
    check("gtag(" not in text, f"{rel} 未混入 gtag.js 调用")
    check(text.find("<head>") < text.find(GTM_HEAD) < text.find("</head>"),
          f"{rel} GTM head 片段位于 <head> 内")
    check(re.search(re.escape(GTM_BODY) + r".*?" + re.escape(GTM_BODY_END), text, re.S) is not None,
          f"{rel} 含 GTM noscript 兜底")
    check(0 < text.find(GTM_BODY) - text.find("<body") < 200,
          f"{rel} GTM noscript 紧邻 <body> 起始标记")

shell_index = (ROOT / "index.html").read_text(encoding="utf-8")
check("googletagmanager.com" not in shell_index, "桌面端源码 index.html 无外部统计请求")
dist_index = ROOT / "dist/index.html"
if dist_index.is_file():
    check("googletagmanager.com" not in dist_index.read_text(encoding="utf-8"),
          "dist/index.html 无外部统计请求")

# --- 11. 品牌名一致性：正式名称 UNOEditor，旧称 "Uno MD" 不得残留 ---
BRAND = "UNOEditor"
for rel in ["index.html", "assets/app.js", "index.zh.md", "index.en.md",
            "llms.txt", "robots.txt", "app/index.html", "app/index.md"]:
    txt = read(rel)
    check("Uno MD" not in txt and "UNO MD" not in txt, f"{rel} 无旧称 Uno MD")
    check(BRAND in txt, f"{rel} 使用正式名称 {BRAND}")
check("Uno MD" not in shell_index and "UNO MD" not in shell_index,
      "桌面端源码无旧称 Uno MD")
if dist_index.is_file():
    check("Uno MD" not in dist_index.read_text(encoding="utf-8"),
          "dist/index.html 无旧称 Uno MD")
# 技术标识符不是品牌文案，必须保留，否则会丢失用户本地已存文稿
for rel, key in [("js/app.js", "uno-md-v1"),
                 ("js/markdown.js", "global.UnoMD")]:
    check(key in (ROOT / rel).read_text(encoding="utf-8"),
          f"保留技术标识符 {key}")

# --- 12. 发布状态：v0.1.0 已发布，静态文案不得停留在「尚未发布」 ---
STALE_RELEASE = ["尚无预编译安装包", "尚未发布预编译安装包", "暂未上传预编译安装包",
                 "No prebuilt installer", "no prebuilt installers", "not published yet"]
for rel in ["index.html", "index.zh.md", "index.en.md", "llms.txt", "assets/app.js"]:
    txt = read(rel)
    check(not any(s in txt for s in STALE_RELEASE), f"{rel} 无过时的「未发布」表述")
    check("v0.1.0" in txt, f"{rel} 标注 v0.1.0")

# --- 输出 ---
for line in ok:
    print(f"  PASS  {line}")
for line in bad:
    print(f"  FAIL  {line}", file=sys.stderr)
print(f"\nAI files check: {len(ok)} passed, {len(bad)} failed")
sys.exit(1 if bad else 0)
