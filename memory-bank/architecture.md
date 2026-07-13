# Architecture

## 当前原型

- `app/page.tsx`：Server Component 页面入口与元数据。
- `app/StockPilotApp.tsx`：Client Component，承载应用壳、七个工作区和路由跳转；状态通过 storage module 恢复。
- `app/data.ts`：五只股票的版本化模拟 fixture 与类型。
- `app/globals.css`：视觉令牌、组件样式、浅/深主题和响应式规则。
- `app/domain/`：Evidence Score、Buy Readiness、组合派生值与持久化模型。
- `app/providers/`：MockMarketDataProvider、MockResearchProvider；未来可替换服务端数据源。
- `app/storage/userData.ts`：Zod schema、版本化 localStorage、主题偏好和损坏数据回退。
- `app/stocks/[ticker]`、`app/checklist/[ticker]`、`app/watchlist`、`app/paper-trades`、`app/journal`、`app/insights`：App Router 深链接页面。
- `tests/rendered-html.test.mjs`：生产 Worker 的 SSR HTML 产品护栏。
- `tests/unit.test.ts`：评分、警告、组合、Provider、存储和关键流程单元测试。

当前页面仍共享一个客户端应用壳以保持原型体验；页面级深链接已存在，下一步可继续拆成独立 UI 组件，不应把领域规则放回组件。

## 目标分层

`UI → application services → domain rules → repositories/providers`。UI 不直接判断来源或拼接上游请求；provider 负责 Demo/live 回退，repository 负责 D1，domain 负责版本化评分与状态机。

## 决策

- 单路由 SPA 状态用于本轮原型，减少部署复杂度；正式 V1 应提供可深链的多路由页面。
- 不引入图表库，以 CSS 图表降低体积；正式版必须添加无障碍表格替代。
- 原型不声明持久化能力；未来用 D1，不使用 localStorage 存金融行为记录。
