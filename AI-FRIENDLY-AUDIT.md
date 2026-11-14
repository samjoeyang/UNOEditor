# UNOEditor 官网 · AI 友好化审计与优化清单

- **审计日期**：2026-11-14
- **审计范围**：`docs/`（index.html、assets/、app/、robots.txt、sitemap.xml、llms.txt），按 GitHub Pages 项目站 `https://samjoeyang.github.io/UNOEditor/` 评估
- **审计口径**：AI 代理 / LLM 爬虫能否 **发现 → 抓取 → 正确解析 → 安全引用** 站点事实；不评估视觉、性能与转化率

---

## 0. 结论摘要

基线比多数营销站好：**正文是静态 HTML**（功能、FAQ、安装、社区都不依赖 JS）、已有 JSON-LD / canonical / OG / sitemap / llms.txt、图片有 alt、章节有稳定 id、无追踪脚本，且诚实标注「暂无发布安装包」而没有编造下载链接——这些是 AI 可信任度的重要底子。

但按 **2026 年已生效的新规范**衡量，有 3 个 P0 缺口。其中影响最大的是**双语文本同时存在于 DOM**：不执行 CSS 的抓取器读到的是中英混杂、长度翻倍的重复内容。

| 层 | 检查项 | 现状 | 评级 |
|---|---|---|---|
| 可发现性 | robots.txt 具名 AI 策略 | 仅 `User-agent: * Allow: /` | ⚠️ 未表态 |
| 可发现性 | llms.txt | 有，但为 2024 v1 形态 | ⚠️ 需升级 |
| 可发现性 | `.md` 页面镜像 / link rel | 无 | ❌ 缺失 |
| 可发现性 | sitemap / canonical / 稳定 URL | 有，无 lastmod，域名未定 | ⚠️ |
| 可解析性 | 单语言单一 DOM | 中英 139+139 段共存 | ❌ 最严重 |
| 可解析性 | 标题层级 | 2 个 `<h1>`，演示文案混入 | ❌ |
| 可解析性 | 静态可见事实 | 11 主题 / 8 截图说明靠 JS 注入 | ⚠️ |
| 可引用性 | FAQ / 截图 / 版本 / 许可证结构化 | 仅 5 类通用 JSON-LD | ⚠️ |
| 可信任性 | 日期、版本、许可证锚点 | 无 `<time>`、无 LICENSE | ⚠️ |
| 可控性 | Content-Signal / 训练偏好 | 无 | ⚠️ |

**优先级**：P0 三项（必修，直接损伤可读性） → P1 六项（可提取性与策略） → P2 五项（长期可维护性）。

---

## 1. 已做对的部分（保留，不要动）

1. 正文静态化：9 张功能卡、8 条 FAQ（`<details>`）、3 种用法、社区链接全部写在 HTML 里，无 JS 也能读到。
2. JSON-LD 已含 `SoftwareApplication` / `Organization`(带 `sameAs`) / `WebSite` / `Person` / `Offer`（`index.html:19-58`）。
3. `canonical`、`og:*`、`twitter:card`、`description`、`keywords` 齐备（`index.html:4-18`）。
4. `figure` + `figcaption` + 每个 `img` 都有中文 alt 与 `data-alt-en` 英文版本。
5. 8 个 `<section>` 有稳定 `id` 锚点，可作为引用片段目标。
6. `llms.txt` 的「重要事实」段落事实密度高，包含技术栈、隐私、11 套主题名、导入机制等，是很好的 AI 语料。
7. 零网络依赖、零追踪、无外部字体/CDN，抓取不会被第三方资源干扰。
8. 下载区在无 release 时优雅降级，未伪造链接；FAQ 对许可证用「以仓库为准」而非编造——诚实度高于多数官网。

---

## 2. 缺口清单

### P0-1 · 中英双语同时进入 DOM，语言标注失效

- **证据**：`index.html` 中 `data-lang="zh"` 139 处、`data-lang="en"` 139 处；隐藏靠 `style.css:41-42` 的 `display:none !important`；`<html lang="zh-CN">` 写死；**0 个 span 带 `lang` 属性**。`setLang()` 只在 JS 执行后才改 `<html lang>`、title 与 description（`app.js:98-118`）。
- **影响**：多数 LLM 爬虫与正文抽取器不执行 JS / 不看 CSS，会拿到两段并列的文本。例如 Hero 标题变成「写完，就 Write once. 已经排好版 Publish beautifully.」；全文 token 数翻倍，语言识别混乱，同一事实出现两个版本，AI 引用时可能拼接出中英混合句。这是当前**最实质的 AEO 损伤**。
- **修复（三选一，按成本排序）**：
  1. **最小**：每个 span 补 `lang="zh-CN"` / `lang="en"`，并在 `<head>` 加 `hreflang` 互指 + 英文 canonical 变体。能改善解析，但不消除重复文本。
  2. **推荐**：与 P0-3 合并，产出 `index.zh.md` / `index.en.md` 两份纯语言 Markdown，llms.txt 指向它们，让 AI 走干净通道；HTML 保持现状给人看。
  3. **彻底**：拆分 `/en/index.html` 为独立静态页（独立 `<html lang>`、title、description、canonical、JSON-LD），中文页只留中文 DOM。维护成本最高，对搜索引擎最友好。

### P0-2 · `llms.txt` 停留在 2024 v1，缺 v2 发现机制

- **证据**：`docs/llms.txt` 20 行，结构为 H1 + blockquote + 两个 H2 文件列表，两条链接都指向 **HTML 页面**；全站无 `rel="describedby"`、无 `rel="alternate" type="text/markdown"`、无 HTTP `Link:` 头、无 `## Optional` 分节。
- **依据（时效核对）**：llmstxt.org 已于 **2026-08-10 发布 v2**，取代 2024-09-03 的 v1。`changes.html` 明确 v2 新增：① 用 `rel="alternate" type="text/markdown"` 指向页面 Markdown 版、`rel="describedby"` 指向覆盖该页的 llms.txt（HTML `<link>` 或 HTTP `Link:` 头均可）；② Markdown 版 URL 允许 `.html.md` 追加 **或** `.md` 替换扩展名；③ 明确「文件覆盖其路径下页面，最具体者优先」，并专门举 **GitHub Pages 项目站** 为例说明子路径合法；④ 期望「代理先看/搜 llms.txt，再顺链接取 LLM 友好内容」，因此**链接应指向 Markdown 而非 HTML**；⑤ `Optional` 分节仍可用但不再有机械语义。
- **影响**：代理即便找到 llms.txt，两条链接都通向 46 KB 的 HTML 单页（含 278 个双语 span、内联 SVG sprite、3 个 script），拿不到干净文本；且从任意页面无法反查 llms.txt。
- **修复**：见第 3 节 Phase 1 代码。

### P0-3 · 无 `.md` 镜像，且 GitHub Pages 有两个部署坑

- **证据**：`docs/` 下无任何 `.md` 文件，**无 `.nojekyll`**；`docs/` 是纯静态目录，没有 Jekyll 配置。
- **依据**：GitHub Pages 默认运行 Jekyll，会把 `.md` 渲染成 HTML 而非原样提供，需在发布根目录放空文件 `.nojekyll` 才能按原文 serve；MIME 上 `.txt` → `text/plain`、`.md` → `text/markdown`，而 GitHub Pages **不提供自定义响应头**（`Link:` / `Content-Signal` 头都加不了），只能改用 HTML `<link>` 元素——v2 明确允许这种形式。
- **影响**：直接补 `index.md` 而不加 `.nojekyll`，在 GitHub Pages 上可能 404 或返回 HTML；`llms.txt` 以 `text/plain` 返回，部分代理不会启动 Markdown 解析。
- **修复**：加 `docs/.nojekyll`（空文件）；上线后用 `curl -I` 实测 `llms.txt` 与 `.md` 的 `Content-Type`；若确实是 `text/plain`，要么接受（多数代理仍可读），要么在自定义域名前挂一层能改头的 CDN。

> **附带说明（不要做无用功）**：Lighthouse 的 llms.txt 审计查**站点根** `/llms.txt`；本项目站的 `/UNOEditor/llms.txt` 对代理完全合规，但 Lighthouse 未必命中。官方文档明确：返回 404 时审计记 `N/A`（可选、不扣分），只有检索时 server error 才标记。若绑定自定义域名并把 `docs/` 作为根，可顺带在根放一份，两者不冲突。

### P1-1 · 两个 `<h1>`，演示文案污染文档大纲

- **证据**：`index.html:138` 是 Hero 的 `<h1>`；`index.html:248` 是主题实时演示「纸张」里的 `<h1>对齐，是最便宜的高级感</h1>`，同区还有 `<h2>字号，一级差四号</h2>`（`:251`）。全文共 `h1×2 / h2×9 / h3×20`。
- **影响**：DOM 大纲出现两个一级标题，示例文章标题被当成页面主标题/章节标题，AI 摘要可能把「对齐，是最便宜的高级感」引用为产品陈述；层级判断失真。
- **修复**：纸张内示例标题改为 `<p class="paper-h1">` / `<p class="paper-h2">` 并保留现有视觉样式；或给整个演示纸张容器加 `role="img"` + 描述性 `aria-label`。真实层级保持单一 `h1`。

### P1-2 · 核心清单由 JS 注入，静态 HTML 不可见

- **证据**：11 套主题的名称/描述在 `assets/themes.js`，主题 chips 由 `buildThemePicker()` 动态创建（`app.js:128-157`）；8 张截图的标签、说明、alt 在 `app.js:44-76` 的 `SHOTS` 数组，`.shot-tabs` 初始为空 div（`index.html:279`）；静态 `<img>` 只有 2 张；下载状态与版本号由 GitHub API 注入（`app.js:265-307`）。
- **影响**：不执行 JS 的代理在官网 HTML 里看不到 11 套主题清单、看不到其余 7 张截图的说明、拿不到任何版本/发布日期。更麻烦的是 `#dlStatus` 的静态兜底文案是「正在检查 GitHub Releases…」——这是一个**临时状态**，可能被当成事实引用。
- **修复**：
  - 把 11 套主题写成静态 `<table>` 或 `<dl>`（表格对 AI 抽取极友好，人类也受益），或至少放进 `<noscript>`；
  - 8 组 caption/alt 落进 HTML；
  - `#dlStatus` 初始文案改成自包含事实句，例如「UNOEditor 当前版本 v0.1.0，暂无预编译安装包；可在线使用或从源码构建。」；
  - 补一个 `<noscript>` 区块汇总上述内容（当前 `<noscript>` 数量为 0）。

### P1-3 · 结构化数据缺「可直接提取的事实」

现有 JSON-LD 类型仅 `SoftwareApplication / Offer / Person / Organization / WebSite`。缺：

| 缺项 | 页面里已有的内容 | 建议类型 |
|---|---|---|
| 8 条 FAQ 无结构化 | `#faq` 的 `<details>` | `FAQPage` + `Question` / `acceptedAnswer` |
| 3 种用法/构建步骤无结构化 | `#install` 的三张卡与代码块 | `HowTo` |
| 8 张截图未声明 | `#preview` 与 Hero | `SoftwareApplication.screenshot`、`ImageObject`、`og:image:alt` |
| 9 项功能未声明 | `#features` | `SoftwareApplication.featureList` |
| 版本元数据不全 | 徽标 v0.1.0 | `datePublished`、`dateModified`、`releaseNotes`、`downloadUrl` |
| 免费/许可语义不准 | FAQ「完全免费」 | `isAccessibleForFree: true`、`license` |

**⚠️ 时效校正（避免用过时理由做决策）**：Google 已于 **2026-05-07 全面下线 FAQ 富媒体结果**（6 月移除 Rich Results Test 支持，8 月移除 Search Console API 数据；2023-08 起已限政府/健康站）。因此**不要以「拿 FAQ 富摘要」为理由**加 FAQPage。但 `FAQPage` 仍是有效 schema.org 类型，是 AI/其他引擎提取 Q&A 的结构层，Bing 仍展示。另有 Ahrefs 2026 年 1,885 页对照实验未发现 JSON-LD 带来显著 AI 引用提升（报道为 -4.6%），所以应把结构化数据定位为**「可提取性基础层」而非引用捷径**。同理，`dateModified` 必须对应真实改动，虚假刷新在 2025-12 / 2026-03 核心更新后会被罚。

另外：`offers: {"price":"0","priceCurrency":"CNY"}` 对一个开源免费工具语义不准（隐含商业交易），建议改为 `isAccessibleForFree: true` 并补 `license`。

### P1-4 · robots.txt 未对 AI 抓取用途表态

- **证据**：`docs/robots.txt` 仅 4 行：`User-agent: * / Allow: /` + Sitemap。
- **客观判断**：`* Allow: /` **已经放行了所有爬虫，站点目前并没有被 AI 屏蔽**。问题是「没有明确策略」：无法区分搜索索引、用户触发取回、模型训练三种用途；将来要单独关闭训练必须改文件；部分 agent-readiness 检查器会看具名声明。
- **依据（2026-11 现行 token，按官方一手来源）**：
  - OpenAI：`OAI-SearchBot`(搜索)、`GPTBot`(训练)、`ChatGPT-User`(用户触发)、`OAI-AdsBot`(广告校验)。官方明确搜索与训练是**互相独立**的设置；`ChatGPT-User` 由用户动作触发，robots 规则可能不适用。
  - Anthropic：`ClaudeBot`(训练)、`Claude-SearchBot`(搜索索引)、`Claude-User`(用户发起取回)。官方强调三者须分别写规则，且**具名 `ClaudeBot` 规则优先于通用训练偏好信号**；自 **2026-10-30** 起识别 IETF 草案 `draft-kelley-aipref-training-preference-signal` 的通用训练偏好。
  - Google：`Google-Extended` 是 **robots.txt product token，不是独立 HTTP UA**；控制已抓内容是否用于 Gemini 训练与 grounding；**不影响 Google Search 收录，也不是排名信号**。官方注明计划 **early 2027** 支持 `user-agent: __usage_ai-training`。
- **修复**：显式分组声明（代码见 Phase 1）。**注意与 P2-1 的 Content-Signal 保持一致**：若声明 `ai-train=no` 却对 `GPTBot` 写 `Allow: /`，属于策略自相矛盾，实际生效的是 Allow/Disallow 规则。

### P1-5 · 版本、发布日期、许可证三处事实真空

- **证据**：根目录**无 LICENSE 文件**；`package.json` 与 `tauri.conf.json` 写 `0.1.0`，但页面无 `<time>`（`time` 标签 0 个）、JSON-LD 无 `datePublished`/`dateModified`、sitemap 无 `lastmod`、llms.txt 无「内容对应版本/最后核对日期」；FAQ 对许可只写「以仓库为准」。GitHub 仓库当前无 release（已核实）。
- **影响**：AI 回答「UNOEditor 最新版本？是否开源？能否商用？」时没有权威锚点，容易编造或引用第三方猜测。这恰好也是你一贯要求「比对时间上有没有更新信息覆盖」的机器侧对应问题——AI 无法判断这份资料是否过期。
- **修复**：确定许可证并添加 `LICENSE`；把版本与日期写进 JSON-LD、页脚 `<time datetime="...">`、sitemap `<lastmod>`、llms.txt 顶部；下载区静态文案改为明确事实句（见 P1-2）。

### P1-6 · `docs/app/` 在线试用页元数据全缺

- **证据**：`docs/app/index.html:1-8` 的 head 只有 charset、viewport、title、一个 stylesheet；无 description、canonical、robots、OG、JSON-LD；`<html lang="zh-CN">` 写死但应用可切英文。
- **影响**：一个几乎无静态正文的交互壳被索引，可能被判薄内容并稀释站点主题；AI 无法说明「在线试用」是什么、与首页什么关系。
- **修复**：补 description / canonical / `SoftwareApplication` 引用；用 `<noscript>` 提供一段静态说明（不要用隐藏文本，避免被判作弊）；补 `rel="describedby"` 指回 llms.txt。**不建议 noindex**——在线试用是重要入口。

### P2-1 · 无 Content-Signal 声明

- **依据**：Cloudflare / IAB Tech Lab 的 `Content-Signal: search=yes, ai-input=yes, ai-train=no` 目前是**可部署的厂商策略**，部分校验器会检查；IETF `aipref` 的 `draft-ietf-aipref-vocab`(-08, 2026-09-14) 与 `draft-ietf-aipref-attach`(-05, 2026-08-19 复活) **均还未成为 RFC**，vocab 草案自述「不代表工作组共识」，attach 的 2026-08 IESG 里程碑已错过，IETF 127 才争取延长讨论。
- **结论**：**可以加 `Content-Signal`，先不要加 `Content-Usage`**（IETF 草案字段名仍在变，且当前几乎没有爬虫读）。GitHub Pages 不能发 HTTP 头，只能写在 robots.txt 里。
- **另需避开**：`/.well-known/tdmrep.json` 等 well-known URI 只能放在 origin 根，GitHub Pages 项目站只控制 `/UNOEditor/` 子路径，无法部署（llmstxt.org v2 也明确指出这一限制）。

### P2-2 · sitemap 与发现端点不完整

`docs/sitemap.xml` 只有 2 个 URL、无 `<lastmod>`，未收录 `llms.txt`、`.md` 镜像、`#faq` / `#themes` 等深链，也无 `llms-full.txt`。另外 canonical / OG / sitemap 都用 `samjoeyang.github.io/UNOEditor/`，域名尚未确定——AI 实体识别依赖稳定 URL，一旦换域名需四处同步替换并加 `docs/CNAME`。

### P2-3 · 缺「原子答案」

多数 section 的 h2 下第一句是营销句（「点一下，换一整套版式」「真实界面，先看再决定」），关键定义只出现在 Hero lead 与 llms.txt 里。通行做法是在每个 h2 后放一句 **40–60 词、自包含、含实体全名+数字+单位**的事实句，作为 AI 直接摘录的 passage。例如：「UNOEditor 是一款零依赖、本地优先的 Markdown 排版主题编辑器，当前版本 0.1.0，内置 11 套主题，支持 4 种导出方式，文档仅保存在浏览器 localStorage。」

### P2-4 · 机器可读文件未纳入同步流程，存在漂移风险

`scripts/sync-site.sh` 只同步 `dist → docs/app` 与两份主题脚本。未来 HTML 改了而 llms.txt / .md 镜像 / sitemap lastmod 没跟着改，AI 会拿到过期事实。仓库已有 `.github/workflows/ci.yml` 与 `release.yml`，建议把生成与校验挂进去。

### P2-5 · 时间语义与语言互指

`<time>` 0 个、`hreflang` 0 个、`rel="alternate"` 0 个、`lang` 属性只在 `<html>` 上。补上后，AI 才能判断「这条信息何时有效」「该引用哪个语言版本」。

---

## 3. 优化清单（可直接执行）

### Phase 1 · 一次改动、纯静态、零风险（建议先做）

**① `docs/index.html` 的 `<head>` 增加 3 行发现链接**（llms.txt v2 核心）：

```html
<link rel="describedby" href="llms.txt" />
<link rel="alternate" type="text/markdown" href="index.zh.md" />
<link rel="alternate" hreflang="en" href="index.en.md" />
```

GitHub Pages 无法发 `Link:` 响应头，所以用 HTML `<link>` 元素即可，v2 允许。

**② 新建 `docs/.nojekyll`**（空文件），保证后续 `.md` 原样提供。

**③ 新建 `docs/index.zh.md` / `docs/index.en.md`**：把首页事实（定义、9 项功能、11 套主题表、3 种用法、8 条 FAQ、版本与平台）写成纯 Markdown，**单语言各一份**。这一份同时解决 P0-1、P0-2、P0-3、P1-2、P2-3 五项。

**④ 把 `docs/llms.txt` 升级为 v2 骨架**，链接改指向 `.md`：

```markdown
# UNOEditor

> 零依赖、本地优先的 Markdown 排版主题编辑器。左侧写稿、右侧实时预览，内置 11 套主题，
> 可复制到公众号、导出 HTML / Markdown / PDF。纯静态前端，离线可用；另附 Tauri 2 桌面壳。
> 内容对应版本 v0.1.0，最后核对 2026-11-14。

## 主要文档

- [官网全文（中文）](index.zh.md): 功能、11 套主题清单、安装、下载状态、8 条 FAQ
- [Full site content (English)](index.en.md): Features, themes, setup, downloads, FAQ
- [在线试用说明](app/index.md): 该页是纯前端编辑器，文档只存 localStorage

## Optional

- [GitHub 仓库](https://github.com/samjoeyang/UNOEditor): 源码、主题文件、Tauri 配置
- [Releases](https://github.com/samjoeyang/UNOEditor/releases): 安装包发布状态
- [常见问题](https://samjoeyang.github.io/UNOEditor/#faq)
- [主题演示](https://samjoeyang.github.io/UNOEditor/#themes)
```

**⑤ 修正两处静态文案/结构**：`#livePreview` 内的示例 `<h1>/<h2>` 改成带 class 的 `<p>`；`#dlStatus` 初始文案改成自包含事实句（不再是「正在检查…」）。

**⑥ `docs/robots.txt` 显式声明策略**（`ai-train` 取值需你决策，见第 5 节）：

```txt
# 搜索 / 引用：欢迎
User-agent: OAI-SearchBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: Claude-User
Allow: /

# 模型训练：按你的决定填 Allow 或 Disallow（三处必须一致）
User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Disallow: /
User-agent: Google-Extended
Disallow: /

User-agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=no

Sitemap: https://samjoeyang.github.io/UNOEditor/sitemap.xml
# llms-txt: https://samjoeyang.github.io/UNOEditor/llms.txt
```

> 注意：上面 `Disallow: /` 是**示例策略，不是审计结论**。若你希望内容可进入训练集，把三处改成 `Allow: /` 并把 `ai-train` 改成 `yes`；两者必须一致，否则规则优先、信号形同虚设。

### Phase 2 · 结构化数据与事实锚点

1. 补 `FAQPage` JSON-LD，**从同一份数据源生成**（8 条 Q&A 已在 HTML 里，不要手工维护第二份，避免与可见内容不一致）；同步补 `screenshot`、`featureList`、`isAccessibleForFree`、`license`、`datePublished` / `dateModified`。
2. 加 `LICENSE` 文件，把 FAQ「以仓库为准」改为明确许可证名称。
3. 给 `docs/app/index.html` 补 description / canonical / `<noscript>` 说明段落。
4. `sitemap.xml` 加 `<lastmod>`，收录两页 `.md` 与 `llms.txt`；页脚加 `<time datetime="2026-11-14">`。

### Phase 3 · 内容与自动化

1. 每个 h2 下补自包含「原子答案」；把 11 套主题做成静态 `<table>`。
2. `scripts/sync-site.sh` 增加：从单一数据源生成 `index.zh.md` / `index.en.md` / `llms.txt` / sitemap lastmod；CI 里加一条校验（`.md` 与 HTML 的关键数字一致性、JSON-LD 可解析、`curl -I` 检查 MIME）。
3. 域名定下来后，一次性替换 canonical / OG / sitemap / llms.txt 四处并加 `docs/CNAME`；若自定义域名指向 `docs/` 根，在根再放一份 `llms.txt` 以命中 Lighthouse 审计。
4. 小站可选 `llms-full.txt`（把两份 `.md` 合并）；暂不建议 MCP / A2A / WebMCP / agent-card 等——本项目没有可查询的服务能力，属于过度工程。

---

## 4. 依据与时效核对

用户要求所有结论有明确来源、并比对是否有更新的信息覆盖，故列全：

| 来源 | 日期 / 版本 | 本次用途 | 是否覆盖旧做法 |
|---|---|---|---|
| [llmstxt.org](https://llmstxt.org/) 官方规范 | **v2, 2026-08-10**（原 v1 2024-09-03） | H1/blockquote/H2 格式、`.md` 镜像、link rel、路径覆盖规则 | ✅ **v2 覆盖 v1**，本站 llms.txt 按 v1 写 |
| [llmstxt.org/changes.html](https://llmstxt.org/changes.html) | v2 变更说明 | 明确 v2 新增发现机制、Optional 语义变化 | ✅ |
| [developers.openai.com/docs/bots](https://developers.openai.com/docs/bots) | 现行（含 `OAI-SearchBot/1.4`、`GPTBot/1.4`） | 4 个 UA 与用途分离 | ✅ 比旧「只有 GPTBot」的资料更全 |
| [support.claude.com/...8896518](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-ai-crawler) | 现行，含 **2026-10-30** 起识别训练偏好信号 | 3 个 UA、具名规则优先级 | ✅ 比旧「只有 ClaudeBot」更全 |
| [Google crawlers 官方文档](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers) | 现行，注明 **early 2027** 支持 `__usage_ai-training` | Google-Extended 是 product token、不影响收录/排名 | ✅ |
| [Chrome Lighthouse llms.txt 审计](https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt) | 现行 | 404 → N/A、仅 server error 扣分 | ✅ 纠正「必须放根」的误读 |
| Google FAQ 富媒体结果下线（2026-05-07） | 多来源交叉：kompozy.io / blacksmithseo / checkseo.dev，均指向 Google 2023-08 公告与 2026-05 下线 | 不以「拿富摘要」为理由加 FAQPage | ✅ 覆盖 2023 前「加 FAQ schema 出富摘要」的旧建议 |
| Ahrefs 1,885 页对照实验（2026） | 二手报道（Search Engine Journal / kompozy.io） | 结构化数据不是引用捷径 | ⚠️ 二手，未读原实验 |
| IETF `aipref` vocab -08 / attach -05 | 2026-09-14 / 2026-08-19，**未成 RFC** | 判定不要部署 `Content-Usage` | ✅ 比「aipref 已是标准」的旧说法新 |
| [Content Signals in robots.txt](https://specification.website/spec/agent-readiness/content-signals) / [agentsurface.dev](https://agentsurface.dev/docs/discovery/robots-txt) | 2026 | `Content-Signal` 语法与矛盾检查 | 第三方整理，非厂商原文 |
| [Website Spec · Agent Readiness](https://specification.website/spec/agent-readiness) | 23 项清单，现行 | 审计框架参照（稳定 URL、Link 头、Markdown 端点等） | 第三方清单，非标准 |
| GitHub Pages `.nojekyll` / MIME 行为 | 技术文 2026-06 + community 实践 | 判定 Jekyll 与 `text/plain` 坑 | ⚠️ 二手，**须上线后 `curl -I` 实测确认** |

> 说明：OpenAI / Anthropic / Google / llmstxt.org / Chrome 为**官方一手**；FAQ 下线时间线、aipref 进度、GitHub Pages MIME 为**二手交叉验证**，报告中已分别标注可信度。未找到任何 2026 年规范认为「单页 + CSS 双语切换」对 AI 可读，故 P0-1 判为缺口而非可接受实践。

---

## 5. 需要你决策的三件事

1. **AI 训练用途政策**：`GPTBot` / `ClaudeBot` / `Google-Extended` 允许还是禁止？对应 `Content-Signal: ai-train=` 的 `yes/no`。这决定 robots.txt 与 Content-Signal 的具体写法，二者必须一致。
2. **域名**：是否绑定自定义域名？决定 `llms.txt` 能否放站点根、以及 canonical / OG / sitemap 是否要全量替换。
3. **许可证**：项目当前无 `LICENSE`，要补哪一个？补上后 FAQ 与 JSON-LD 才能给出可引用的许可事实。

确认后可按 Phase 1 → 3 实施；Phase 1 全部是新增静态文件 + 少量 HTML 改动，不影响现有视觉与交互。

---

## 6. 实施记录（2026-11-14 补充）

用户确认：**域名已绑定 `unoeditor.zhenzhidaole.com`**；许可证采用 **MIT**（复用 `PDFStudio/LICENSE` 的同一份文本，Copyright (c) 2026 samjoeyang）。已按 Phase 1 + Phase 2 落地，未改动视觉与交互逻辑。

### 6.1 已落地清单

| 缺口 | 处理 | 文件 |
|---|---|---|
| 决策项：许可证 | 新增 MIT 许可证；JSON-LD `license`、`isAccessibleForFree`；FAQ / 页脚 / 两份 md 均写明 | `LICENSE`、`docs/index.html` |
| 决策项：域名 | canonical / OG ×3 / JSON-LD 全部 @id 与 URL / sitemap / robots / llms.txt 统一替换为新域名；加 `docs/CNAME` | `docs/index.html`、`sitemap.xml`、`robots.txt`、`llms.txt`、`CNAME` |
| P0-2 llms.txt v2 | 升级为 v2：H1 + blockquote + 文件列表 + `## Optional`，链接改指向 `.md`；head 加 `rel="describedby"` 与两个 `rel="alternate" type="text/markdown"`，并加 `hreflang` / `x-default` | `docs/llms.txt`、`docs/index.html` |
| P0-3 `.md` 镜像 | 新增 `index.zh.md` / `index.en.md` / `app/index.md`；新增 `docs/.nojekyll` 防 Jekyll 渲染 | `docs/*.md`、`scripts/app-index.md` |
| P0-1 双语 DOM | 278 个静态 span 补 `lang="zh-CN"` / `lang="en"`（`app.js` 动态模板同步补）；AI 主通道改为两份单语言 `.md`；新增 `<noscript>` 静态事实摘要 | `docs/index.html`、`docs/assets/app.js` |
| P1-2 JS 注入内容 | 新增两个默认折叠但始终在 DOM 的 `<details class="catalog">`：11 套主题静态表格 + 8 张截图索引；`#dlStatus` 静态兜底改为含版本与日期的事实句，`TEXT.dlNone` 同步 | `docs/index.html`、`docs/assets/style.css`、`docs/assets/app.js` |
| P1-3 结构化数据 | JSON-LD 从 3 类扩到 5 类：`SoftwareApplication` 补 `featureList`(9) / `screenshot`(8) / `license` / `datePublished` / `dateModified` / `codeRepository` / `softwareRequirements`；新增 `WebPage` 与 `FAQPage`(8 条 Q&A，与可见文案一致)；移除语义不准的 `Offer(priceCurrency: CNY)`；补 `og:site_name` / `og:image:alt` / `og:locale` | `docs/index.html` |
| P1-4 / P2-1 抓取策略 | robots.txt 显式声明 8 个官方 UA（OpenAI 4 / Anthropic 3 / Google-Extended）+ `*` 兜底；每个 group 带 `Content-Signal: search=yes, ai-input=yes, ai-train=yes`；`llms-txt:` 注释 | `docs/robots.txt` |
| P1-5 事实锚点 | 页脚 `<time datetime="2026-11-14">`、sitemap 每条 `<lastmod>`、两份 md 写明「对应版本 v0.1.0 / 最后核对 2026-11-14」 | 上述文件 |
| P1-6 应用页 | 源 `index.html` 补 description / canonical / describedby / md alternate / `<noscript>` 说明；同步进 `docs/app/` | 根 `index.html`、`docs/app/index.html` |
| P2-4 防漂移 | `scripts/sync-site.sh` 同步后从模板恢复 `docs/app/index.md`；新增 `scripts/check-ai-files.py`（71 项校验）并在同步末尾自动运行；CI 部署前也自动跑 | `scripts/` |
| P2-3 原子答案 | 在两份 `.md` 的开头用自包含事实句 + 关键事实表给出，未改动官网可见营销文案（避免破坏设计） | `docs/index.*.md` |

### 6.2 关键发现：上线链路原本是断的（已修正）

- DNS 已生效：`dig unoeditor.zhenzhidaole.com CNAME` → `samjoeyang.github.io.`；但 `curl -I https://unoeditor.zhenzhidaole.com/` 实测 **HTTP 404**，`/llms.txt` 也 404。
- 根因之一：原 `.github/workflows/pages.yml` 部署的是 **`path: dist`**（纯应用前端），且 `paths` 触发器**不监听 `docs/**`** —— 官网与所有 AI 文件根本不会被发布。
- 已修正：部署目标改为 `path: docs`（`docs/app/` 已是完整应用副本，不丢功能）；触发器加 `docs/**`、`scripts/**`；CI 里跑 `copy-dist.sh && sync-site.sh && touch docs/.nojekyll`，保证在线试用始终是最新版；新增 `docs/CNAME`，因为 artifact 部署不会自动写入 CNAME（原 workflow 注释里「由 GitHub 自动注入」的判断不成立）。
- **仍需上线后复测**：当前 404 也可能是因为代码尚未 push、Pages 未首次部署。部署后用 `curl -I` 确认 `/`、`/llms.txt`、`/index.zh.md` 均为 200。

### 6.3 策略默认值（可一行改回）

用户未指定 AI 训练用途，故采用**不改变原有实际权限**的口径：原 `User-agent: * Allow: /` 本就允许一切，现在只是把隐式变显式，且 `ai-train=yes` 与 MIT 许可一致。若日后要禁止训练，需同时改 `docs/robots.txt` 中 3 个训练类 UA 的 `Allow: /` → `Disallow: /`、所有 `ai-train=yes` → `no`，并同步修改 `scripts/check-ai-files.py` 里的策略断言（否则校验会失败）。**信号与规则必须一致，否则规则优先、信号形同虚设。**

### 6.4 缓解但未根治（如实标注）

- **仍有 2 个 `<h1>`**：主题演示纸张的 `<h1>` / `<h2>` 是 `theme-styles.js` 里 `.md-body h1/h2` 选择器的作用对象，改成 `<p>` 会让 11 套主题演示失去真实排版。已采取：容器加 `data-ai-role="sample-content"` + `aria-label` + HTML 注释；两份 `.md` 明确写出「这是示例文稿、不是页面标题，页面唯一主标题是 X」；`<noscript>` 提供权威摘要。AI 走 Markdown 通道后基本不受影响，但 HTML 大纲仍是 2 个 h1。彻底解决需拆 `/en/` 独立页或改应用主题样式选择器，成本与风险都更高。
- **HTML 仍同时含中英两套文案**：未拆独立英文 HTML（会双倍维护）。通过 `lang` 属性、`hreflang`、两份单语言 `.md` 镜像、llms.txt v2 指向 `.md` 来缓解。
- **MIME 限制**：本地实测 `.md` → `text/markdown`、`llms.txt` → `text/plain`。GitHub Pages 不能自定义响应头，若要把 `llms.txt` 也标成 `text/markdown` 需前置 CDN 转换规则；多数代理仍可读纯文本，当前可接受。
- 未做 `llms-full.txt` / MCP / A2A / WebMCP / `/.well-known/`（项目站只能控子路径，well-known URI 放不了）——对本项目属过度工程。

### 6.5 验证结果

- `scripts/check-ai-files.py`：**71 passed, 0 failed**（域名、必需文件、JSON-LD 解析、FAQ 与可见文案一致、sitemap、llms.txt 链接可解析、md 关键事实、robots 策略一致性）。
- 所有 JS `node --check` 通过；本地静态服务器下 `/`、`index.zh.md`、`index.en.md`、`app/index.md`、`llms.txt`、`robots.txt`、`sitemap.xml`、图片、脚本、样式全部 200。
- Playwright 实测：中英切换、11 主题切换、8 截图画廊、FAQ 手风琴、下载无发布降级、`catalog` 表格展开、320/390/760/1024/1440 五档视口**横向溢出均为 0**；`docs/app/` 编辑器 / 预览 / 11 主题正常，无脚本错误。唯一 404 是按预期 mock 的 GitHub Releases API（当前无 release）。
- `<noscript>` 在 JS 启用时为 0×0 不渲染，Hero 首屏视觉无回归。

### 6.6 需要你处理

1. **commit + push 后 Pages 才会真正部署** —— 按你的约定，我没有自行 push。
2. 部署后 `curl -I https://unoeditor.zhenzhidaole.com/` 复测 200，并检查 `/llms.txt` 与 `/index.zh.md` 的 `Content-Type`。
3. 若要禁止 AI 训练，按 6.3 改 `docs/robots.txt`。

---

## 7. 发版与上线记录（2026-11-14 17:45 GMT+8 补充）

本节覆盖 6.6 的待办与 6.2 的待复测项；6.1–6.6 保留为当时快照。

### 7.1 结果

| 项 | 结果 |
|---|---|
| 提交 / 推送 | `a8532c1` → `3fd2833` → `dc7c870` → 官网文案提交，均已推送 `main`；tag `v0.1.0` 指向发布提交（首轮失败后 force-move，草稿当时未公开） |
| CI | 3 平台（macOS / Ubuntu / Windows）全绿 |
| Pages | 部署成功，自定义域名 `unoeditor.zhenzhidaole.com` HTTPS 证书已签发 |
| Release v0.1.0 | **正式发布**（非草稿、非预发布），9 个资产：macOS `.dmg` ×2（aarch64 / x64）+ `.app.tar.gz` ×2、Windows `.msi` / `.exe` ×2、Linux `.deb` / `.AppImage` / `.rpm` ×3 |
| 官网文案 | 「尚无预编译安装包」全量改为「v0.1.0 已发布」，覆盖 HTML、JSON-LD FAQ、两份 md、llms.txt、app.js 兜底；校验从 107 项扩到 117 项 |

### 7.2 上线复测（6.2 / 6.6 待办关闭）

全部 200：`/` `text/html`、`/llms.txt` `text/plain`、`/index.zh.md` `/index.en.md` `/app/index.md` `text/markdown`、`/robots.txt` `text/plain`、`/sitemap.xml` `application/xml`、`/app/` `text/html`。证实 6.4 的 MIME 预判，且 6.2 的 404 根因确为「代码未 push、Pages 未首次部署」。

### 7.3 过程中定位并修复的三个真实故障（有日志依据）

1. **Pages 首次部署失败**：`sync-site.sh` 用 `cp -R dist/ docs/app/`。macOS BSD cp 复制目录内容，GitHub Actions 的 GNU cp 却生成 `docs/app/dist/`，导致 `docs/app/index.html` 缺失、GTM 注入抛 FileNotFoundError。改为 `cp -R "$ROOT/dist/." "$SITE/"` 并加存在性断言。
2. **Release job-level `if` 不能引用 `secrets`**：GitHub 官方 contexts 表限定 `jobs.<id>.if` 仅允许 `github/needs/vars/inputs`（2026-11 现行）。原 Android/iOS job 的 `if: ${{ secrets.X != '' }}` 会使 workflow 解析失败；改为 `vars.ENABLE_*` 开关，默认跳过。
3. **macOS 签名 env 空值**：Tauri 2 只要检测到 `APPLE_CERTIFICATE` 变量存在就执行 `security import -f pkcs12`，空字符串同样报「certificate must be a PKCS#12 file」。首轮 Release 的 2 个 macOS job 因此失败，而 CI（未注入这些 env）的 macOS 构建成功。删掉 6 个 `APPLE_*` env 后产出**未签名** `.dmg`。将来有证书时应用受 `vars` 控制的 step 写入 `$GITHUB_ENV`，不要写空值。

另：补 `src-tauri/icons/` 全套图标（PNG / ICNS / ICO），否则 `bundle.icon` 找不到文件；`release.yml` 加 `retryAttempts: 2` 兜底 4 个矩阵 job 并发写同一草稿；新增 `workflow_dispatch.tag` 输入便于手动重发。

### 7.4 仍然成立的限制

- macOS `.dmg` **未做 Developer ID 签名与公证**（v0.1.0 的 bundle 签名无效，源码已改为 ad-hoc 签名，见 7.5），首次打开需在 Finder 右键「打开」或系统设置中手动允许；要免警告分发需 Apple Developer 证书与公证密钥。
- 6.3 的 `ai-train=yes` 策略未变，与 MIT 许可一致；若要改，robots 规则与 Content-Signal 必须同步。
- 6.4 的两处「缓解但未根治」（HTML 仍含 2 个 `<h1>`、双语 DOM 共存）仍在。

### 7.5 上线后用户反馈的两个故障（2026-11-14 复测）

1. **在线版长文档无法上下滚动**：`grid` / `flex` 子项默认 `min-height:auto`，内容超高时 `.editor-pane` / `.preview-pane` / `.preview-stage` 被撑到内容高度，`overflow:auto` 失效，超出部分又被 `body{overflow:hidden}` 裁掉。Playwright 实测（1440×900，注入 250 段 Markdown）：修复前 `body.scrollHeight=51359`，`#editor` 与 `#previewStage` 设 `scrollTop=400` 后均回读 `0`；加入 `min-height:0` 与 `grid-template-rows:minmax(0,1fr)` 后 `body.scrollHeight=900`、`#editor=764/31259`、`#previewStage=798/51257`，两者均可滚到 400。窄屏（390×844）编辑 / 预览两个 Tab 同样通过。顺带补 `100dvh` 回退，避免移动端浏览器工具栏占位。
2. **macOS 安装包报「已损坏」**：`hdiutil verify` 对两个 `.dmg` 均返回 VALID，排除文件损坏；`codesign -dv` 显示 x64 包 `code object is not signed at all`，aarch64 包只有 linker 生成的 ad-hoc 签名且 `codesign --verify --deep --strict` 报 `code has no resources but signature indicates they must be present`。浏览器下载的 `com.apple.quarantine` 叠加无效 bundle 签名 → Gatekeeper 判为损坏。Tauri v2 官方文档 <https://v2.tauri.app/distribute/sign/macos/> 明确写出签名用于避免「application is broken and can not be started, when downloaded from the browser」，并给出 `signingIdentity: "-"` 做 ad-hoc 签名。本地实测：把 `.app` 拷出后执行 `codesign --force --deep --sign -`，`codesign --verify --deep --strict` 返回 `valid on disk` / `satisfies its Designated Requirement`。已写入 `src-tauri/tauri.conf.json`，并在官网下载区、Release 说明、两份 md 镜像与 llms.txt 写明首次打开步骤。

**限制**：ad-hoc 签名只消除「已损坏」，未公证的 app 首次仍需在「隐私与安全性」放行一次；彻底免提示需 Apple Developer ID + 公证。已发布的 v0.1.0 资产不会自动变好，必须重新打包发版；用户当下可执行 `xattr -cr /Applications/UNOEditor.app` 直接使用现有包。

