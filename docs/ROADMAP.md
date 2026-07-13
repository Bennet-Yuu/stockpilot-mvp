# StockPilot 路线图

## 0.2 — 已完成

- 版本化模拟账户 ledger、买入/平仓和 realized/unrealized P/L。
- serious Buy Checklist warning 阻止交易；仓位比例转换为实际模拟股数。
- ticker checklist draft、trade journal 隔离和动态 Dashboard/Insights。
- 五家公司独立 Sample research report；Research Profile 不把 Momentum 纳入核心总分。
- localStorage v2 schema/migration、英中界面、浅色/深色模式和移动端导航。

## 0.3 — SEC facts 与 filings（当前）

- [x] 官方 ticker/CIK allow-list 与 SEC endpoint URL。
- [x] server-only submissions/companyfacts provider、Native fetch、Zod 校验。
- [x] 10-K/10-Q/8-K 过滤、年度五年选择、修订去重、单位和 provenance。
- [x] OCF - CapEx 的可解释 FCF 推导；缺失事实显示 Unavailable。
- [x] User-Agent、限速（默认 5/s、最大 10/s）、timeout、响应大小和最多两次重试。
- [x] Memory TTL/stale cache、sample fallback、rate-limited/unavailable/not-configured 状态。
- [x] 独立 SEC Snapshot panel、最近 filings、年度文字表、as-of/source links 和移动端 overflow。
- [x] 离线 fixture、transport 注入测试和 0.2 全量回归。
- [ ] 由部署环境提供真实、可负责的 SEC 联系 User-Agent 后再做 live smoke test（本仓库不提交该值）。

## 0.4 — 明确排除在本版本之外的研究助手

若未来引入 LLM，只能总结已提供且带来源的材料，不能计算账本、改变风控、生成 Strong Buy/Sell、预测价格或补造事实。0.3 不调用 OpenAI，也不需要 API key。

## 0.5 — 可选账户同步

可选注册、云端同步、冲突检测和导入导出仍不在 0.3；任何后续版本仍不得扩展到真实交易或自动下单。

## 发布门槛

每个版本必须通过 TypeScript strict、lint、unit/render tests、production build 和 audit；外部数据必须有官方来源、as-of、可追溯链接、失败 fallback 和无密钥 Demo 路径。
