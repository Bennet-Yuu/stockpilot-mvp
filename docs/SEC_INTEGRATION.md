# StockPilot 0.3 SEC 集成说明

## 目标与边界

0.3 只把 SEC 官方公开申报与 Company Facts 接入股票详情页，用作可追溯的事实来源。价格、涨跌幅、市值、P/E、Forward P/E、研究评分、研究报告、Checklist、Paper Trading、Journal 和 Insights 仍分别来自 Sample provider 或用户本地数据，不能把 SEC 事实混入模拟价格或 Research Profile 计算。

界面始终保留 `Demo analysis based on sample data. Not investment advice.`，SEC 面板也不产生买卖信号、价格预测或个性化建议。

## 官方端点

- ticker/CIK 映射：`https://www.sec.gov/files/company_tickers_exchange.json`
- 公司身份与最近申报：`https://data.sec.gov/submissions/CIK##########.json`
- XBRL Company Facts：`https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`

当前五个白名单 ticker 的 CIK 已由官方映射核验并静态保存在 `app/providers/sec/tickerMap.ts`。静态映射只避免每次页面加载重复读取 mapping，不允许从 ticker 猜 CIK。

## 服务端边界

浏览器只请求 `/api/sec/snapshot/:ticker`、`/api/sec/company/:ticker` 或 `/api/sec/filings/:ticker`。SEC 请求只发生在 `app/providers/sec/client.ts` 的 server provider 中，客户端 bundle 不包含 `SEC_USER_AGENT` 或 SEC data URL。

本地 `pnpm dev` 默认使用 vinext Node SSR 运行器，使 server-only provider 可以完成 SEC live smoke；生产构建仍使用 Cloudflare Worker 插件。只有需要复现 Worker 运行器时才设置 `STOCKPILOT_CLOUDFLARE_DEV=1`。

`FetchSecHttpClient` 的保护措施：

1. 每次请求带真实联系信息的 `User-Agent`、`Accept: application/json` 和 `Accept-Encoding`。
2. 缺少 `SEC_USER_AGENT` 时不发请求，返回 `not-configured` sample fallback。
3. 内存滑动窗口限速，默认 5 req/s，配置被限制在 1–10 req/s。
4. 10 秒超时、响应大小上限（默认 8 MB）、状态码和 JSON 解析保护。
5. 429、5xx、timeout/network 最多重试 2 次；403 不重试；错误为 typed `SecProviderError`，route 不向用户泄露 stack。

## 缓存和 fallback

`MemorySecCache` 保存 `{ key, storedAt, expiresAt, source, value }`。快照默认 TTL 3600 秒；新鲜缓存标记 `cached`，过期但可用的快照标记 `stale-cache`。live 刷新失败时优先使用 stale cache，否则按错误类型返回 sample 数据并显示 `not-configured`、`rate-limited` 或 `unavailable` 状态。所有 fallback 都在 warnings 中解释原因。

## 事实选择规则

- Revenue 按 `RevenueFromContractWithCustomerExcludingAssessedTax`、`Revenues`、`SalesRevenueNet` 顺序回退。
- Operating Income、Net Income、OCF 使用对应 us-gaap concept。
- CapEx 使用合理的 PPE/productive assets payment concept，并以绝对值表示现金投入。
- FCF 严格按同一年度 `OCF - CapEx` 推导，保留两条 provenance；缺一项就显示 Unavailable，不填 0。
- 年度事实要求 10-K/10-K/A、FY 或足够长的 duration；10-Q 只作为最新事实，不进入年度五年表。
- 同一期间按 accession/期间去重，修订申报使用最新 filed date；不同单位不混算。
- 每项事实保留 taxonomy、concept、unit、form、filed、期间、fiscal year/period、accession 和 source URL。

## 本地运行

复制 `.env.example` 为本地 `.env.local`，填入真实的联系 User-Agent 才会启用 live SEC 请求；不配置时完整 Demo 仍可运行且不会访问 SEC。不要提交 `.env`、真实邮箱或任何密钥。

## 0.3 发布前加固

- Company Facts 只接收 `10-K`、`10-K/A`、`10-Q`、`10-Q/A`；`8-K` 仅作为最近 filings 展示，不会进入财务指标。
- 概念按候选优先级逐期选择。高优先级概念可以覆盖同一期间，较低优先级概念只补齐较早期间；输出的年度期间不重复，并保留实际 concept。
- FCF 仅在 OCF 与 CapEx 的单位、期间起止日、财年和财季完全兼容时计算。当前只接受同一规范化单位（通常是 USD），不会把 shares 或 USDm 静默换算为 USD；缺少来源时显示 Unavailable，不填 0。
- 每个 source fact 和 system-derived FCF 都返回 `provenanceType`、单位、期间、提交日期、form、accession 和 source URL。UI 使用 `SEC source`、`SEC cached`、`Stale SEC cache`、`Sample fallback` 标签。
- 三个 SEC API route 都返回 `ticker`、`sourceMode`、`status`、`fetchedAt`、`asOf`、`warnings` 以及对应数据，并在返回前执行 Zod 校验。
- 响应大小上限默认 8 MB；HTTP client 读取流时一旦超过上限即取消 reader，避免先把超大响应完整读入内存。该上限覆盖当前五只演示股票的 SEC companyfacts payload，并可通过 `SEC_MAX_RESPONSE_BYTES` 下调。
- 普通 `pnpm test` 永远离线。只有明确执行 `pnpm test:sec-live` 才会访问 SEC；它要求 `.env.local` 中是真实、可联系的 User-Agent 邮箱，缺少时以非零状态跳过，不伪造通过。
