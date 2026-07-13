# StockPilot UI 规格

## 1. 视觉方向

现代、克制、研究导向的金融工作台。主色使用低饱和深绿，表达审慎与稳定；红色仅用于亏损或风险提示，绿色仅表示正值或流程完成，不承担买卖信号含义。界面英文，文档中文。

### 设计令牌

- Light background `#F4F6F3`，surface `#FFFFFF`，text `#17221D`，muted `#66736D`。
- Brand `#176B51`，navigation `#10251E`，warning `#9A6518`，risk `#A34A4A`。
- Dark background `#0F1714`，surface `#17211D`，text `#ECF2EF`。
- 字体：Geist；数字默认等宽对齐；标题轻微负字距。
- 圆角：卡片 14–16 px，输入 8–10 px，状态徽标全圆角。
- 间距：以 4 px 为基数；页面主间距 16/24/32/40 px。

## 2. 全局结构

- Desktop：244 px 左侧固定导航 + 72 px 粘性顶栏 + 内容区。
- Tablet：侧栏缩至 205 px；四列指标变两列。
- Mobile：隐藏侧栏，60 px 顶栏 + 67 px 固定底部导航；内容左右 15 px。
- 顶栏：全局股票搜索、主题切换、Demo 用户头像。
- 全局 Demo banner：始终位于顶栏下，明确无真实资金与真实市场数据。
- 页脚：研究/模拟交易免责声明及样本数据声明。

## 3. 数据来源视觉语法

- `Source fact`：蓝色描边 badge，表示来自行情、财报或原始来源的数据；当前均为模拟。
- `Your input`：琥珀色 badge，表示用户主动填写。
- `System calculation` / `System summary`：绿色 badge，表示规则计算或聚合推断。
- `Scenario, not forecast`：用于 Bull/Bear，避免被理解为预测。

工程实现中每个数据对象均应带 `data_kind`，组件不得仅凭字段名猜测来源。

## 4. 页面详细设计

### Dashboard

- 首屏焦点为深色研究搜索区，文案 `What company do you want to understand?`。
- 搜索下方展示五个演示 ticker 快捷入口。
- 四张指标卡：Paper portfolio、Total return、Open positions、Watchlist。
- 下半区左侧为 Open positions 表，右侧为 Decision queue。
- 底部 Process reminder 强调「上涨不是 thesis」。

### Stock Detail / Research Snapshot

- 顶部：公司身份、模拟价格/日涨跌、Watchlist 与 Checklist 按钮。
- 二级 tab：Research Snapshot / Full Research Report。
- Score 卡左侧为总分环形图，右侧为五维分项、权重、进度和解释。
- 12 个月图使用纵向条形趋势，hover 显示月度样本价；避免使用红绿面积暗示交易时机。
- Key metrics 按 4×2（移动端 2×4）布局。
- 业务介绍以一段通俗英文呈现。

### Research Report

- 顶部使用琥珀色 Demo analysis 声明。
- Desktop 左侧为粘性章节目录，右侧为正文；Mobile 隐藏目录。
- Bull 和 Bear 采用同等字号、间距和结构，分别使用低饱和绿色/红色左边线。
- 每个章节提供编号，支持锚点跳转。

### Watchlist

- 表格列：Company、Sample price、Target watch price、Reason、Status、Remove。
- 目标价、理由、状态可原位编辑；hover 仅改变背景，不出现交易信号。
- 空状态应提供 `Search a company` 主按钮及「自选不等于推荐」说明。

### Buy Checklist

- 两栏：左侧 9 项表单，右侧粘性 Score、Warnings、Data clarity；移动端单列。
- Readiness 数字为 50 px，紧邻评分含义和规则说明。
- Warning card 仅在风险触发时转为琥珀背景，使用完整句子给出原因。
- Create Paper Trade 为唯一主按钮；分数不足时 toast 提示并保留输入。

### Paper Portfolio

- 顶部四个组合指标。
- Positions 表展示成本、现值、收益率、权重、风险计划及 Close & reflect。
- Thesis Monitor 将原始 thesis 与 invalidation 并列，避免只看盈亏。

### Trade Journal

- 左侧关闭交易选择器，右侧完整复盘表单。
- 错误类型使用可多选 chips；选中时用低饱和风险色。
- `Was the original thesis correct?` 与 `Was the process correct?` 分开。

### Insights

- 顶部四指标；中部用水平条展示持有期、仓位区间表现。
- 最佳流程与常见错误使用同等尺寸卡片，避免只强调收益。
- 始终展示 Small sample warning。

## 5. 交互状态

- Hover：按钮亮度或边框变化，表格行背景轻微变化。
- Focus：品牌色 3 px 外环；所有可点击元素可用键盘到达。
- Loading：卡片内 skeleton，不隐藏 Demo banner 和免责声明。
- Error：说明发生什么、数据是否保留、如何重试；不把第三方错误码直接暴露给新手。
- Empty：说明为什么为空，并提供一个下一步主操作。
- Toast：右下角 2.6 秒；移动端位于底部导航上方。

## 6. 文案规范

- 使用 `sample price` 而非 `live price`。
- 使用 `evidence score` 而非 `rating` 或 `recommendation`。
- 使用 `paper trade` 而非 `order`。
- 使用 `target watch price` 而非 `buy trigger`。
- 风险提示给出可验证原因，不使用恐惧或兴奋文案。
- 必须保留：`Demo analysis based on sample data. Not investment advice.`

## 7. 可访问与验收

- 正文最小 12 px，辅助信息最小 9 px（正式版建议提升到 11 px）。
- 输入控件均有显式 label；图表同时提供文字数据或表格替代。
- 390 px 下主流程不溢出视口；宽表允许水平滚动。
- 主题切换后所有文字、边框、正负值和警告保持可辨识。
