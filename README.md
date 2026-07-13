# StockPilot

StockPilot 是一个面向美股新手的研究、买入检查、模拟交易和交易复盘 Web 应用。它帮助用户写下可验证的投资逻辑、控制风险并学习自己的决策过程；不连接真实券商，不执行真实订单，也不提供个性化投资建议。

## 功能

- Dashboard：模拟组合价值、收益、持仓、自选股、最近活动和股票搜索。
- Stock Detail：AAPL、MSFT、NVDA、AMZN、TSLA 的模拟价格、财务指标、趋势、研究评分和来源入口。
- Research Report：Company Overview、How the Company Makes Money、Bull Case、Bear Case、Key Risks、Upcoming Catalysts、Valuation Summary、What Would Invalidate the Thesis、Questions Requiring Further Research。
- Watchlist：目标关注价格、关注理由、Researching/Watching/Ready to Buy/Avoiding 状态。
- Buy Checklist：九项买入前检查、Buy Readiness Score 和风险警告。
- Paper Portfolio：模拟交易、成本、现值、未实现盈亏、收益率、组合权重与关闭交易。
- Trade Journal：买卖原因、情绪、逻辑/过程判断、错误标签和经验。
- Insights：胜率、平均盈亏、Profit Factor、策略、常见错误、持有期和仓位表现。
- 中英文界面：默认中文，可在顶部使用 `中文 / EN` 切换；语言偏好保存在当前设备。

## 启动

需要 Node.js 22.13+。

```bash
npm install
npm run dev
```

然后访问终端显示的本地地址，通常是 <http://localhost:3000>。

## 验证

```bash
npm run lint
npm test
npm run build
```

`npm test` 会运行评分、风险、组合、存储校验、语言偏好和关键流程测试，并检查生产构建的 HTML 是否包含免责声明、Demo warning 与原始来源入口。

## 结构

```text
app/
  domain/       评分、组合计算、模型和格式化
  providers/    MockMarketDataProvider / MockResearchProvider
  storage/      Zod schema 与版本化 localStorage
  stocks/       /stocks/[ticker] App Router 页面
  checklist/    /checklist/[ticker] 页面
  StockPilotApp.tsx 交互应用壳
  data.ts       五只股票的演示 fixture
tests/          unit、关键流程和 SSR HTML 测试
memory-bank/    产品、技术和架构记忆
```

## 架构决策

1. V1 使用 MockMarketDataProvider 和 MockResearchProvider，保证没有 API Key 也能完整运行；未来可替换 Provider，不需要重做 UI。
2. 用户行为数据使用带版本号的 localStorage，并在读取/写入时使用 Zod 校验；损坏数据会安全回退到 demo 初始值。
3. Evidence Score、Buy Readiness Score、组合派生值和 Insights 聚合都是纯函数，方便单元测试与未来服务端复用。
4. 当前原型保留一个共享应用壳，同时提供 App Router 深链接页面，降低迁移成本。
5. Recharts 依赖已纳入工程，当前轻量趋势图继续使用 CSS 以降低首屏体积；正式版可替换为可访问 Recharts 图表。

## 模拟数据与限制

- 五只股票价格、财务指标、研究报告、评分、走势、初始持仓、交易日志和统计均为模拟数据。
- 没有实时新闻、SEC 抓取、外部数据库、用户注册、社交、支付、券商 API、真实订单、期权、加密货币或机器学习预测。
- `.env.example` 只保留未来可选的服务端研究 Provider 变量；不要创建或提交真实 `.env`。

## 产品与工程文档

- `docs/`：Work 输出文档的项目副本，便于后续工程协作。
- `PRODUCT_SPEC.md`
- `USER_FLOWS.md`
- `UI_SPEC.md`
- `DATA_MODEL.md`
- `IMPLEMENTATION_PLAN.md`

金融免责声明：StockPilot is an educational research and paper-trading tool. It does not provide financial advice or execute real trades.
