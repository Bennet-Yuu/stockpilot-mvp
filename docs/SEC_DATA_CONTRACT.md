# SEC 数据契约

## Snapshot

`GET /api/sec/snapshot/:ticker` 返回经过 Zod 校验的 `SecCompanyFinancialSnapshot`：

```text
{
  ticker, cik, companyName,
  identity: { ticker, cik, legalName, exchanges, sic?, sicDescription?, fiscalYearEnd? },
  metrics: Record<MetricName, { metric, status, latest?, annualHistory[], warning? }>,
  annualHistory: [{ fiscalYear?, periodEnd, revenue?, netIncome?, operatingCashFlow?, freeCashFlow? }],
  recentFilings: [{ accessionNumber, form, filingDate, reportDate?, primaryDocument, sourceUrl }],
  sourceMode: live | cached | stale-cache | sample | unavailable,
  status: success | cached | fallback | partial | not-configured | rate-limited | unavailable | invalid-ticker,
  fetchedAt, asOf, warnings[]
}
```

`MetricName` 为 Revenue、Operating Income、Net Income、Operating Cash Flow、Capital Expenditure、Free Cash Flow、Assets、Liabilities、Cash and Cash Equivalents、Diluted EPS。

## Provenance

每个 `latest`/annual fact 包含：`taxonomy`、`concept`、`unit`、`form`、`filedAt`、`periodStart?`、`periodEnd`、`fiscalYear?`、`fiscalPeriod?`、`accessionNumber`、`sourceUrl`、`periodKind`。派生 FCF 额外包含 `derivedFrom` 两条 provenance，便于 UI 和测试解释计算来源。

## 状态和错误

- `live/success`：本次读取并通过 schema；`partial`：部分 concept 不可用。
- `cached/cached`：仍在 TTL 内的服务端快照。
- `stale-cache/fallback`：刷新失败但展示旧快照。
- `sample/not-configured`：没有 User-Agent，不发 SEC 请求。
- `sample/rate-limited` 或 `sample/unavailable`：live 请求失败后的安全 fallback。
- `invalid-ticker`：ticker 不在 AAPL、MSFT、NVDA、AMZN、TSLA 白名单。

HTTP route 使用 400 表示 ticker 错误、200 表示有 snapshot（包括 fallback）、503/502 表示没有安全数据或响应校验失败。route 只返回简洁错误，不返回原始异常和 stack。

## 数据分类

- SEC source fact：身份、申报、XBRL fact 及 provenance。
- User input：watchlist、Checklist、paper trade、Journal。
- System calculation：Research Profile、Buy Readiness、portfolio ledger、Insights 和 FCF 推导。
- Sample market/scenario：模拟价格、市场指标、研究报告和看多/看空情景。

SEC snapshot 不改变本地 `localStorage` v2 用户数据，也不作为任何交易执行依据。
