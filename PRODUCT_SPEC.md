# StockPilot 产品规格（V1）

## 1. 产品结论

StockPilot 是面向美股新手的「研究决策工作台」。首版以结构化研究、买入前检查、模拟持仓和交易复盘串成一个闭环，帮助用户建立可解释、可复查的投资流程。产品不提供个性化投资建议，不连接券商，不预测价格，也不使用真实资金。

## 2. 背景与机会

新手常把价格上涨、社交情绪或单一指标当作买入依据，且很少在买入前记录失效条件、仓位和退出计划。现有行情产品强调信息速度，券商强调交易效率，StockPilot 的差异是把「减慢决策、记录假设、检查风险、复盘过程」做成默认流程。

## 3. 目标用户与核心任务

- 用户：刚开始投资美股、缺乏系统分析框架、容易受短期价格和情绪影响的个人投资者。
- 核心任务：在不被替代决策的前提下，形成一份有正反论据、有失效条件、有风险上限的模拟投资计划，并在交易结束后复盘过程。
- 首版成功体验：用户可在 8 分钟内从搜索一只股票走到创建一笔有完整逻辑的模拟交易；交易关闭后可在 5 分钟内完成复盘。

## 4. 产品原则

1. 过程优先：先研究，再检查，再创建模拟交易。
2. 证据分层：界面始终区分来源事实、用户输入、确定性计算和系统推断。
3. 双向论证：研究结论必须同时提供 Bull Case 与 Bear Case。
4. 风险显性：仓位、最大亏损、重大事件和失效条件是创建交易前的关键检查项。
5. 克制表达：禁止使用 Strong Buy、Guaranteed Return、胜率预测或夸张红绿信号。
6. 初学者可理解：首次出现的指标附解释；高级信息按需展开。

## 5. V1 范围与完整页面清单

| 页面/工作区 | 主要任务 | 核心内容 | 主操作 |
|---|---|---|---|
| Dashboard | 进入研究或继续未完成决策 | 组合价值、收益、持仓、自选、最近交易、决策队列、搜索 | 搜索股票、继续检查、进入组合 |
| Stock Detail / Snapshot | 理解公司与关键事实 | 基本信息、估值、增长、现金流、52 周区间、12 月图、业务介绍、五维评分 | 看完整报告、加入自选、开始检查 |
| Research Report | 建立双向研究框架 | 9 个固定章节、演示分析警告、来源入口 | 跳转章节、开始检查 |
| Watchlist | 管理研究候选 | 目标关注价、原因、状态 | 编辑、删除、打开股票 |
| Buy Checklist | 在模拟买入前检查逻辑与风险 | 9 项输入、Readiness Score、风险警告 | 创建模拟交易 |
| Paper Portfolio | 追踪模拟持仓 | 成本、现值、未实现盈亏、收益率、权重、风险计划 | 新建交易、关闭并复盘 |
| Trade Journal | 复盘结果与过程 | 买卖原因、情绪、得失、逻辑/过程判断、错误标签、经验 | 保存复盘 |
| Insights | 发现行为模式 | 胜率、平均盈亏、Profit Factor、策略、错误、持有期和仓位表现 | 回看日志 |

移动端沿用相同信息架构，底部保留 Dashboard、Watchlist、Checklist、Portfolio、Journal 五个高频入口；Insights 可从 Dashboard 或更多入口访问。

## 6. 功能规格与验收标准

### 6.1 搜索与股票详情

- 仅接受 AAPL、MSFT、NVDA、AMZN、TSLA；大小写不敏感。
- 搜索结果展示 ticker、公司名、模拟价格，选择后进入详情。
- 每只股票展示完整必需指标和近一年模拟价格图。
- 综合研究评分固定为 100 分：Financial Quality 30、Growth 25、Valuation 20、Risk 15、Momentum 10。
- 每一维必须显示得分、满分、进度和文字依据；总分明确标注为确定性证据汇总，不等同于收益预测、盈利概率或买卖信号。
- 数据标记为 Sample Market Data；研究内容标记为系统推断。

### 6.2 Research Report

- 固定章节：Company Overview、How the Company Makes Money、Bull Case、Bear Case、Key Risks、Upcoming Catalysts、Valuation Summary、What Would Invalidate the Thesis、Questions Requiring Further Research。
- 页面顶部显示原文：`Demo analysis based on sample data. Not investment advice.`
- Bull/Bear 视觉权重一致，并标记为 Scenario, not forecast。
- 未来接入 SEC 或新闻时，每条内容必须保留 `source_url` 并链接原始页面，不以聚合页替代。

### 6.3 Watchlist

- 用户可从股票详情添加；同一 ticker 不重复。
- 字段：ticker、目标关注价、关注理由、状态、更新时间。
- 状态枚举：Researching、Watching、Ready to Buy、Avoiding。
- 目标价仅为用户提醒，不触发自动买卖建议。

### 6.4 Buy Checklist 与评分

九项输入均可编辑。Readiness Score 是规则计算：

- 完整度：每项 7.78 分，合计最高 70 分。
- 失效条件：超过 20 个字符加 10 分。
- 仓位：0–15% 加 10 分。
- 最大可接受亏损：0–15% 加 5 分。
- 无重大事件临近：加 5 分。

总分上限 100。低于 60 不允许创建模拟交易；60–79 为 Proceed with caution；80–100 为 Ready for paper trade。该分数衡量计划完整性和风险纪律，不衡量股票质量。

风险警告规则：

- 未填写逻辑失效条件；
- 仓位 >20%；
- 最大可接受亏损 >20%；
- 重大事件临近；
- 买入主要由近期价格变化驱动。

### 6.5 Paper Trading

- 创建字段覆盖 ticker、买入价、股数、日期、目标价、最大亏损、投资逻辑、失效条件、持有期。
- 系统计算：Cost basis = buy_price × shares；Current value = sample_price × shares；Unrealized P/L = current value − cost basis；Return % = P/L ÷ cost basis；Portfolio weight = current value ÷ portfolio value。
- 原型从 Checklist 创建时默认 1 股、当天日期和详情页模拟价格，工程版应在确认步骤允许修改。
- 关闭仓位后写入模拟卖出价并引导 Journal。

### 6.6 Journal 与 Insights

- Journal 保存题目中要求的全部字段和九类错误标签。
- `thesis_correct` 与 `process_correct` 分开记录，避免用结果倒推过程质量。
- Insights 仅对已关闭且已完成日志的交易聚合；样本量小于 20 时显示小样本警告。
- Profit Factor = 所有盈利交易收益额之和 ÷ 所有亏损交易亏损额绝对值。

## 7. 非功能需求

- 响应式：1440、1024、390 px 三档均无关键内容截断；数据表可横向滚动。
- 主题：支持浅色/深色，用户选择保存在本地。
- 可访问性：键盘可操作，表单有 label，焦点可见，文本对比至少满足 WCAG AA；颜色不是唯一状态表达。
- 性能：首屏静态资源建议 <500 KB gzip，交互响应 <100 ms，图表不依赖大型库。
- 安全：API key 仅服务端环境变量；ticker 必须按白名单校验；日志禁止写入密钥和完整用户敏感输入。
- 降级：无 API key 时自动进入 demo mode，完整流程可用。

## 8. 明确排除

用户注册、社交、真实券商、自动下单、期权、加密货币、实时新闻、机器学习价格预测、保证收益推荐、付费系统和个性化投资建议均不在 V1。

## 9. V1 产品指标

- 北极星指标：完成「研究 → Checklist ≥60 → 模拟交易 → 关闭 → Journal」闭环的用户数。
- 激活：首次会话内完成一份 Checklist。
- 质量护栏：有明确失效条件的模拟交易占比；仓位 >20% 的创建尝试警告触达率；关闭交易的复盘完成率。
- 原型验收不以真实转化数据为准，仅验证埋点定义与流程可达。

## 10. 仍使用模拟数据的部分

- 五只股票的价格、日涨跌、估值、财务指标、52 周区间、历史走势和公司描述。
- 五维研究评分及所有解释。
- 全部结构化研究报告、催化剂、风险、失效条件与待研究问题。
- Dashboard 的组合摘要、最近交易和待处理事项。
- 初始 Watchlist、Paper Trades、Journal 和 Insights 统计。
- 组合现金余额、模拟交易成交价和卖出价。
- 原型不会发起行情、SEC、新闻、券商或用户账户请求。
