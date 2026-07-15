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
- [x] 0.3 SEC live smoke 已由部署环境完成；真实 User-Agent 仍不提交到本仓库。

## 0.4 — Source-Grounded AI Research Assistant（进行中）

本版本只提供用户主动触发、只读 SEC 证据的结构化研究简报；不计算账本、不改变风控、不生成 Strong Buy/Sell、不预测价格、不补造事实。

## 0.5 — 可选账户同步（未开始）

可选注册、云端同步、冲突检测和导入导出仍不在 0.4；任何后续版本仍不得扩展到真实交易或自动下单。

## 发布门槛

每个版本必须通过 TypeScript strict、lint、unit/render tests、production build 和 audit；外部数据必须有官方来源、as-of、可追溯链接、失败 fallback 和无密钥 Demo 路径。

## 0.4 当前状态（进行中）

- [x] 受控的用户主动触发 AI Research Assistant。
- [x] SEC-only Evidence Bundle、deterministic trends 和唯一 sourceId。
- [x] Responses API Structured Outputs、Zod schema 和 grounding validator。
- [x] 无 API key fallback、服务端 cache、rate limit 和 Worker request-time config。
- [x] 中英文、浅色/深色、键盘/屏幕阅读器状态和移动端 AI panel。
- [ ] 配置真实 OpenAI secret 后执行显式 `pnpm test:ai-live`（不进入普通 CI）。
- [ ] 完成本地回归、分支推送和 Draft PR review。

0.3 的 SEC live smoke 已在发布基线完成；本版本不再把它标记为 pending。0.4 仍不接入交易、实时行情、新闻、Supabase 或账户同步。

## 0.5（未开始）

可选账户同步、云端数据和冲突检测仍不在 0.4 范围内。
