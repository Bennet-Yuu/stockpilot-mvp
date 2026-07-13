# Architecture

## 0.3 provider boundary

`app/providers/sec/` 只在 server route 中使用：

- `client.ts`：SEC URL、User-Agent、Accept headers、限速、超时、响应上限和最多两次重试。
- `schemas.ts`：SEC submissions/companyfacts 与最终 snapshot 的 Zod schema。
- `normalize.ts`：concept candidate、单位、10-K/10-Q 区分、修订去重、annual history、FCF derived provenance。
- `cache.ts`：TTL 内存 cache，保留过期条目以支持 stale fallback。
- `sample.ts`：五 ticker 的离线 fallback，保证没有 User-Agent 时不发请求。
- `provider.ts`：统一 snapshot、CIK 核验、状态与安全错误映射。

`app/api/sec/` 负责 route validation 和安全 JSON；`SecSnapshotPanel` 只能 fetch 同源 API。SEC 数据不传入 `calculateResearchProfile`、Sample market price、portfolio ledger、Checklist 或 Insights。

## data classification

SEC identity/facts/filings 是 source evidence；Watchlist、Checklist、Paper Trade 和 Journal 是 user input；Research Profile、Buy Readiness、账本、Insights 和 FCF 推导是 system calculation；价格、研究报告和 bull/bear 文字是 Sample/scenario。每个层级在 UI 上单独标记。

## verification

SEC fixtures 和 fake transport 让测试离线且可重复。没有 `SEC_USER_AGENT` 时 smoke path 必须显示 sample/not-configured，build 不依赖网络或 API key。所有用户数据仍由 localStorage v2 Zod repository 管理。
