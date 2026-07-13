# StockPilot 0.2 架构

## 目标与边界

0.2 的目标是让模拟账户、决策检查、复盘与统计具有可信且可测试的业务逻辑。应用不连接真实券商，不执行订单，不预测价格，也不提供个性化投资建议。没有任何 API Key 时必须完整运行。

## 四层结构

### 1. Domain Layer

- `app/domain/portfolio.ts`：买入成本、卖出收入、已实现/未实现盈亏、可用现金、组合价值、仓位、建仓计划及账户状态变更。金额计算统一保留到美分。
- `app/domain/scoring.ts`：Checklist 完整度、风险阈值、严重/一般警告和交易准入判断。
- `app/domain/researchProfile.ts`：根据模拟基础指标计算 Research Profile。Momentum 独立展示，不计入 100 分核心总分。
- `app/domain/insights.ts`：从已平仓交易和 Journal 聚合胜率、平均盈亏、Profit Factor、持有期、仓位和常见错误。
- `app/domain/dashboard.ts`：从 Watchlist、Checklist、Trade 和 Journal 生成动态待办。
- `app/domain/drafts.ts`：按 ticker 隔离 Checklist，按 tradeId 隔离 Journal。
- 状态机：Trade 从 open 进入 closed；每次状态变化同时产生不可变 buy/sell transaction。已创建交易保存 Checklist 快照，之后修改草稿不会回写历史记录。

所有金额、仓位、评分、警告和统计都是确定性 TypeScript 纯函数。LLM 不参与这些计算或状态变更。

### 2. Data Provider Layer

- `MarketDataProvider` / `MockMarketDataProvider`
- `FilingDataProvider` / `MockFilingDataProvider`
- `ResearchProvider` / `MockResearchProvider`

Provider 隔离数据来源与 UI。当前五只股票、价格、财务指标、申报文件和研究报告均为模拟数据，并在界面和接口中标记。

### 3. Persistence Layer

- `UserRepository` 定义读取和保存用户工作区的边界。
- `LocalStorageUserRepository` 是当前实现。
- localStorage 使用 Zod 验证的 `version: 2` schema。
- `migrateV1ToV2` 保留 v1 Watchlist、Trade、Checklist 和 Journal，并重建账户交易流水。旧版固定的 6,000 美元现金作为迁移后的期末现金，`initialCash` 根据历史买卖反推，以保证恢复前后组合显示连续。
- 损坏数据回退到安全的空白 v2 工作区，并向用户显示恢复提示。

### 4. Server Boundary

`app/api/research/[ticker]/route.ts` 是示范性 Next.js Route Handler：验证 ticker，调用 Mock Provider，以 Zod 验证响应，不需要密钥。未来 SEC、外部行情和 LLM 只能在服务端访问；API Key 不得进入客户端 bundle、日志或版本库。

## 未来 Provider 替换

- `SecFilingDataProvider`：服务端读取 SEC 原始文件并保留源链接。
- `ExternalMarketDataProvider`：服务端读取带时间戳的行情和基础指标。
- `OpenAIResearchProvider`：仅总结已提供的结构化数据、生成双向情景、提取风险、提出研究问题和改善用户逻辑表达。
- `SupabaseUserRepository`：登录后可选的跨设备同步。

## LLM 强制约束

未来 OpenAI Provider 不能计算盈亏、决定仓位、改变 Checklist 规则、自动下单、输出 Strong Buy/Sell、用模型记忆补充实时事实，或在没有来源时生成公司数据。它必须：

- 只在服务端运行并读取 `OPENAI_API_KEY`；
- 使用 Responses API、Structured Outputs 和 Zod 验证；
- 保存来源与 as-of date；
- 缺少 Key 或调用失败时回退 `MockResearchProvider`，并显示可理解的回退状态。

## 数据分类

- Source fact：未来由原始来源提供；当前为明确标记的 sample provider fact。
- User input：Watchlist、Checklist、Trade 决策快照和 Journal。
- System calculation：账本、Profile、风险警告、任务队列和 Insights。
- Scenario：看多/看空研究情景，不是预测或建议。
