# StockPilot 项目约束

## 产品边界

- StockPilot 仅用于美股投资研究教育、买入检查、模拟交易和复盘。
- 禁止真实券商连接、自动下单、真实资金、个性化投资建议、收益承诺和价格预测。
- 所有五只股票数据均必须明确标记为 `Sample data` 或 `Demo mode`。
- Evidence Score 只表示结构化证据汇总；不得描述为预期收益、盈利概率或 Strong Buy。

## 技术栈

- vinext/Next.js App Router、React、TypeScript strict、Tailwind CSS、Recharts、Zod、localStorage。
- 股票数据通过 `app/providers/marketData.ts` 的 Provider 抽象访问；首版使用 MockMarketDataProvider。
- 研究内容通过 `app/providers/research.ts` 的 ResearchProvider 访问；首版使用 MockResearchProvider。
- 业务纯函数位于 `app/domain/`；浏览器存储位于 `app/storage/`，不得在组件中直接散落 `localStorage` 访问。

## 目录约定

- `app/`：页面与 UI。
- `app/domain/`：评分、组合、状态机和领域模型。
- `app/providers/`：市场数据与研究 Provider。
- `app/storage/`：版本化 localStorage 和 Zod schema。
- `tests/`：单元、渲染和关键流程测试。
- `docs/`：若引入新的产品文档，保留中文源文档并与根目录规格同步。

## 开发规则

- TypeScript 必须启用 strict；禁止显式 `any`，除非有注释解释边界。
- 统一使用货币和百分比 formatter；不要在 JSX 中重复拼接格式。
- 所有用户数据写入 localStorage 前先 Zod parse；损坏数据要回退到 demo 初始值并给出可理解的状态。
- ticker 必须使用白名单校验；无效 ticker 显示空状态，不请求外部服务。
- API key 只能出现在环境变量中；不得提交真实 `.env`。
- 修改功能后必须运行 `npm run lint`、`npm test` 和 `npm run build`。

## 命令

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

当前 Codex 桌面运行时没有全局 npm，可用等价的 `pnpm --ignore-workspace` 执行验证；面向使用者的 package scripts 保持 npm 兼容。
