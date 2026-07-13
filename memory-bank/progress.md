# Progress

## 0.2 — 已完成并作为 0.3 基线

- 模拟账户 ledger：买入扣现金、平仓返还现金、realized/unrealized P/L 分离、仓位比例、现金校验。
- Checklist serious warning 阻止建仓；ticker checklist 草稿、trade journal、动态 Decision Queue/Insights。
- 五家公司独立 Sample research report；Research Profile 核心分数不含 Momentum；localStorage v2 迁移与损坏恢复。
- 英文界面、中文切换、light/dark、桌面/移动端响应式布局和 App Router 深链接。

## 0.3 — SEC 集成状态

- [x] 建立 `app/providers/sec/` server-only provider、类型与统一 snapshot contract。
- [x] 官方五 ticker CIK allow-list、submissions/companyfacts URL 和 archive source URL。
- [x] Zod 原始/最终响应校验；年度/季度识别、修订去重、单位优先级、缺失状态和 FCF provenance。
- [x] Fetch client：User-Agent、Accept、gzip、rate limit（最大 10/s）、timeout、大小限制、429/5xx/timeout bounded retry。
- [x] Memory TTL/stale cache、sample fallback、not-configured/rate-limited/unavailable/partial 状态。
- [x] Stock detail 独立 SEC Source Facts panel、身份、10 个指标、五年文本表、最近 filings、warnings 和 source links。
- [x] 离线 fixtures 和 SEC 单元测试，保留 0.2 回归测试。
- [x] `.env.example`、README、SEC integration/data contract、architecture、roadmap 已同步。
- [x] lint/typecheck/test/build 通过；`pnpm audit --audit-level high` 通过（仍有 1 个 moderate、1 个 low 的开发工具链 esbuild 提示）；browser smoke 和敏感文件审计通过。
- [ ] 提交并推送 feature 分支。

## 可验证命令

在 Codex 运行时使用：`pnpm --ignore-workspace run lint`、`pnpm --ignore-workspace run typecheck`、`pnpm --ignore-workspace test`、`pnpm --ignore-workspace run build`。SEC 常规测试不访问网络；启用 live 前必须在本地 `.env.local` 提供真实联系 User-Agent。
