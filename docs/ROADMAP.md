# StockPilot 路线图

## 0.2 — 业务逻辑可信（当前）

- 版本化模拟账户账本和买卖流水
- 可阻断严重风险的 Buy Checklist
- 完整交易决策快照
- ticker 草稿和 Journal 隔离
- 动态 Dashboard、Insights 与 Research Profile
- 五家公司独立模拟研究报告
- Provider、Repository 和 Route Handler 边界

## 0.3 — SEC 与真实数据

- 服务端 SEC Filing Provider，保留原始文件链接、申报日期和表单类型
- 服务端行情 Provider，显示数据来源、延迟和 as-of time
- 缓存、速率限制、失败回退和数据新鲜度提示
- 保留无需 Key 的完整 Demo Mode

## 0.4 — 可选 LLM 研究助手

- 服务端 OpenAI Research Provider
- Responses API + Structured Outputs + Zod
- 只处理有来源的输入，输出双向情景、风险和待研究问题
- 绝不计算账本、仓位或风险阈值，绝不产生买卖信号

## 0.5 — 账户与云端同步

- 可选注册与登录
- SupabaseUserRepository 与本地优先同步
- 冲突检测、导入导出、删除与隐私控制
- 不扩大到真实交易或自动下单

## 下一步验收门槛

每个版本继续要求 TypeScript、lint、单元测试、渲染 HTML 测试和 production build 全部通过；外部数据必须有原始来源、时间戳和无密钥回退路径。
