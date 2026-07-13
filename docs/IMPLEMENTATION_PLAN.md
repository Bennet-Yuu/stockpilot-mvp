# StockPilot V1 工程实施计划

## 1. 建议架构

- 前端：现有 vinext + React 19 + TypeScript，保持 Cloudflare Worker 兼容 ESM 输出。
- 样式：设计令牌 + 组件级 CSS；首版不引入重型 UI 或图表库。
- 服务端：vinext Route Handlers；所有 ticker、评分和交易状态变更在服务端再次验证。
- 数据：Cloudflare D1 保存设备/演示用户范围内的 Watchlist、Checklist、Paper Trade、Journal；静态 fixture 维持无密钥 Demo Mode。
- 数据源适配器：`MarketDataProvider`、`FilingProvider` 与 `DemoProvider` 共享接口。缺少密钥或上游失败时明确回退，不伪装实时。
- 隐私：V1 无注册；使用随机 `user_scope` 或本地设备 ID，不收集姓名、邮箱和真实持仓。

## 2. 开发优先级

### P0：可用闭环

1. 应用壳、响应式导航、主题、Demo banner 与全局免责声明。
2. 五只股票 fixture、搜索、详情指标、趋势图、评分拆解。
3. 结构化报告九章节、Bull/Bear 同权与来源链接模型。
4. Watchlist CRUD。
5. Buy Checklist、规则评分、风险警告与草稿恢复。
6. Paper Trade 创建、派生值计算、关闭状态。
7. Journal 保存、错误标签和 Insights 基础聚合。
8. 生产构建、SSR HTML 测试、三档响应式与键盘验收。

### P1：可靠性与可解释性

1. D1 migration、repository 层和 demo seed。
2. 表单 schema 校验、错误恢复、撤销关闭交易。
3. 来源面板、字段级 `as_of`、评分方法版本说明。
4. 可访问图表数据表、空态/加载态/错误态。
5. 产品埋点：搜索、报告阅读、Checklist 完成、警告触发、Trade/Journal 闭环。

### P2：有限真实数据试点

1. 接入一个行情/基本面提供商，密钥仅服务端。
2. SEC filings 原文链接与缓存；严格限制为用户选择的 ticker。
3. 数据新鲜度、配额、超时、重试与 demo fallback 监控。
4. 不在本阶段增加券商、自动交易或预测。

## 3. 可直接交给 Codex 的工程任务说明

```text
在当前 vinext/Cloudflare TypeScript 项目中实现 StockPilot V1。

先读 PRODUCT_SPEC.md、USER_FLOWS.md、UI_SPEC.md、DATA_MODEL.md、IMPLEMENTATION_PLAN.md 和 memory-bank/*。

约束：
1. 保持无 API key 时完整 Demo Mode；只支持 AAPL/MSFT/NVDA/AMZN/TSLA。
2. 所有 API key 只在 Worker 环境变量；ticker 在服务端用白名单验证。
3. UI 区分 SOURCE_FACT、USER_INPUT、DETERMINISTIC_CALC、INFERRED_SCENARIO。
4. Evidence Score 不是收益预测、盈利概率或买卖信号；禁止 Strong Buy / Guaranteed Return。
5. 报告必须同时含 Bull Case 与 Bear Case；SEC/新闻必须链接原文。
6. 按 P0 顺序做小提交；优先拆分 focused components、domain utilities、repositories，避免扩大单文件。
7. 实现 D1 前先写 schema/migration 和 repository contract；SSR 不直接访问 localStorage。
8. 每个里程碑运行 production build、rendered HTML tests；关键流程增加单元和集成测试。
9. 验收 built HTML 必须包含 research disclaimer、Demo Mode warning 和 original source links。
10. 完成里程碑后更新 memory-bank/progress.md 和 memory-bank/architecture.md。

第一增量：把现有原型拆成 AppShell、Dashboard、StockDetail、ResearchReport、Watchlist、BuyChecklist、PaperPortfolio、TradeJournal、Insights；把评分与组合计算移入纯函数并补单元测试，不改变视觉与文案。
```

## 4. 测试矩阵

- Unit：Evidence Score 总分/边界、Readiness Score、五类警告、成本/现值/P&L/权重、Profit Factor。
- Integration：白名单 ticker、Watchlist 去重、Checklist <60 阻止、创建/关闭交易、Journal 后状态 REVIEWED。
- SSR HTML：title、Demo banner、免责声明、来源链接、禁止文案不存在。
- Browser：桌面/移动搜索与导航、主题、表单保留、表格横向滚动、键盘焦点。
- Visual：1440×900、1024×768、390×844；浅色与深色各一轮。
- Security：客户端 bundle 不包含 API key；上游请求只能使用已校验 ticker；日志脱敏。

## 5. 里程碑与完成定义

- M0 原型：当前交互原型和文档；构建与 SSR HTML 测试通过。
- M1 Domain split：组件拆分、纯函数、单元测试；功能不回退。
- M2 Persistence：D1 CRUD、migration、demo seed；刷新后状态保留。
- M3 Data adapter：单一实时供应商试点、缓存与 fallback；字段有来源和时间。
- M4 Beta hardening：可访问性、错误恢复、埋点、性能和安全验收。

每个里程碑完成定义：代码、测试、文档、Demo Mode、免责声明和来源链接同时满足；不得仅凭开发服务器可打开就声明完成。
