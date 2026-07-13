# StockPilot 用户流程

## 1. 主流程：从研究到复盘

1. 用户在 Dashboard 搜索 AAPL、MSFT、NVDA、AMZN 或 TSLA。
2. 系统展示 Stock Detail，并将价格和财务项标记为 Sample Market Data。
3. 用户查看五维 Research Evidence Score 的构成和解释。
4. 用户切换到 Full Research Report，同时阅读 Bull Case、Bear Case、风险、催化剂和失效条件。
5. 用户可先加入 Watchlist，设置目标关注价、理由和研究状态。
6. 用户点击 Start Buy Checklist，填写九项决策输入。
7. 系统实时计算 Buy Readiness Score 并显示风险警告。
8. 分数 <60：阻止创建并提示补充；分数 ≥60：创建模拟交易。
9. 用户在 Paper Portfolio 查看成本、现值、盈亏、收益率、权重和 Thesis Monitor。
10. 用户点击 Close & reflect，以当前模拟价格关闭仓位并跳转 Journal。
11. 用户记录卖出原因、情绪、过程判断、错误标签和经验。
12. 系统把已完成日志汇总到 Insights；小样本下持续显示警告。

## 2. Dashboard 继续任务流程

- 决策队列中的 Checklist 项 → 打开 Buy Checklist 并保留草稿。
- 估值复核项 → 打开对应 Stock Detail。
- 待复盘项 → 打开 Trade Journal 并选中最近关闭交易。
- Open positions → 打开股票详情或 Paper Portfolio。

## 3. Watchlist 流程

1. 从股票详情点击 Add to Watchlist。
2. 系统以 Researching 状态创建默认条目，默认关注价为当前模拟价格的约 92%。
3. 用户在 Watchlist 直接修改目标价、理由和状态。
4. Ready to Buy 仅表示用户自定义阶段，仍必须完成 Checklist。
5. 用户可删除条目；删除不影响已存在的模拟交易或 Journal。

## 4. Checklist 异常与边界流程

- Ticker 不在白名单：搜索不返回，服务端未来返回 `INVALID_TICKER`。
- 缺少失效条件：显示最高优先级警告。
- 仓位 >20%：显示集中度风险，不自动替用户改值。
- 最大亏损 >20%：显示风险上限警告。
- 重大事件临近：提示等待或缩小仓位，不给出自动结论。
- 近期价格驱动：提示重新补充基本面逻辑。
- Readiness <60：保留草稿并停留当前页。
- Readiness ≥60：进入可编辑的交易确认；当前原型直接以 1 股演示创建。

## 5. Paper Trade 状态流

`DRAFT → OPEN → CLOSED → REVIEWED`

- DRAFT：Checklist 通过但尚未确认。
- OPEN：创建后进入组合，持续用样本价格计算未实现盈亏。
- CLOSED：记录模拟卖出价与日期，不再计入当前组合。
- REVIEWED：Journal 保存完成，可进入 Insights 聚合。
- 首版不支持部分卖出、加仓、拆股或分红；这些作为后续扩展。

## 6. 移动端流程差异

- 顶部仅保留全局搜索、品牌和主题切换。
- 底部导航提供五个高频工作区。
- 表格保留完整列并支持水平滚动，不把核心数据隐藏为不可发现内容。
- Checklist 单列展示，评分和警告移动到表单下方。

## 7. 可恢复性

- 原型：主题保存在 `localStorage`；其他交互数据保持当前会话状态。
- 工程版：所有草稿保存到本地或 D1；网络失败时保留用户输入并显示可重试状态。
- 删除、关闭交易等影响状态的操作应在正式版增加确认或撤销入口。
