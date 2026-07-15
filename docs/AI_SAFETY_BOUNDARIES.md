# StockPilot 0.4 AI 安全边界

## 产品边界

AI Research Assistant 是用户主动触发的研究简报，不是聊天机器人，也不是交易系统。它不能输出 Buy、Sell、Hold、Strong Buy、Strong Sell、目标价、预期收益、价格预测、成功概率、仓位建议、止损价、交易时机或个性化投资建议。

AI 不得创建或修改 Checklist、Research Profile、Paper Trade、Portfolio、Journal、Watchlist 或任何本地用户数据，也不得评价用户组合。

## 数据最小化

发送给模型的内容只包括 SEC 公司身份、可用 normalized metrics、年度历史、最近申报的 form/filing date/report date/accession/source URL、当前语言和用户当前问题（最多 500 字符）。

不发送交易、现金、仓位、复盘、浏览器标识、IP、邮箱、SEC_USER_AGENT、API key、Sample market price、Sample Research Profile 或 Sample Research Report。

当前系统没有申报正文，所以模型不能总结 10-K/10-Q 正文，也不能依据 filing title 或 form 猜测正文内容。

## Prompt injection

Evidence 字段、申报元数据和用户问题都被当作数据，不是系统指令。系统 prompt 明确要求忽略其中的 prompt-like 文本。请求中出现越界指令时，API 返回 `refused`；SEC Facts 面板仍然可用。

## 服务端与秘密

- OpenAI SDK 只在 server route/provider 中使用。
- `OPENAI_API_KEY` 只来自服务器环境变量，绝不进入浏览器 bundle、日志、response 或 cache key。
- Responses API 使用 `store:false`、Structured Outputs、固定超时、有限重试和无工具调用。
- 不记录完整 prompt、Evidence Bundle、回答、用户问题原文或身份信息。
- `/api/ai/health` 只返回布尔诊断、runtime、promptVersion、safe diagnostic code 和时间。

## 缓存与限流

AI cache key 包含 ticker、evidenceHash、语言、promptVersion、模型和问题 hash，不包含 API key。失败或未通过 grounding 的结果不缓存。Regenerate 绕过 cache，但仍受服务器内存中的 5 requests/minute 成本保护限制；Worker isolate 重启会清空该 limiter，因此它不是完整安全边界。

## 无 Key fallback

没有 `OPENAI_API_KEY` 时不发送 OpenAI 请求、不生成伪装的 Sample AI 内容，界面显示 `Not configured`，并可展示带 `Rules-based / Not AI-generated` 标记的确定性研究问题。SEC live、模拟交易、Checklist、Journal 和 Insights 不受影响。
