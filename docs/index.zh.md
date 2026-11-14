# UNOEditor

> UNOEditor 是一款零依赖、本地优先的 Markdown 排版主题编辑器。左侧写 Markdown，右侧实时预览成稿；内置 11 套排版主题，可一键「复制到公众号」、下载 HTML / Markdown 或打印为 PDF。它是纯静态前端，双击 `dist/index.html` 即可离线使用，不发起任何网络请求。当前版本 0.1.0，采用 MIT 许可证。
>
> 官网：https://unoeditor.zhenzhidaole.com/ · 仓库：https://github.com/samjoeyang/UNOEditor
> 本文内容最后核对：2026-11-14 · 对应版本：v0.1.0

## 关键事实

| 项目 | 值 |
| --- | --- |
| 软件名称 / 仓库名 | UNOEditor（https://github.com/samjoeyang/UNOEditor） |
| 桌面应用 identifier | `com.unoeditor.app` |
| 当前版本 | 0.1.0 |
| 许可证 | MIT（见仓库根目录 `LICENSE`） |
| 费用 | 免费、无广告、无功能限制 |
| 技术栈 | 原生 HTML / CSS / JavaScript，零第三方运行时依赖；图标为内联 Lucide SVG sprite；主题 CSS 以字符串内嵌并运行时注入 |
| 桌面壳 | Tauri 2（Rust），最低 macOS 10.15，bundle targets 为 all |
| 内置主题数 | 11 套 |
| 导出方式 | 4 种（复制到公众号、HTML、Markdown、打印/存为 PDF） |
| 界面语言 | 中文、英文，一键切换 |
| 数据存储 | 仅浏览器 `localStorage`（桌面壳为 WebView 本地存储） |
| 网络请求 | 应用本身 0 次；官网下载区会查询 GitHub Releases API |
| 预编译安装包 | v0.1.0 已发布：macOS / Windows / Linux 桌面安装包（见 GitHub Releases） |

## 它能做什么

1. **实时双栏预览**：左边写稿，右边即时看到成稿排版，支持手机 / 网页两种预览模式。
2. **11 套内置主题**：点选即换，主题元数据在 `js/themes.js`，样式在 `js/theme-styles.js`。
3. **导入任意主题文件**：支持 `.json` 与 `.css`。导入器把 `.markdown-body`（GitHub）、`#write`（Typora）、`.markdown-preview-view` / `.cm-editor`（Obsidian）等根选择器自动适配到 `.md-body`，并做安全清洗与作用域隔离，随 `localStorage` 持久化。基础标签样式通用可生效；市场特有的 class（例如 Obsidian 的 `.callout`）不会生效。
4. **微调不必改 CSS**：可调字号、行高、强调色，并可一键重置。
5. **一键复制到公众号**：导出时递归遍历预览 DOM，用 `getComputedStyle` 把样式写成内联属性，并把根节点改为 `section`（微信编辑器会过滤 `article` 与 `class`），粘贴后即为预览版式。
6. **四种交付方式**：复制到公众号（富文本）、下载内嵌主题样式的独立 HTML、下载 Markdown 源文件、打印或存为 PDF。
7. **大纲与多文档**：H1–H6 自动生成文章大纲，点击跳转；文档列表在顶栏下拉。
8. **纯本地，零上传**：不注册、不登录、不同步，断网可用。
9. **桌面 + 移动端**：窄屏自动切换为「编辑 / 预览 / 大纲」底部标签与抽屉式主题面板；另有 Tauri 2 桌面壳可自行构建。

工作区为三栏：左侧文章大纲、中间 Markdown 编辑器、右侧排版预览；主题走顶栏右侧抽屉。

## 内置 11 套主题

| 主题 | English | ID | 特点 |
| --- | --- | --- | --- |
| 默认公众号风格 | WeChat Classic | `wechat` | 居中标题、蓝色链接、柔和留白，日常推送 |
| 红黑社论 | Editorial Red | `economist` | 红黑双线、衬线大写标题、两端对齐，观点评论 |
| 墨白长文 | Ink & Paper | `nyt` | 黑白衬线、居中大标题、极细分隔线，长篇叙事 |
| 瑞士国际主义 | Swiss International | `swiss` | 严格左对齐网格、字号一级差四号、细线与一点红 |
| 莫兰迪编辑 | Morandi | `morandi` | 低饱和雾色、圆角卡片、轻字重大留白 |
| 留白 | Whitespace | `hara` | 极小字号、极大行距与段距，近乎无装饰 |
| 净灰 | Clean Grey | `apple` | 大号紧字距标题、克制灰度层次、圆角灰底卡片 |
| 深夜电台 | Nocturne | `nocturne` | 深色底、琥珀色重点、衬线标题，夜间阅读 |
| 系统灰 | System Grey | `gfm` | 系统字体、中性灰、发丝分隔线与代码芯片，GitHub README 观感 |
| 暗色笔记 | Dark Notes | `obsidian` | 深色画布、暖白正文、紫色点缀 |
| 纯净书写 | Pure Writing | `typora` | 大行距、克制留白、几乎无装饰 |

## 界面截图

全部为本机实际运行截图，无合成效果图。图片位于官网 `/assets/shots/`。

| 文件 | 说明 |
| --- | --- |
| `overview.png` | 三栏工作区：大纲、Markdown 编辑器与实时排版预览 |
| `themes.png` | 右侧主题抽屉：11 套内置主题，支持导入自定义主题 |
| `theme-swiss.png` | 瑞士国际主义：严格左对齐网格、细线与一点红 |
| `theme-nocturne.png` | 深夜电台：深色底、琥珀色重点与衬线标题 |
| `theme-morandi.png` | 莫兰迪编辑：低饱和雾色、圆角卡片与温和留白 |
| `export.png` | 导出菜单：复制到公众号、下载 HTML / Markdown、打印或存为 PDF |
| `english.png` | 一键切换英文界面，主题名称与说明同样双语 |
| `mobile.png` | 窄屏变为编辑 / 预览 / 大纲三个底部标签，主题走抽屉 |

## 三种用法（都不需要账号）

1. **在线试用（最快）**：打开 https://unoeditor.zhenzhidaole.com/app/ ，功能与本地版一致，数据仍只存在自己的浏览器里。
2. **本地文件（最省心）**：克隆仓库后双击 `dist/index.html`，或用任意静态服务器打开。零构建、零安装、零网络请求，`file://` 直接可用。
   ```sh
   git clone https://github.com/samjoeyang/UNOEditor.git
   open UNOEditor/dist/index.html
   ```
3. **桌面应用（Tauri 2）**：仓库附带 `src-tauri` 配置，可自行构建 macOS / Windows / Linux 原生窗口，需本机装有 Rust 与 Tauri CLI。
   ```sh
   sh copy-dist.sh
   cd src-tauri && cargo tauri build
   ```

**系统要求**：任意现代浏览器（Chrome / Edge / Safari / Firefox）；Tauri 壳最低 macOS 10.15。
**快捷键**：`⌘/Ctrl+B` 粗体、`⌘/Ctrl+I` 斜体、`⌘/Ctrl+K` 链接、`⌘/Ctrl+S` 保存。

## 下载状态

UNOEditor **v0.1.0 已于 2026-11-14 发布**，GitHub Releases 提供预编译桌面安装包：macOS（Apple Silicon / Intel）选 `.dmg`，Windows 选 `.msi` / `.exe`，Linux 选 `.deb` / `.AppImage` / `.rpm`。官网下载区动态读取 GitHub Releases API，自动列出最新版本并按访问者系统高亮推荐。在线版与本地文件无需安装即可使用。

**macOS 首次打开（v0.1.0 用户必读）**：v0.1.0 的 `.dmg` 内 `.app` 没有有效的 bundle 签名，浏览器下载后 Gatekeeper 会报「已损坏，无法打开」——文件经校验完整，并非下载出错。临时解法：执行 `xattr -cr /Applications/UNOEditor.app` 清除隔离属性后打开，或右键「打开」/「系统设置 → 隐私与安全性 → 仍要打开」。源码已加 `bundle.macOS.signingIdentity: "-"`，下一版重新打包后不再报「已损坏」，但因未做 Apple 公证，首次仍需手动放行一次。另请选对架构：Apple Silicon 用 `aarch64.dmg`，Intel 用 `x64.dmg`。

## 隐私与数据

应用不发起任何网络请求，文档与自定义主题只保存在浏览器 `localStorage`（桌面壳中是 WebView 本地存储），不上传服务器，断网可用。清除浏览器数据会一并清除文档，重要稿件建议用「下载 Markdown」另存一份。官网页面使用 Google Tag Manager 统计访问量，不读取编辑器内的文稿；官网不加载第三方字体或 CDN。

## 常见问题

**问：需要联网、注册账号或装运行环境吗？**
答：都不需要。UNOEditor 是原生 HTML / CSS / JavaScript，零第三方运行时依赖，图标和主题样式全部内嵌。双击 `dist/index.html` 就能在 `file://` 下运行，断网照常写稿。

**问：我的文章会被上传吗？存在哪里？**
答：不会上传。应用不发起任何网络请求，文档与自定义主题保存在浏览器 `localStorage`。清除浏览器数据会一并清除文档，重要稿件建议导出 Markdown 另存。

**问：「复制到公众号」真的是所见即所得吗？**
答：是。导出时遍历预览 DOM，用 `getComputedStyle` 把样式递归写成内联属性，并把根节点改为 `section`（微信编辑器会过滤 `article` 与 `class`）。粘贴后即为预览版式。

**问：和 Typora / Obsidian 有什么不同？**
答：那两者是笔记与知识库工具，UNOEditor 只做一件事：把一篇文章排成可发布的成稿。它不管双链、不管插件生态，专攻主题体系、手机预览和发布导出。反过来，它们的主题 CSS 大多可以直接导入 UNOEditor 使用。

**问：能导入其它编辑器的主题吗？有限制吗？**
答：支持 `.json` 与 `.css`，导入器会改写根选择器并做安全清洗与作用域隔离。基础标签样式通用可生效；市场特有的 class 不会生效。

**问：支持哪些系统？手机能用吗？**
答：任意现代浏览器均可。窄屏自动切换为底部标签与抽屉式主题面板。另附 Tauri 2 桌面壳可自行构建；v0.1.0 起同时提供 macOS / Windows / Linux 预编译安装包。

**问：导出的 HTML 能脱离应用单独打开吗？**
答：能。下载 HTML 会把当前主题样式整段内嵌进文件，导入的自定义主题也会一并写入，单文件分享、托管或打印成 PDF 都不丢样式。

**问：免费吗？采用什么许可证？怎么参与？**
答：完全免费、无广告、无功能限制，源码采用 **MIT 许可证**。在 https://github.com/samjoeyang/UNOEditor 提 Issue 反馈问题、在 Discussions 提建议。

## 国际化与深链

界面支持中文 / 英文一键切换，主题名称与说明同样双语。官网首页支持 `?lang=zh|en` 与 `?theme=<主题ID>` 查询参数（例如 `?lang=en&theme=nocturne`），便于分享指定主题与语言。

## 给 AI 阅读者的说明

- 官网 `index.html` 中英文两套文案同时存在于 DOM，靠 CSS 按 `data-lang` 显隐；**本文是权威的中文纯文本版本**，英文请读 `index.en.md`，不要从 HTML 里同时抽取两种语言。
- 官网「主题实时演示」区域里的 `<h1>对齐，是最便宜的高级感</h1>` 与 `<h2>字号，一级差四号</h2>` 是**被测试主题的示例文稿**，不是本站页面标题，也不代表产品陈述。页面唯一的主标题是「UNOEditor · 排版主题编辑器 — 写完，就已经排好版」。
- 「下载」区的版本号、发布日期与安装包状态以本文与 https://github.com/samjoeyang/UNOEditor/releases 为准；官网该区块在浏览器里会动态刷新。

## 相关链接

- 官网首页：https://unoeditor.zhenzhidaole.com/
- 在线试用：https://unoeditor.zhenzhidaole.com/app/
- 英文全文：[index.en.md](index.en.md)
- 在线试用说明：[app/index.md](app/index.md)
- 站点 AI 索引：[llms.txt](llms.txt)
- GitHub 仓库：https://github.com/samjoeyang/UNOEditor
- Releases：https://github.com/samjoeyang/UNOEditor/releases
- Issues：https://github.com/samjoeyang/UNOEditor/issues
- Discussions：https://github.com/samjoeyang/UNOEditor/discussions
