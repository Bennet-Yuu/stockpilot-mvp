# Architecture

## 当前原型

- `app/page.tsx`：Server Component 页面入口与元数据。
- `app/StockPilotApp.tsx`：Client Component，承载应用壳、七个工作区、交互状态与派生计算。
- `app/data.ts`：五只股票的版本化模拟 fixture 与类型。
- `app/globals.css`：视觉令牌、组件样式、浅/深主题和响应式规则。
- `tests/rendered-html.test.mjs`：生产 Worker 的 SSR HTML 产品护栏。

当前单文件客户端是为了快速交互原型；工程化第一步必须按页面拆分组件，把 Evidence Score、Readiness、组合和 Insights 计算移到 `domain/` 纯函数。

## 目标分层

`UI → application services → domain rules → repositories/providers`。UI 不直接判断来源或拼接上游请求；provider 负责 Demo/live 回退，repository 负责 D1，domain 负责版本化评分与状态机。

## 决策

- 单路由 SPA 状态用于本轮原型，减少部署复杂度；正式 V1 应提供可深链的多路由页面。
- 不引入图表库，以 CSS 图表降低体积；正式版必须添加无障碍表格替代。
- 原型不声明持久化能力；未来用 D1，不使用 localStorage 存金融行为记录。
