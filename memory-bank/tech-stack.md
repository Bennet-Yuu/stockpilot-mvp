# Tech stack

- vinext / React 19 / TypeScript / Vite / Cloudflare Worker-compatible ESM。
- CSS 设计令牌与原生 HTML 控件；首版不使用重型图表库。
- pnpm 为当前本地包管理器；构建 `pnpm run build`，SSR 验收 `node --test tests/rendered-html.test.mjs`。
- 原型数据位于 `app/data.ts`；交互状态在 React 内存，主题在 localStorage。
- 未来持久化优先 Cloudflare D1，API key 仅 Worker 环境变量。
