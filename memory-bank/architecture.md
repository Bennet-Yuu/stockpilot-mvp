# Architecture

## 当前原型

- `app/page.tsx`：Server Component 页面入口与元数据。
- `app/StockPilotApp.tsx`：Client Component，承载应用壳、七个工作区和路由跳转；服务端与客户端首次渲染使用一致默认值，挂载后再从 storage module 恢复用户状态和偏好。
- `app/data.ts`：五只股票的版本化模拟 fixture 与类型。
- `app/globals.css`：视觉令牌、组件样式、浅/深主题和响应式规则。
- `app/domain/`：Buy Readiness、Research Profile、组合账本、Insights、Decision Queue、草稿和持久化模型；金额按分统一取整，领域函数保持确定性。
- `app/providers/`：MockMarketDataProvider、MockResearchProvider；未来可替换服务端数据源。
- `app/storage/userData.ts`：Zod schema、版本化 localStorage、账本与交易交叉校验、语言/主题偏好，以及损坏 v2 向有效 v1 的安全回退。
- `app/stocks/[ticker]`、`app/checklist/[ticker]`、`app/watchlist`、`app/paper-trades`、`app/journal`、`app/insights`：App Router 深链接页面。
- `tests/rendered-html.test.mjs`：生产 Worker 的 SSR HTML 产品护栏。
- `tests/unit.test.ts`：评分、警告、组合、Provider、存储和关键流程单元测试。

当前页面仍共享一个客户端应用壳以保持原型体验；页面级深链接已存在，下一步可继续拆成独立 UI 组件，不应把领域规则放回组件。价格趋势由 Recharts 呈现，并提供可访问名称、坐标值和模拟数据标记。

## 目标分层

`UI → application services → domain rules → repositories/providers`。UI 不直接判断来源或拼接上游请求；provider 负责 Demo/live 回退，repository 负责 D1，domain 负责版本化评分与状态机。

## 决策

- 单路由 SPA 状态用于本轮原型，减少部署复杂度；正式 V1 应提供可深链的多路由页面。
- 当前原型使用 Recharts 绘制单序列样例价格趋势；后续复杂图表仍应提供等价数据表。
- 0.2 明确使用带版本号和 Zod 校验的 localStorage 保存模拟交易行为；它只适用于单设备 Demo，未来账户化数据迁移需经 UserRepository 边界完成。
# 0.2 架构增量（2026-07-13）

详细设计见 `docs/ARCHITECTURE_V2.md`。当前架构新增确定性 Domain Layer（账本、Checklist、Research Profile、Insights、Dashboard、草稿隔离）、版本化 UserRepository、Mock Filing Provider 和 `/api/research/[ticker]` 服务端边界。localStorage schema 已升级到 v2，并提供不丢弃已有记录的 v1 迁移。
