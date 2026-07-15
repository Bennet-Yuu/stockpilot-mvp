# StockPilot 0.3 架构

## 产品边界

StockPilot 是美股研究教育、买入检查、模拟交易和复盘工具。没有真实券商、真实资金、自动下单、期权、加密货币、实时新闻、价格预测、收益承诺或个性化投资建议。Sample market、Research Profile、Research Report 和初始交易数据都明确标记为 Demo/Sample；SEC 只提供可追溯的官方 source facts。

## 分层

### Domain

`app/domain/` 只放可测试纯函数：portfolio ledger、Buy Readiness、Research Profile、Dashboard Decision Queue、Insights、draft 隔离与领域模型。SEC fact 不进入这些计算；FCF 推导虽由 SEC normalizer 完成，仍保留来源并只作为显示事实。

### Providers

- `app/providers/marketData.ts`：五只股票的 Sample prices/fundamentals。
- `app/providers/research.ts`：结构化 Sample research report。
- `app/providers/filings.ts`：0.2 Mock filing provider。
- `app/providers/sec/`：0.3 server-only SEC provider。`client.ts` 做请求边界，`schemas.ts` 做 Zod 校验，`normalize.ts` 做事实选择和 provenance，`cache.ts` 做 TTL/stale cache，`sample.ts` 做无配置 fallback。

### Persistence

`app/storage/` 通过 Zod 维护 localStorage v2，用户的 Watchlist、Checklist、Trade、Journal 和 ledger 均只存在本地。SEC 快照是服务端内存缓存，不写入用户 localStorage，也不覆盖用户输入。

### Server boundary

`app/api/sec/` 是 SEC 唯一入口：

- `/api/sec/snapshot/:ticker` 返回统一 `SecCompanyFinancialSnapshot`。
- `/api/sec/company/:ticker` 返回身份。
- `/api/sec/filings/:ticker` 返回最近 10-K/10-K/A/10-Q/10-Q/A/8-K。

Route 只接受五个白名单 ticker，使用 typed errors 和安全 HTTP 错误；不返回 stack、原始响应或秘密环境变量。浏览器 `SecSnapshotPanel` 只 fetch 同源 API，不能直接请求 SEC。

## SEC 安全与新鲜度

`SEC_USER_AGENT` 未配置时 provider 直接返回 sample `not-configured`，不发网络请求。配置后默认 5 req/s（强制不超过 10）、最多两次重试、超时、8 MB 响应上限、JSON/Zod 校验和 bounded fallback。缓存条目包含 key、storedAt、expiresAt、source、value；刷新失败时优先 stale cache，其次 sample fallback，并在 warnings 中说明。

## 数据分类与 UI 隔离

- Source fact：SEC identity、filing、Company Facts、as-of、filed date、source URL。
- User input：Watchlist、Checklist、Paper Trade、Journal。
- System calculation：Research Profile、Readiness、portfolio、Insights、FCF derived value。
- Scenario/sample：价格、市场指标、研究报告和看多/看空情景。

Stock detail 将 SEC panel 放在 Sample fundamentals 之后，保留 Research Profile 的独立评分和 Momentum excluded 说明。任何 SEC 数据都不改变模拟价格、研究评分、买入按钮、交易数量或收益统计。

## 验证与降级

单元测试使用 `tests/fixtures/sec/` 离线 fixture 和注入 transport，禁止常规测试访问网络。CI/本地验证顺序为 lint、typecheck、unit/render tests、production build 和 dependency audit。无 User-Agent 的浏览器 smoke test 必须能完整打开 Demo，并显示可理解的 SEC fallback 状态。

## 0.3 release hardening

发布前验证由 `.github/workflows/ci.yml` 固定为 pnpm frozen lockfile、lint、strict typecheck、离线 test、production build 和 production dependency audit。CI 不注入 SEC User-Agent，也不会执行 live smoke。

`pnpm test:sec-live` 是显式、人工触发的五 ticker 验证命令；它只输出状态、内容长度/读取字节数和不可用计数，不打印 User-Agent 或完整 SEC JSON。没有真实联系邮箱时命令明确退出为 skipped，必须由部署环境补充后再运行。

## 0.4 AI provider boundary

`app/providers/ai/` 是独立的 server-side research layer。`evidence.ts` 从 SEC snapshot 纯函数构建 `ResearchEvidenceBundle`；它拒绝 sample/unavailable sourceMode，只保留 available facts、deterministic trends、filing metadata 和唯一 `sourceId`。`client.ts` 是唯一 OpenAI SDK 入口，使用 Responses API Structured Outputs、`store:false`、固定 timeout 和有限重试；`provider.ts` 不被 UI 直接调用，route 只通过 `ResearchAssistantProvider` 接口调用。

`grounding.ts` 在 Zod 解析后检查引用存在性、同 ticker、SEC URL、金额/年份、禁止内容和 system-derived FCF provenance。失败结果不进入 cache，也不返回部分文本。`cache.ts` 使用 ticker/evidenceHash/language/promptVersion/model/question hash；`rateLimit.ts` 是 Worker isolate 内存中的成本保护，不是认证边界。

`/api/ai/research/:ticker` 只接受语言、500 字符以内问题和 regenerate 标记；`/api/ai/health` 只返回安全诊断。Worker 通过 `setServerRuntimeConfig` 在 request time 注入 AI allowlist，绝不把整个 env 传入应用。AI 结果与 SEC panel、Sample market、Research Profile、账本、Checklist、Journal 和 Insights 在 UI 与数据层保持分离。
