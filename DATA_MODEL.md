# StockPilot 数据模型

## 1. 建模原则

所有研究数据必须显式保存来源与类型，避免把事实、用户输入和推断混成一个字段。金额使用最小货币单位或高精度 decimal；比例以 decimal 存储（例如 0.15 表示 15%）；时间统一 UTC，展示时按用户时区转换。

## 2. 核心枚举

```ts
type SupportedTicker = "AAPL" | "MSFT" | "NVDA" | "AMZN" | "TSLA";
type DataKind = "SOURCE_FACT" | "USER_INPUT" | "DETERMINISTIC_CALC" | "INFERRED_SCENARIO";
type WatchStatus = "RESEARCHING" | "WATCHING" | "READY_TO_BUY" | "AVOIDING";
type TradeStatus = "DRAFT" | "OPEN" | "CLOSED" | "REVIEWED";
type ProcessAnswer = "YES" | "PARTLY" | "NO";
type ThesisAnswer = "YES" | "MOSTLY" | "NO" | "TOO_EARLY";
```

## 3. 实体

### `companies`

| 字段 | 类型 | 说明 |
|---|---|---|
| ticker PK | text | 服务端白名单校验 |
| name | text | 公司名 |
| sector | text | 行业 |
| description | text | 业务介绍 |
| investor_relations_url | text | 公司原始投资者关系页 |
| sec_cik | text | SEC CIK，保留前导零 |

### `market_snapshots`

`id`, `ticker`, `as_of`, `price`, `day_change_pct`, `market_cap`, `pe`, `forward_pe`, `revenue_growth_pct`, `net_margin_pct`, `free_cash_flow`, `week_52_high`, `week_52_low`, `currency`, `is_demo`, `source_url`, `source_name`。

### `price_points`

`ticker`, `date`, `close`, `currency`, `is_demo`, `source_url`。联合主键 `(ticker, date)`。

### `research_scores`

`id`, `ticker`, `as_of`, `total_score`, `methodology_version`, `is_demo`。

### `research_score_components`

`score_id`, `dimension`, `points`, `max_points`, `explanation`, `data_kind`。`dimension` 限定 Financial Quality、Growth、Valuation、Risk、Momentum；服务端约束总满分为 100。

### `research_reports`

`id`, `ticker`, `generated_at`, `methodology_version`, `disclaimer`, `is_demo`。

### `research_sections`

`report_id`, `section_type`, `sort_order`, `body`, `data_kind`。章节枚举与产品规格九节一致。

### `sources`

`id`, `report_id`, `source_type`（SEC_FILING / COMPANY_IR / NEWS / MARKET_DATA）、`title`, `publisher`, `published_at`, `source_url`, `accessed_at`。任何 SEC 与新闻条目必须指向原文。

### `watchlist_items`

`id`, `user_scope`, `ticker`, `target_watch_price`, `reason`, `status`, `created_at`, `updated_at`。`(user_scope, ticker)` 唯一。

### `buy_checklists`

`id`, `ticker`, `status`, `buy_reason`, `expected_holding_period`, `thesis_invalidation`, `max_acceptable_loss_pct`, `portfolio_weight_pct`, `buy_driver`, `major_event_status`, `target_price`, `exit_plan`, `readiness_score`, `score_version`, `warnings_json`, `created_at`, `updated_at`。

所有主观字段 `data_kind = USER_INPUT`；score 与 warnings 为 `DETERMINISTIC_CALC`。

### `paper_trades`

`id`, `checklist_id`, `ticker`, `status`, `buy_price`, `shares`, `trade_date`, `position_size`, `target_price`, `max_acceptable_loss_pct`, `investment_thesis`, `thesis_invalidation`, `expected_holding_period`, `sell_price`, `sell_date`, `created_at`, `updated_at`。

Cost basis、Current value、P/L、Return %、Portfolio weight 默认按查询时计算，避免持久化陈旧派生值；如需快照，写入独立 `portfolio_snapshots`。

### `trade_journals`

`id`, `trade_id` UNIQUE, `buy_reason`, `sell_reason`, `emotional_state`, `what_went_well`, `what_went_wrong`, `thesis_correct`, `process_correct`, `lessons_learned`, `completed_at`, `updated_at`。

### `journal_mistakes`

`journal_id`, `mistake_type` 联合主键。类型覆盖题目中九类错误。

## 4. 关系

```text
Company 1 ── * MarketSnapshot / PricePoint / ResearchReport
ResearchReport 1 ── * ResearchSection / Source
Company 1 ── * WatchlistItem / BuyChecklist / PaperTrade
BuyChecklist 1 ── 0..1 PaperTrade
PaperTrade 1 ── 0..1 TradeJournal
TradeJournal 1 ── * JournalMistake
```

## 5. API 契约建议

- `GET /api/stocks?q=`：只返回白名单匹配项。
- `GET /api/stocks/:ticker`：事实、走势、评分、来源元数据。
- `GET /api/stocks/:ticker/report`：报告章节与原始来源。
- `GET/POST/PATCH/DELETE /api/watchlist`。
- `POST /api/checklists/score`：服务端按版本化规则返回 score、warnings、breakdown。
- `POST/PATCH /api/paper-trades`；关闭使用 `POST /api/paper-trades/:id/close`。
- `PUT /api/paper-trades/:id/journal`。
- `GET /api/insights?min_sample=`：返回统计、样本量与口径。

统一响应带 `mode: "demo" | "live"`、`as_of` 和 `request_id`。错误结构：`{ code, message, field?, request_id }`。

## 6. 原型数据与持久化

- `app/data.ts` 保存五只股票的静态演示数据。
- 交互状态由 React 内存维护；主题使用 localStorage。
- 不存在账号隔离、跨设备同步、真实行情刷新或永久存储。
- 工程 V1 可使用 Cloudflare D1 保存 Watchlist、Checklist、Trade、Journal；市场演示数据继续由版本化 fixture 提供。
