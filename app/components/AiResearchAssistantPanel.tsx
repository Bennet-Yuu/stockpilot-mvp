"use client";

import { useMemo, useState } from "react";
import type { Ticker } from "../data";
import { researchResponseSchema, type ResearchClaim, type ResearchResponse, type ResearchSource } from "../providers/ai/schemas";

type Locale = "en" | "zh";

const sectionLabels: Record<Locale, Array<[keyof Pick<NonNullable<ResearchResponse["brief"]>, "summary" | "financialTrends" | "strengths" | "risks" | "bullCaseConditions" | "bearCaseConditions" | "researchQuestions" | "limitations">, string]>> = {
  en: [["summary", "Summary"], ["financialTrends", "Financial trends"], ["strengths", "Evidence-backed strengths"], ["risks", "Risks to verify"], ["bullCaseConditions", "Bull case conditions"], ["bearCaseConditions", "Bear case conditions"], ["researchQuestions", "Questions to investigate"], ["limitations", "Limitations"]],
  zh: [["summary", "事实摘要"], ["financialTrends", "财务趋势"], ["strengths", "有证据支持的优势"], ["risks", "需要核验的风险"], ["bullCaseConditions", "看多情景成立条件"], ["bearCaseConditions", "看空情景成立条件"], ["researchQuestions", "后续研究问题"], ["limitations", "限制与不确定性"]],
};

const rulesQuestions: Record<Locale, string[]> = {
  en: ["Verify whether the latest annual trend is durable.", "Check that cash flow and capital expenditure use matching periods and units.", "Read the next filing for missing business and capital allocation facts."],
  zh: ["核验最新年度趋势是否可持续。", "检查现金流和资本开支是否使用一致的期间与单位。", "在下一份申报中继续研究缺失的业务和资本配置事实。"],
};

function statusLabel(status: ResearchResponse["status"], locale: Locale): string {
  const labels: Record<Locale, Record<ResearchResponse["status"], string>> = {
    en: { success: "Generated", cached: "Cached", "not-configured": "Not configured", "sec-unavailable": "SEC unavailable", "rate-limited": "Rate limited", "provider-error": "Provider unavailable", "schema-error": "Schema error", "grounding-error": "Grounding failed", refused: "Request refused" },
    zh: { success: "已生成", cached: "已缓存", "not-configured": "未配置", "sec-unavailable": "SEC 不可用", "rate-limited": "请求受限", "provider-error": "服务暂不可用", "schema-error": "结构校验失败", "grounding-error": "来源校验失败", refused: "请求被限制" },
  };
  return labels[locale][status];
}

function CitationLinks({ claim, sources, locale }: { claim: ResearchClaim; sources: ResearchSource[]; locale: Locale }) {
  const index = new Map(sources.map((source, position) => [source.sourceId, position + 1]));
  if (!claim.sourceIds.length) return null;
  return <span className="ai-citations" aria-label={locale === "zh" ? "来源引用" : "Source citations"}>{claim.sourceIds.map((sourceId) => { const number = index.get(sourceId); return number ? <a key={sourceId} href={`#ai-source-${number}`} title={sourceId}>[{number}]</a> : null; })}</span>;
}

function ClaimList({ claims, sources, locale }: { claims: ResearchClaim[]; sources: ResearchSource[]; locale: Locale }) {
  return <ul className="ai-claim-list">{claims.map((claim, index) => <li key={`${claim.text}-${index}`}><span>{claim.text}</span><CitationLinks claim={claim} sources={sources} locale={locale}/></li>)}</ul>;
}

function SourceList({ sources, locale }: { sources: ResearchSource[]; locale: Locale }) {
  const index = new Map(sources.map((source, position) => [source.sourceId, position + 1]));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const underlyingLabel = (sourceId: string): string => {
    const source = sourceById.get(sourceId);
    if (!source) return sourceId;
    if (source.metric === "Operating Cash Flow") return locale === "zh" ? "OCF 来源" : "OCF source";
    if (source.metric === "Capital Expenditure") return locale === "zh" ? "CapEx 来源" : "CapEx source";
    return source.metric ?? source.label;
  };
  return <div className="ai-source-list"><div className="section-head"><div><p className="eyebrow">SOURCES</p><h3>{locale === "zh" ? "可打开的 SEC 来源" : "Open SEC sources"}</h3></div><span className="badge fact">SEC</span></div>{sources.map((source, indexPosition) => <div className="ai-source" id={`ai-source-${indexPosition + 1}`} key={source.sourceId}><span className="ai-source-number">[{indexPosition + 1}]</span><div><b>{source.label}</b><small>{source.metric ? `${source.metric} · ` : ""}{source.form ?? "SEC identity"}{source.periodEnd ? ` · ${source.periodEnd}` : ""}{source.unit ? ` · ${source.unit}` : ""}{source.derived ? ` · ${locale === "zh" ? "系统推导" : "System-derived"}` : ""}</small>{source.derived && source.derivedFrom && source.derivedFrom.length > 0 && <div className="ai-derived-sources"><span>{locale === "zh" ? "来源链路：" : "Derived from: "}</span>{source.derivedFrom.map((sourceId) => { const number = index.get(sourceId); return number ? <a key={sourceId} href={`#ai-source-${number}`} title={sourceId}>{underlyingLabel(sourceId)}</a> : <span key={sourceId}>{underlyingLabel(sourceId)}</span>; })}</div>}</div><a href={source.sourceUrl} target="_blank" rel="noreferrer">{locale === "zh" ? "打开" : "Open"}</a></div>)}</div>;
}

export default function AiResearchAssistantPanel({ ticker, locale }: { ticker: Ticker; locale: Locale }) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [response, setResponse] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState("");
  const labels = useMemo(() => sectionLabels[locale], [locale]);

  async function generate(regenerate = false): Promise<void> {
    setState("loading");
    setError("");
    try {
      const result = await fetch(`/api/ai/research/${ticker}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ language: locale, question: question.trim() || undefined, regenerate }) });
      const payload: unknown = await result.json();
      const parsed = researchResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error(locale === "zh" ? "AI 响应无法安全解析。" : "The AI response could not be safely parsed.");
      setResponse(parsed.data);
      setState(parsed.data.status === "success" || parsed.data.status === "cached" || parsed.data.status === "not-configured" ? "ready" : "error");
      if (parsed.data.status !== "success" && parsed.data.status !== "cached" && parsed.data.status !== "not-configured") setError(parsed.data.warnings[0] ?? (locale === "zh" ? "研究简报暂时不可用。" : "The research brief is temporarily unavailable."));
    } catch (reason) {
      setState("error");
      setError(reason instanceof Error ? reason.message : locale === "zh" ? "研究简报暂时不可用。" : "The research brief is temporarily unavailable.");
    }
  }

  return <section className="card ai-panel" aria-labelledby="ai-research-title">
    <div className="section-head"><div><p className="eyebrow">AI RESEARCH ASSISTANT</p><h2 id="ai-research-title">{locale === "zh" ? "来源约束研究助手" : "Source-grounded research assistant"}</h2><p className="ai-intro">{locale === "zh" ? "只使用公开 SEC facts、年度趋势和申报元数据；不发送本地交易或复盘数据。不是投资建议。" : "Uses only public SEC facts, annual trends, and filing metadata. Paper trades and journal data are not sent. Not investment advice."}</p></div>{response && <span className={`sec-status ${response.status === "success" || response.status === "cached" ? "live" : response.status === "not-configured" ? "sample" : "error"}`}>{statusLabel(response.status, locale)}</span>}</div>
    <div className="ai-privacy-note"><span>i</span><p>{locale === "zh" ? "请求使用 store:false；不会保存完整 prompt 或回答。请勿输入个人敏感信息。" : "Requests use store:false; StockPilot does not save the full prompt or response. Do not enter sensitive personal information."}</p></div>
    <div className="ai-controls"><label htmlFor={`ai-question-${ticker}`}><b>{locale === "zh" ? "可选研究问题" : "Optional research question"}</b><small>{locale === "zh" ? "最多 500 个字符" : "Up to 500 characters"}</small></label><textarea id={`ai-question-${ticker}`} value={question} maxLength={500} onChange={(event) => setQuestion(event.target.value)} placeholder={locale === "zh" ? "例如：哪些年度趋势最需要进一步核验？" : "For example: which annual trends need the most verification?"} /><div className="ai-actions"><button className="primary" type="button" onClick={() => generate(false)} disabled={state === "loading"}>{state === "loading" ? (locale === "zh" ? "生成中…" : "Generating…") : response?.brief ? (locale === "zh" ? "重新生成简报" : "Regenerate brief") : (locale === "zh" ? "生成研究简报" : "Generate brief")}</button>{response?.brief && <button className="secondary" type="button" onClick={() => generate(true)} disabled={state === "loading"}>{locale === "zh" ? "绕过缓存" : "Regenerate fresh"}</button>}<span className="ai-char-count">{question.length}/500</span></div></div>
    <div className="ai-live-region" aria-live="polite" role="status">{state === "loading" ? (locale === "zh" ? "正在读取 SEC 证据并生成结构化简报。" : "Reading SEC evidence and generating a structured brief.") : error}</div>
    {response?.status === "not-configured" && <div className="ai-fallback"><b>{locale === "zh" ? "AI Research Assistant 未配置" : "AI Research Assistant is not configured"}</b><p>{locale === "zh" ? "SEC live 数据仍可用。下面的问题是规则化模板，不是 AI 生成内容。" : "SEC live data remains available. These rules-based questions are not AI-generated."}</p><ul>{rulesQuestions[locale].map((item) => <li key={item}>{item}<span className="badge inference">{locale === "zh" ? "规则化" : "Rules-based"}</span></li>)}</ul></div>}
    {response?.brief && <div className="ai-results"><div className="ai-result-meta"><span>{response.cached ? (locale === "zh" ? "服务端缓存" : "Server cache") : (locale === "zh" ? "本次生成" : "Generated now")}</span><span>{response.generatedAt ? new Date(response.generatedAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US") : ""}</span><span>{response.brief.model}</span></div>{labels.map(([key, label]) => <section className="ai-result-section" key={key}><h3>{label}</h3><ClaimList claims={response.brief?.[key] ?? []} sources={response.sources} locale={locale}/></section>)}<SourceList sources={response.sources} locale={locale}/></div>}
    {response?.warnings && response.warnings.length > 0 && response.status !== "not-configured" && <div className="ai-warnings">{response.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
  </section>;
}
