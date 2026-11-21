# UNOEditor 产品定位（v2，2026-11-19）

> 本文件是内部定位文档，不发布到官网。取代 v1 的「纯本地，零上传」定位。
> 变更原因：原「不注册、不登录、不同步」的零上传定位不是产品方向——账号登录已接入（auth.zhenzhidaole.com），桌面版另提供可选同步（本地目录 / WebDAV / Nextcloud / S3，默认关闭、凭证自持）。**断网可用**仍是核心卖点。

## 一句话定位

**UNOEditor 是一款「本地优先」的 Markdown 排版主题编辑器：写作与排版始终先发生在你自己的设备上，断网照常可用；账号登录可选，桌面版另提供由用户自带存储目标的可选同步（默认关闭）。**

定位语（对外可用）：

- 中文：写完，就已经排好版。本地优先，断网可用；登录与同步，按需开启。
- 英文：Write once. Publish beautifully. Local-first and offline-ready — optional sign-in and bring-your-own sync.

## 定位拆解

| 维度 | 内容 |
| --- | --- |
| 品类 | Markdown 排版主题编辑器（写稿 → 成稿 → 发布，一站式） |
| 核心价值 | 写完即成稿：11 套排版主题、实时预览、一键复制到公众号、HTML/Markdown/PDF 导出 |
| 架构主张 | **本地优先（local-first）**：默认场景下写作发生在本地、离线可用；联网是增强项而非前提 |
| 账号主张 | 可选增强：登录不参与文稿存储；同步走用户自带的本地目录或云盘，不依赖账号，不登录也能完整使用编辑与导出功能 |
| 差异化 | 对比 Typora/Obsidian：不做知识库、不做插件生态，专攻单篇成稿与发布交付 |

## 目标用户

1. 公众号 / 自媒体作者：写完直接贴进微信编辑器，不再手动调格式。
2. 需要交付排版成稿的写作者：报告、长文、要发给别人或打印的稿件。
3. 想折腾版式的内容创作者：导入 GitHub / Typora / Obsidian 主题 CSS 二次定制。

## 事实边界（文案写作的红线）

| 状态 | 事实 |
| --- | --- |
| 当前已成立 | 纯前端 + Tauri 2 桌面壳；文档/主题存浏览器 localStorage（桌面壳为 WebView 本地存储）；断网可完整使用；应用自身的联网功能均为可选项：检查更新（GitHub Releases API）与账号登录（auth.zhenzhidaole.com） |
| 已上线（v0.1.6） | 通过 auth.zhenzhidaole.com 的注册/登录（Better Auth OAuth 2.1 Provider，OAuth 2.0 + PKCE，桌面版深链 unoeditor://callback/） |
| 已上线（v0.1.6，桌面版） | 可选同步：本地目录 / WebDAV / Nextcloud / S3；默认关闭，显式开启后才上传到你指定的目标 |

**写作规则：**

1. 已经上线的功能用陈述句；未上线的功能只能以「即将上线 / 规划中 / on the way」出现，禁止写成已有功能。
2. 「不上传 / 零上传 / 永不联网」这类绝对化承诺**全部停用**——与账号和同步能力冲突。「零依赖 / zero-dependency」作为卖点口号同样**停用**（技术栈是事实，可陈述「原生 HTML / CSS / JavaScript，图标与主题内嵌」，但不用「零依赖」当口号）。描述现状用「文档保存在浏览器本地」「应用自身的联网功能均为可选项：检查更新与账号登录」。
3. 「断网可用 / 离线完整可用」保留，且始终要写——这是对登录用户的承诺：登录上线后，不登录、断网也应能完整写稿。
4. 同步必须写清边界：默认关闭、同步目标由用户指定、凭证只存本机配置、文档以原文 + front matter 存放、冲突生成独立副本而不静默覆盖。

## 对外话术替换表

| 旧话术（停用） | 新话术 |
| --- | --- |
| 纯本地，零上传：不注册、不登录、不同步 | 本地优先，离线可用；登录可选，同步由用户自选目标并显式开启 |
| 文档不上传 / 文档不离开本机（作为卖点口号） | 文档保存在你自己的浏览器 / 设备里（描述现状可用，不作为绝对化口号） |
| 应用不发起任何网络请求 / 除检查更新外不联网 | 应用自身的联网功能均为可选项：检查更新与账号登录（描述现状，不作为「不联网」承诺） |
| 零网络请求，file:// 直接可用 | file:// 直接可用，断网照常写稿 |
| 零依赖 / zero-dependency（作为卖点口号） | 原生 HTML / CSS / JavaScript，图标与主题内嵌（陈述技术栈事实，不用「零依赖」口号） |
| 三种用法（都不需要账号） | 三种用法（当前无需账号） |

## 路线图

- **P0 账号登录（已完成，v0.1.6）**：已接入 auth.zhenzhidaole.com（Better Auth OAuth 2.1 Provider，OAuth 2.0 + PKCE，public client）。桌面版经系统浏览器 + `unoeditor://callback/` 深链回跳；网页版整页跳转 + `https://unoeditor.zhenzhidaole.com/app/` 回调（**需在认证服务端补登记该 redirect URI 并放行 CORS 源**）。登录不登录均可用全部编辑功能。
- **P1 自带目标同步（已完成，桌面版 v0.1.6）**：每篇文档一个 Markdown 文件（含 front matter）+ 一个索引；支持本地目录、WebDAV、Nextcloud、S3 兼容存储；三方合并（base/rev）与冲突副本；默认关闭。
- **P2 账号云同步**：范围与加密策略待定，落地前只说「规划中」。
- 后续候选（未承诺）：主题市场 / 分享、团队协作等，待账号体系验证后再评估。

## 受影响的对外文件清单（v1→v2 已改）

`docs/index.html`（JSON-LD / hero / 特性卡 / FAQ / noscript / footer）、`docs/index.zh.md`、`docs/index.en.md`、`docs/llms.txt`、`docs/app/index.html`、根 `index.html`、`docs/app/index.md`、`scripts/app-index.md`、`scripts/check-ai-files.py`（日期断言同步更新）。
