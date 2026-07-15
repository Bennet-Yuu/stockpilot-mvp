# StockPilot 0.4 Source-Grounded AI Research Assistant

## 目标

0.4 在股票详情页的 SEC Source Facts 面板之后提供一个可选、用户主动触发的 `AI Research Assistant`。它把已验证的 SEC facts 整理为带引用的结构化简报，不改变 0.3 的模拟账本和风控逻辑。

## 技术实现

- 官方 `openai` JavaScript SDK 6.x。
- Responses API + `responses.parse` + `zodTextFormat` Structured Outputs。
- 每次请求使用 `store:false`，不使用 web search、file search、function calling、conversation state、previous response id、streaming 或 background mode。
- `OPENAI_MODEL` 由服务器环境变量读取，默认 `gpt-5.6`，代码中只保留一个默认值。
- `app/runtime/serverRuntimeConfig.ts` 和 Worker request-time adapter 只注入 AI allowlist 字段，不注入整个 Worker env。

## Provider 分层

`app/providers/ai/` 包含：

- `client.ts`：运行时配置和 OpenAI Responses 调用。
- `provider.ts`：OpenAI、Unavailable 和离线 Mock provider。
- `evidence.ts`：纯函数 Evidence Bundle 构建和 evidence hash。
- `schemas.ts`：Evidence、ResearchBrief 和 API response 的 Zod schema。
- `grounding.ts`：引用、ticker、URL、金额、年份、禁止内容和 FCF provenance 校验。
- `cache.ts`：服务端内存 AI response cache。
- `rateLimit.ts`：按不可逆 identifier hash 的 isolate-local 成本保护。
- `prompt.ts`：版本化 system prompt 和请求大小边界。

## API

- `POST /api/ai/research/:ticker`：用户主动生成或 Regenerate。
- `GET /api/ai/health`：只返回安全诊断，不返回 key、完整模型配置或请求体。

当 SEC 是 sample/unavailable 时不会调用 AI；没有 API key 时同样不会调用 OpenAI。所有 API response 都经过 Zod 校验，错误不返回 stack 或原始 provider error。

## UI

AI 面板与 SEC facts、Sample market data、Research Profile 分离。结果区域包含 Summary、Financial trends、Evidence-backed strengths、Risks、Bull/Bear case conditions、Questions to investigate、Limitations 和 Sources。引用编号可以跳转到含 metric/form/period/filed/source URL/derived status 的来源行。

界面支持中文/英文、浅色/深色、键盘操作、`aria-live` loading/error 状态和 390px 移动端布局。不使用聊天气泡、自动生成或打字机动画。

## 本地配置

复制 `.env.example` 为 `.env.local` 后，仅在本机或部署平台 secret 中设置：

```dotenv
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.6"
OPENAI_TIMEOUT_MS="20000"
OPENAI_MAX_OUTPUT_TOKENS="1600"
AI_CACHE_TTL_SECONDS="21600"
AI_REQUESTS_PER_MINUTE="5"
```

`.env.local` 必须保持 ignored，不能提交或打印。部署时在运行 API route 的服务器环境设置同名 secret；不要写入 GitHub 或客户端 bundle。

## 验证

普通 `pnpm test` 完全离线，覆盖 Evidence、schema、grounding、prompt injection、cache、rate limit、无 key fallback、Worker adapter 和现有 0.2/0.3 回归。`pnpm test:ai-live` 是显式人工命令，只在本地有真实 API key 时运行 AAPL 与 AMZN，并且不打印 key、prompt、Evidence 或完整 response。

已知限制：AI cache 和 rate limiter 只存在当前 Worker isolate 内存；申报正文未接入；OpenAI provider 可能受部署平台网络、模型可用性和账户限额影响；AI 输出始终需要用户打开 SEC 原始来源继续核验。
