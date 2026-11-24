# UNOEditor AI 功能规划（v0.1 草案）

> 状态：**P0 + P1 + P2 均已实施（本地，未发版）**。六大能力全部落地：改写、续写、全文助手、翻译、自定义指令库、排版诊断；含 SSE 流式（桌面 Tauri event / 网页 ReadableStream）与非流式降级。
> 验收：cargo test **14/14**、cargo check 通过；JS 语法检查全过；DOM stub 测试 **73/73**（P0 25 + P1/P2 18 + 集成 17 + 既有回归 13）；check-ai-files.py 129/129；copy-dist.sh 打包链路含 ai.js。
> P3（术语表/风格指南注入、公众号封面文案）仍待评估，未实施。
> 编制日期：2026-11-23。参考基准：Notion AI 官方帮助中心（抓取同日，链接见文末）。
> 定位约束：遵循 `POSITIONING.md` v2——本地优先、断网可用；AI 是**可选增强**，默认关闭；禁止「零上传 / 不联网」等绝对化承诺。

---

## 1. 战略取舍：Notion 六大能力 → 本项目六大能力

Notion AI 的六类能力（行内编辑、AI 区块、Agent、企业搜索、AI 会议记录、技能/自定义 Agent/数据库/生图）服务于「团队知识库 + 多步自动化」。本项目定位是「单篇 Markdown 成稿 → 排版 → 发布」，不做知识库、不做插件生态。因此按三条原则裁剪：

1. **只保留写稿链路上的能力**：写作、改写、翻译、成稿加工。
2. **Agent 降级为「单文档助手」**：不做跨页、跨库、定时触发，只处理当前这一篇。
3. **补一项 Notion 没有、但本项目独有的能力**：排版诊断（基于当前主题 CSS）。

| # | 本项目能力 | 对标 Notion | 落地形态 | 优先级 |
|---|---|---|---|---|
| 1 | 智能改写 Inline Rewrite | 用 AI 编辑 / 行内写作 | 选中文本 → 润色 / 精简 / 扩写 / 改语气 / 纠错 / 转标题 | P0 |
| 2 | AI 续写与草稿 AI Draft | AI 区块 | 空行空格或 `/ai` → 按提示生成段落、大纲、小标题、金句 | P0 |
| 3 | 全文助手 Doc Copilot | Notion Agent（轻量版） | 整篇：标题候选、摘要、SEO 关键词、大纲提炼、公众号导语 | P1 |
| 4 | 翻译与双语 Translate | 翻译页面 | 选中 / 整篇翻译，保留 Markdown 结构与代码块 | P1 |
| 5 | 自定义指令 Prompt Skills | Skills | 用户自建常用 prompt 模板，本机存储，可一键套用 | P2 |
| 6 | 排版诊断 Layout Coach | （Notion 无对应） | 读当前主题 CSS + 文稿结构，给出排版改进建议（标题层级、行宽、图片说明等） | P2 |

**明确不做**（与定位冲突，写入决策记录避免反复讨论）：

- 企业搜索 / 跨工作区检索——本项目无知识库，文稿原文就在本地。
- AI 会议记录——不在写稿链路内。
- 数据库建库 / 写公式——本项目无数据库概念。
- 生图——排版稿的配图由用户自有素材提供，避免额外模型成本与内容风险。
- 定时 / 触发式 Custom Agent——需要常驻联网，违背断网可用。

---

## 2. 技术架构：BYOK（Bring Your Own Key）

六种能力全部构建在第三方大模型之上，应用自身**不提供模型、不托管 Key、不设额度体系**。用户自带 API Key，直连所选服务商。

### 2.1 分层与数据流

```
┌─ 前端（原生 JS，js/ai.js，IIFE 模块，对齐 sync.js 写法）
│  设置面板 aiModal ── 配置读写 ── 能力入口（选中菜单 / 斜杠命令 / 全文按钮）
│
├─ 桌面版：Tauri command（src-tauri/src/ai.rs，reqwest 已就绪）
│   uno_ai_config_get / uno_ai_config_set（整份配置读写）
│   uno_ai_test(profileId) / uno_ai_chat(profileId, payload)
│   Key 存 app_config_dir/ai-config.json（与 sync-config.json 同策略）
│   Rust 发 HTTPS 请求 → 第三方模型 → 结果回前端
│
└─ 网页版：js/ai.js 直接 fetch 服务商 API
    Key 存 localStorage；仅支持允许浏览器跨域的服务商
```

**为什么桌面版走 Rust 代理**：规避浏览器 CORS 限制；Key 不进入网页 DOM/JS 上下文；可统一处理流式、超时、重试；与现有 reqwest 依赖（`rustls-tls` + `json`）零新增成本。

### 2.2 服务商策略

优先支持 **OpenAI 兼容协议**（一套实现覆盖多数服务商，用户填 Base URL + Model + Key 即可）：

| 预设 | Base URL | 备注 |
|---|---|---|
| DeepSeek | `https://api.deepseek.com/v1` | 中文写稿性价比高，推荐默认预设 |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | |
| Moonshot / Kimi | `https://api.moonshot.cn/v1` | 长文本 |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | |
| OpenRouter | `https://openrouter.ai/api/v1` | 聚合多模型 |
| 自定义 | 用户填写 | 任何 OpenAI 兼容端点 |

二期按需扩展 Anthropic / Gemini 原生协议。**预设只是填空快捷方式，不构成推荐背书**；文档需注明「服务商由你选择，费用与条款遵循其协议」。

### 2.3 配置结构（与 sync-config.json 同目录）

**支持多个模型配置档（profile）**：每个档 = 服务商 + 模型 + 自带 Key；一次调用只用一个档。不做「一个 Key 打天下」，因为不同任务对成本/上下文/质量的需求不同（改写用便宜模型，长文全文用长上下文模型）。

```json
{
  "enabled": false,
  "version": 1,
  "defaultProfile": "deepseek-main",
  "profiles": [
    {
      "id": "deepseek-main",
      "name": "DeepSeek 主力",
      "provider": "openai-compatible",
      "baseUrl": "https://api.deepseek.com/v1",
      "model": "deepseek-chat",
      "apiKey": "",
      "temperature": 0.7,
      "maxTokens": 2048
    },
    {
      "id": "kimi-long",
      "name": "Kimi 长文",
      "provider": "openai-compatible",
      "baseUrl": "https://api.moonshot.cn/v1",
      "model": "moonshot-v1-128k",
      "apiKey": "",
      "temperature": 0.7,
      "maxTokens": 4096
    }
  ],
  "systemPrompt": "",
  "requestTimeoutMs": 30000,
  "updatedAt": 0
}
```

**使用时如何选择（三级，从默认到覆盖）**：

| 优先级 | 场景 | 选择方式 |
|---|---|---|
| 1（默认） | 日常使用 | 用 `defaultProfile`，零思考成本 |
| 2（单次覆盖） | 某次改写/续写/全文想换模型 | 能力面板上的「模型」下拉临时选择，**仅本次生效**，不改变默认档 |
| 3（持久化） | 想长期换默认 | AI 设置面板里把某档「设为默认」，写回 `defaultProfile` |

补充规则：

- **不自动 fallback**：当前档 Key 失效 / 额度耗尽 / 请求失败，只提示错误并给「去设置」入口，**不自动切到其他档**。原因：不同服务商的数据条款不同，自动切换会在用户不知情时把文稿发往另一个第三方。
- 「测试连接」对每个档单独提供，一键测该档 Key 与模型是否可用。
- 档数量上限建议 8，避免下拉列表过长；支持增删改名、复制新档。
- `enabled` 默认 `false`；入口显隐策略见 2.5 节。Key 输入框 `type=password`，界面只显示掩码，绝不回显完整值到日志或 DOM 属性。
- **分期**：多档结构在 P0 一次到位（数据结构留好 `profiles` 数组，后续不用迁移）；「按能力绑定不同默认档」（如改写固定用 A、全文固定用 B）放到 P2，视使用数据再定，避免 P0 设置面板过载。

### 2.4 AI 入口位置（已定）

入口放在**右上角「更多」下拉菜单**（`#utilityDropdown` → `#utilityPanel`），与「语言 / 同步 / 账号」并列，顺序建议：**语言 → AI → 同步 → 账号**（AI 排在同步前，因为同为自带凭证类可选增强）。

| 元素 | 位置 | 理由 |
|---|---|---|
| 设置入口 | 「更多」菜单内新增按钮 `#aiBtn`，仿 `#syncBtn` 写法，带状态点（关=灰 / 就绪=绿 / 错误=红） | 不占主工具栏；与同步/账号同类聚合，用户找得到 |
| 设置面板 | 新增 `aiModal`，仿 `syncModal` 结构，独立浮层 | 不复用 syncModal，避免耦合 |
| 编辑器内能力入口 | 选中文本浮动菜单（改写）、`/ai` 斜杠命令（续写）、全文助手按钮（整篇） | 能力就近触发，设置集中在「更多」 |
| 未启用时的显隐 | 「更多」菜单里 **AI 按钮始终可见但带灰色状态点**；点开面板显示「AI 默认关闭，开启需联网」，引导配置 | 解决上一轮待决项：选项 B（可见+置灰+引导配置）。理由：可发现性强，且「更多」本就是设置区，不打断写稿 |

**不放的位置**：主工具栏（格式工具区，拥挤且语义不符）、侧栏大纲区（非设置区）、底部状态栏（易被忽略）。

### 2.5 与现有代码的接入点

| 位置 | 改动 | 说明 |
|---|---|---|
| `js/ai.js` | 新建 | 对齐 `sync.js` 的 IIFE + `init(hooks)` 模式；hooks 取 editor 文本、选区、toast、语言、主题 |
| `index.html` | 加 1 行 `<script src="js/ai.js">`（须在 app.js 之前）；utility 菜单（`utilityPanel`）在 langBtn 后、syncBtn 前加 `#aiBtn`；仿 `syncModal` 加 `aiModal` | 不改动现有 sync 结构 |
| `src-tauri/src/ai.rs` | 新建 | `#[tauri::command]` 四个函数；配置读写复用 `sync.rs` 的 `config_path()` 思路 |
| `src-tauri/src/main.rs` | 注册 4 个 command | 在 `generate_handler!` 追加，顺序无关 |
| `js/i18n.js` | zh / en 各加一组 `ai*` 键 | 保持双语同步 |
| `css/` | 加 AI 面板样式 | 复用现有 modal / field 类；跟随日间/夜间主题 |

图标统一用项目内已有的 Lucide 图标集（`<svg><use href="#i-…"/>` 形式），不引入新图标库。

---

## 3. 六种能力的操作流程

| 能力 | 用户操作 | 请求携带的上下文 | 输出处理 |
|---|---|---|---|
| 1 智能改写 | 选中文本 → 右键菜单/浮动栏 → 选动作（润色/精简/扩写/口语化/正式化/纠错/转小标题） | 选中文本 + 当前主题名 + systemPrompt；**不含全文** | 结果以 diff 预览，用户「替换 / 放弃 / 再生成」 |
| 2 AI 续写 | 空行输入 `/ai` 或按 `Alt+Space` → 输入提示 → 生成 | 光标前 800 字 + 提示 + 文档标题 | 插入光标处，Markdown 原样（不转义）；支持继续生成 |
| 3 全文助手 | 顶部「AI」→ 选动作（标题候选/摘要/SEO 关键词/大纲提炼/公众号导语） | 全文纯文本（去 front matter）+ 目标平台提示词 | 结果进侧栏可复制；标题候选可一键设为文档标题 |
| 4 翻译 | 选中 → 「翻译」子菜单选目标语言；或全文助手 → 整篇翻译 | 选中文本或全文 + 目标语言 | 保留 `#`、`**`、代码块、链接；新建「译文」文档而非覆盖原文 |
| 5 自定义指令 | AI 面板 →「指令库」→ 新建（名称 + prompt + 适用动作）→ 存本机 | 用户 prompt 作为 systemPrompt 注入 | 指令在改写/续写菜单中按名称出现，可编辑删除 |
| 6 排版诊断 | 全文助手 →「排版诊断」 | 文稿标题层级 + 字数分布 + 当前主题 CSS 片段 | 输出建议清单（如「H2 下连续 5 个 H4，建议补 H3」），不自动改稿 |

**流式输出**：P0 先做非流式（整段返回），P1 加 SSE 流式（Rust reqwest `bytes_stream()` → Tauri event；网页版 `ReadableStream`）。流式是体验优化，不是 P0 阻塞项。

**失败与降级**：请求失败 / 超时 / Key 无效 → toast 明确原因 + 「去设置」入口；**不阻断本地写作与导出**。断网时 AI 面板提示「AI 为可选功能，断网不影响写稿与导出」。

---

## 4. 成本、隐私与文案红线

### 成本

- 无应用自身订阅或额度；消耗用户所选服务商的 Key 额度。
- 面板显示本次估算 token（粗算：中文字数 ÷ 1.5 + 英文单词数），并注明「以服务商计费为准」。
- 单次请求上限：`maxTokens` 默认 2048；全文动作先做长度检查，超长提示用户分段（避免误烧额度）。

### 隐私（必须写进 AI 设置面板与官网 FAQ）

- 调用 AI 时，**所选文本 / 全文会发送给你自己配置的服务商**；应用不中转、不留存。
- Key 只存本机配置（`app_config_dir/ai-config.json` 或网页版 localStorage），不随文稿同步上传。
- 未开启 AI 时，应用自身的联网功能仍仅为「检查更新与账号登录」（沿用 `POSITIONING.md` 表述）。
- 服务商的数据使用条款由服务商决定，启用前请自行确认。

### 文案红线（check-ai-files.py 需同步加断言）

- 禁：「零上传 / 不联网 / 不发起任何网络请求 / 零依赖」等绝对化表述。
- 「断网可用」保留，且需补一句「AI 为可选增强，开启后需联网」。
- 未上线能力一律写「规划中 / 即将上线」；P0 未发布前，官网不得出现「已支持 AI 写作」。

---

## 5. 分期路线图

| 阶段 | 交付 | 验收标准 | 前置条件 |
|---|---|---|---|
| **P0 基础 + 核心写作** | ai.js / ai.rs / aiModal；改写、续写；OpenAI 兼容预设；非流式 | 桌面与网页均可用自带 Key 完成改写与续写；不开启 AI 时全链路行为与 v0.1.6 一致 | Key 安全存储、超时处理、i18n 双语 |
| **P1 成稿加工** | 全文助手、翻译；流式输出；token 估算 | 整篇摘要/标题/关键词可用；翻译保留 Markdown 结构；流式不卡顿 | P0 |
| **P2 个性化** | 自定义指令库、排版诊断；更多服务商预设 | 指令可增删改并作用于改写/续写；诊断建议可读且不自动改稿 | P1 |
| **P3 待评估** | 术语表/风格指南注入（写稿一致性）、AI 辅助的公众号摘要与封面文案 | 视 P0–P2 使用数据再定 | 用户反馈 |

---

## 6. 风险与对策

按严重程度分级。**最大的风险不是技术，是定位认同**——本产品因「本地优先、断网可用」被选择，AI 一旦让用户觉得「偷偷联网/文稿外流」，伤害远超功能收益。

### 高风险

| 风险 | 判断 | 对策 |
|---|---|---|
| 定位认同冲突 | 老用户可能把「加入 AI」等同于产品变质，即使 AI 默认关闭 | AI 默认关闭、入口不占主界面；官网 FAQ 用词严格区分「应用自身可选联网」与「你主动开启的 AI」；发布说明强调「不开启与 v0.1.6 行为一致」 |
| AIGC 内容标识合规 | 《人工智能生成合成内容标识办法》2025-09-01 已施行。直接义务主体是模型服务商（隐式标识）与传播平台（微信等）；UNOEditor 是本地工具、非生成服务提供者，**不是直接义务主体**。但用户把 AI 生成稿发到公众号时，平台要求发布者主动声明 | 不自动往文稿里插「AI 生成」字样（会破坏排版稿）；在 AI 结果插入后给一次性轻提示「发布到平台时请按平台规则声明 AI 辅助」。文案避免「生成即合规」的误导。依据：中国政府网解读 https://www.gov.cn/zhengce/202503/content_7014281.htm 、新华网平台细则 https://www.news.cn/tech/20250909/fb164c6d092146aa8e13ddc283fe416a/c.html |
| Key 泄露 | 网页版 Key 存浏览器本地，存在 XSS/同源脚本读取风险；桌面版配置是明文 JSON | 只存本机、掩码显示、不写日志、不进 URL；网页版明确提示「浏览器本地存储的风险，公共设备慎用」；桌面版依赖本机账户隔离。不承诺「绝对安全」 |
| 用户误烧额度 | BYOK 无应用额度上限，长文全文动作可能一次消耗大量 token；用户可能误以为免费 | 请求前显示估算 token 并注明「以服务商计费为准」；`maxTokens` 默认 2048；全文动作超长先提示分段；不提供「一键处理整个文档库」类入口 |
| 输出污染文稿 | 模型常返回 ```` ```markdown ```` 包裹、错误标题层级或不完整片段，直接插入会破坏排版 | systemPrompt 约束「只输出 Markdown 正文」；插入前做轻量清洗（剥离围栏、首尾空白）；保留 undo；diff 预览后才替换 |

### 中风险

| 风险 | 对策 |
|---|---|
| 网页版 CORS 受限 | 多数模型 API 不允许浏览器直连。明确标注「网页版需服务商支持跨域，否则请用桌面版」；不把网页版列为 P0 验收阻塞 |
| 各家协议差异 / 服务商改接口 | 统一 OpenAI 兼容层；预设只填 URL+Model，不硬编码厂商 SDK；「测试连接」提前暴露失效预设 |
| 流式实现复杂 | P0 只做非流式；P1 再上 SSE（Rust `bytes_stream()` → Tauri event / 网页 `ReadableStream`），两套实现分开验收 |
| 长文本超时 / 大请求失败 | `requestTimeoutMs` 默认 30s 可配；全文动作先做长度检查；失败保留已输入内容，不清空编辑器 |
| 文案与官网断言冲突 | `check-ai-files.py` 现有约 127 项断言含禁词表，AI 文案必须同步加断言并全站对齐；发版清单涉及 `docs/` 多页、JSON-LD、sitemap，逐一核对 |
| 范围蔓延 | 六大能力分 P0–P2，P0 只做改写+续写；「按能力绑定档位」等延后到 P2，避免设置面板过载 |

### 低风险 / 工程事项

| 风险 | 对策 |
|---|---|
| 旧 WebView 兼容 | 项目历史上有 WKWebView/Safari<16.4 语法兼容问题；`js/ai.js` 提交前用 `jsc -e "var window=this; load('js/ai.js')"` 做语法检查，避免新语法拖累旧环境 |
| 与现有未提交改动混杂 | 工作区已有 docs/、index.html、js/themes.js、check-ai-files.py 等改动；实施前先处理，避免 AI 功能 diff 与之纠缠 |
| 预设被误读为推荐背书 | 设置面板注明「服务商由你选择，费用与条款遵循其协议」；预设按字母序或中性排序，不做优劣暗示 |

---

## 7. 参考来源

**Notion AI 官方帮助中心（抓取 2026-11-23）**

- What is Notion AI（能力总览、AI 区块、翻译、设置项）：https://www.notion.com/help/notion-ai-faqs
- Notion Agent（多步任务、权限、模型选择）：https://www.notion.com/help/notion-agent
- Get started with your Notion Agent：https://www.notion.com/help/guides/get-started-with-your-personal-agent-in-notion
- Getting started with skills（可复用指令、本地导出）：https://www.notion.com/help/guides/getting-started-with-skills-in-notion
- Everything you can do with Notion AI：https://www.notion.com/help/guides/everything-you-can-do-with-notion-ai
- Enterprise Search / 会议记录：https://www.notion.com/help/enterprise-search 、 https://www.notion.com/help/guides/preserve-perfect-meeting-memory-with-ai-meeting-notes

**本项目内事实来源**

- `POSITIONING.md` v2（定位与文案红线）
- `src-tauri/src/main.rs`（command 注册）、`src-tauri/src/sync.rs`（配置存储路径与结构、reqwest 依赖）
- `js/sync.js`（设置面板与 hooks 模式）、`js/i18n.js`（双语键）、`index.html`（脚本顺序与 modal 结构）
