# Progress

## M0 — Interactive prototype

状态：工程化增量已完成并通过验收。

- [x] 建立 vinext / Cloudflare-compatible 项目。
- [x] 完成 Dashboard、Stock Detail、Research Report、Watchlist、Buy Checklist、Paper Portfolio、Trade Journal、Insights 原型。
- [x] 支持五只股票模拟数据、浅深主题、桌面与移动布局。
- [x] 完成五份中文产品/工程文档。
- [x] Production build 通过。
- [x] TypeScript 类型检查通过。
- [x] Rendered HTML tests 通过（2/2）。
- [x] 已核对免责声明、Demo warning 与 SEC / 公司 IR source links。
- [x] 增加 App Router 深链接、Zod localStorage 校验、Mock Provider 和 Recharts 依赖。
- [x] 增加 7 个单元/关键流程测试；SSR 测试覆盖 root 和 `/stocks/NVDA`。
- [x] lint、strict TypeScript、production build 通过。
# 2026-07-13 — StockPilot 0.2 业务逻辑里程碑

- 完成模拟账户账本：买入扣现、卖出回现、已实现/未实现盈亏分离、现金校验和交易流水。
- 完成 Checklist 准入、目标仓位换算整股、确认摘要和完整决策快照。
- 完成 ticker 草稿隔离、受控 Journal、动态 Insights 和动态 Decision Queue。
- Research Evidence Score 已替换为由样例指标计算的 Research Profile，Momentum 不进入核心总分。
- 五家公司均有独立的九段模拟研究报告。
- localStorage 升级到 v2，加入 v1 迁移和安全恢复。
- 新增 Filing/User Provider 边界和研究 API Route Handler。
- 移动端开放 Insights，并改善价格、Watchlist、Portfolio 和 Report 操作。
- 验证命令：`pnpm --ignore-workspace run lint`、`pnpm --ignore-workspace test`、`pnpm --ignore-workspace run build`。
