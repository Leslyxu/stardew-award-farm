# 我查过的 34 个 GitHub 现成方案

> 这次不是只搬一个 docsify。按「文档框架 / 自动化与浏览器代理 / 笔记与 Notion 替代 / 检索与 AI 流水线 / 凭据与其它」逐类查了真实仓库数据（star 数为查询当日值），下面写清楚**哪些已经用上、哪些要你本机装或授权才能用**。

## 已经用上的

| 项目 | Star | 用途 | 状态 |
|---|---|---|---|
| docsify | 31,575★ | 文档站框架 | **当前站点就是它**，左侧目录 + 右侧单页，本地化不依赖 CDN |
| Bitwarden clients | 14,149★ | 凭据自动填充 | 思路用于「账号存本机、一键填充」，账号只在你设备上 |

## 能自动填表 / 自动投稿，但要你本机运行与授权

| 项目 | Star | 能做什么 | 为什么本站没直接替你按提交 |
|---|---|---|---|
| n8n | 209,612★ | 工作流自动化（原生 AI） | 可做「通知一到自动提醒、自动整理材料」，需自建服务 |
| browser-use | 120,106★ | AI 浏览器代理 | 技术上能自动填表甚至点提交，需你的登录态 + 本机运行 |
| microsoft/playwright | 99,371★ | 浏览器自动化 | 同上，适合把重复填报写成脚本 |
| puppeteer | 95,807★ | Chrome 自动化 API | 同上 |
| SeleniumHQ/selenium | 34,577★ | 浏览器自动化框架 | 同上 |
| activepieces | 25,382★ | AI Agents / MCP 工作流 | 约 400 个 MCP 连接器，需自建 |
| automatisch | 14,009★ | 开源 Zapier 替代 | 需自建 |
| huginn | 50,291★ | 替你监控并行动的 agent | 可监控官网通知发布，需自建 |
| kestra | 30,149★ | 工作流编排 | 需自建 |

> 这一栏就是你要的「帮我自动投稿」的真实答案：工具是存在的，但它们拿不到你的登录态，赛事又要求实名 / 学校审核 / 原作寄送 / 本人原创承诺。所以本站把能自动的都做了，只留最后确认那一下。[边界说明](submit.md)

## 笔记与效率：你提到没用过的 Notion 那一类

| 项目 | Star | 是什么 | 与你有什么关系 |
|---|---|---|---|
| makenotion/notion-sdk-js | 5,681★ | Notion 官方 JS SDK | 要有 Notion 账号与授权 token 才能写入；静态网页做不到，本站给「复制即粘贴」的模板 |
| AppFlowy-IO/AppFlowy | 78,235★ | 带 AI 的项目 / Wiki / 团队空间 | Notion 开源替代，可自建 |
| toeverything/AFFiNE | 74,236★ | 文档 + 白板 + 表格一体 | Notion / Miro 的开源替代 |
| laurent22/joplin | 57,048★ | 隐私优先笔记，支持同步 | 可把备料清单同步到手机 |
| siyuan-note/siyuan | 47,086★ | 自托管知识库 | 可把教研资料沉淀成库 |
| obsidianmd/obsidian-releases | 22,948★ | Obsidian 社区插件 / 主题 | 本地 Markdown 知识库 |
| anyproto/anytype-ts | 9,050★ | 本地优先协作知识库 | 可自建 |

> 这些不是让你再去学一个新软件。我把它们的**用法结论**吸收进本站：模板一键复制、清单本机打勾、资料本机存储、凭据不进仓库。真要自动同步到 Notion / 定时提醒，需要你给我账号授权或本机跑一个自动化服务，那时我可以直接接上。

## 文档站与检索类（备选与信息源）

| 项目 | Star | 定位 |
|---|---|---|
| vuejs/vitepress | 18,463★ | Vite/Vue 静态站 |
| withastro/starlight | 9,522★ | 文档站框架 |
| assafelovic/gpt-researcher | 30,499★ | 自主深度检索 agent |
| langchain-ai/langchain | 149,080★ | Agent 工程平台 |
| FlowiseAI/Flowise | 55,553★ | 可视化搭 AI Agent |
| public-apis/public-apis | 496,291★ | 免费 API 汇总 |
| chrome-php/chrome | 2,681★ | 无头 Chrome 控制 |
| kando-menu/kando | 6,591★ | 效率启动器 |

<sub>star 数查询于 2026-11-05，来自 GitHub 官方 API；仅列查询结果有效的仓库。</sub>
