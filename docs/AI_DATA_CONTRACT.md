# StockPilot 0.4 AI 数据契约

## 请求边界

`POST /api/ai/research/:ticker` 只接受：

```json
{
  "language": "en | zh",
  "question": "optional, maximum 500 characters",
  "regenerate": false
}
```

服务端从当前 SEC snapshot 构造 `ResearchEvidenceBundle`。Bundle 只包含五只白名单股票的 SEC identity、可用 normalized facts、确定性年度趋势、最近申报元数据和 SEC 来源链接，不包含 localStorage、Paper Trades、Portfolio、Checklist、Journal、Insights、Watchlist、邮箱、IP、User-Agent 或任何 secret。

只有 `sourceMode=live|cached|stale-cache` 可以进入 AI。`sample` 与 `unavailable` 会被阻止。

## Evidence Bundle

核心字段：`ticker`、`companyName`、`cik`、`asOf`、`sourceMode`、`generatedFromSnapshotAt`、`facts`、`annualTrends`、`recentFilings`、`sources`、`evidenceHash`。

每个来源都有唯一 `sourceId`，例如：

- `sec:identity:AAPL`
- `sec:metric:Revenue:2024-12-28`
- `sec:derived:FreeCashFlow:2024-12-28`
- `sec:trend:Revenue:2024-12-28`
- `sec:filing:0000320193-24-000122`

FCF 只能由系统使用相同期间和单位的 `Operating Cash Flow - Capital Expenditure` 得出，并标记 `derived=true` 与 `derivedFrom`。缺失事实不会被替换为零。

## AI 输出

`ResearchBrief` 使用 Zod Structured Output schema，包含 `summary`、`financialTrends`、`strengths`、`risks`、`bullCaseConditions`、`bearCaseConditions`、`researchQuestions`、`limitations`、`sourceIndex`、`generatedAt`、`model` 和 `promptVersion`。

每条 `ResearchClaim` 由 `{ text, sourceIds }` 组成。事实性段落必须至少引用一个 Bundle 来源；研究问题可以没有引用，但必须与当前证据相关。

## Grounding 规则

结构化解析后还要执行确定性校验：

1. 所有 `sourceId` 必须存在于 Bundle。
2. 不允许引用其他 ticker、未知 accession、未知年份、未知金额或不存在的 SEC URL。
3. 不能把 system-derived FCF 描述为 SEC 直接披露。
4. 禁止评级、价格目标、收益率、概率、价格预测、仓位和交易指令。
5. 校验失败时不显示部分结果、不放宽规则、不缓存结果，只返回 `grounding-error`。

## API 状态

`success`、`cached`、`not-configured`、`sec-unavailable`、`rate-limited`、`provider-error`、`schema-error`、`grounding-error`、`refused`。

Response 使用 `Cache-Control: no-store`；AI cache 只在服务端内存中管理。
