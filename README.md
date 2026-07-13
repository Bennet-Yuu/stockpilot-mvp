# StockPilot

StockPilot 是面向美股新手的研究、买入检查、模拟交易和交易复盘 Web 应用。它帮助用户写下可验证的投资逻辑、检查风险并观察过程，不连接真实券商、不使用真实资金、不自动下单，也不提供个性化投资建议或价格预测。

## 0.3 新增

股票详情页现在有独立的 **SEC Source Facts** 面板：

- 服务端读取 SEC 官方 submissions 和 XBRL Company Facts。
- 身份、CIK、SIC、最新 10-K/10-Q/8-K、年度五年事实、filed/as-of 和原始来源链接均可追溯。
- Revenue、Operating Income、Net Income、OCF、CapEx、FCF、Assets、Liabilities、Cash、Diluted EPS 逐项显示；缺失值为 `Unavailable`，不会填 0。
- FCF 明确按同一年度 `Operating Cash Flow - Capital Expenditure` 计算并保留两条来源。
- User-Agent、限速、超时、响应大小、schema、重试、TTL/stale cache 和安全 fallback 均在 server provider 中实现。
- 没有 `SEC_USER_AGENT` 时不发 SEC 请求，仍完整运行 Sample Demo。

SEC 面板与 Sample market、Research Profile、Paper Portfolio、Checklist、Journal 和 Insights 隔离；SEC facts 不影响模拟价格、评分或交易数量。

## 启动

需要 Node.js 22.13+。当前 Codex 运行时若没有全局 npm，可用等价的 `pnpm --ignore-workspace` 命令。

```bash
npm install
npm run dev
```

浏览器打开终端显示的地址，通常为 <http://localhost:3000>。

## 启用 SEC live（可选）

复制 `.env.example` 为本地 `.env.local`，把 `SEC_USER_AGENT` 改成真实且可联系的应用名/邮箱；可按需调整 `SEC_REQUESTS_PER_SECOND` 和 `SEC_CACHE_TTL_SECONDS`。不要提交 `.env`、真实邮箱、API key、数据库密码、`node_modules`、`.next` 或 `dist`。

## 验证

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` 使用完全离线 SEC fixtures，覆盖 CIK 映射、概念回退、年度/季度筛选、修订去重、单位、FCF、请求头、限速/重试、缓存/fallback、API schema，以及 0.2 ledger、Checklist、Journal、Insights 和 HTML 渲染回归。

只有在 `.env.local` 中填写真实可联系邮箱后，才手动运行 `npm run test:sec-live`（或 `pnpm test:sec-live`）访问 SEC，验证 AAPL、MSFT、NVDA、AMZN、TSLA。没有配置时该命令会明确跳过并返回非零状态；常规 `npm test` 不访问网络。

## 目录

```text
app/
  domain/       组合、评分、风险和 Insights 纯函数
  providers/    Sample providers 与 server-only SEC provider
  storage/      Zod 校验的 localStorage v2
  api/sec/      SEC snapshot/company/filings route handlers
  components/   SEC source facts panel
  stocks/       /stocks/[ticker] 页面
  StockPilotApp.tsx 交互应用壳
tests/fixtures/sec/  离线 SEC 响应形状 fixture
docs/             产品、架构、SEC 契约和路线图
memory-bank/      项目进度与架构记忆
```

## 主要文档

- `docs/SEC_INTEGRATION.md`：端点、服务端边界、缓存、限速、归一化规则。
- `docs/SEC_DATA_CONTRACT.md`：snapshot schema、provenance、状态和数据分类。
- `docs/ARCHITECTURE_V2.md`：0.2/0.3 分层与隔离原则。
- `docs/ROADMAP.md`：版本范围和发布门槛。
- `PRODUCT_SPEC.md`、`USER_FLOWS.md`、`UI_SPEC.md`、`DATA_MODEL.md`、`IMPLEMENTATION_PLAN.md`：产品与工程规格。

## 免责声明

StockPilot is an educational research and paper-trading tool. It does not provide financial advice, personalized recommendations, guaranteed returns, or real trade execution. SEC facts are public source evidence and do not constitute a buy or sell signal.
