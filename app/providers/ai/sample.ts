import type { Ticker } from "../../data";
import type { ResearchLanguage, ResearchResponse } from "./schemas";
import { aiPromptVersion } from "./schemas";

export function rulesBasedResearchQuestions(ticker: Ticker, language: ResearchLanguage): string[] {
  if (language === "zh") return [
    `核验 ${ticker} 最近年度收入趋势是否能够持续。`,
    "检查经营现金流与自由现金流的期间和单位是否一致。",
    "进一步研究最近申报中的资本配置和业务分部信息（当前系统未获取申报正文）。",
  ];
  return [
    `Verify whether ${ticker}'s recent annual revenue trend is durable.`,
    "Check that operating cash flow and system-derived free cash flow use matching periods and units.",
    "Research capital allocation and segment detail in the latest filings; filing body text is not available here.",
  ];
}

export function notConfiguredResponse(ticker: Ticker, sourceMode: "live" | "cached" | "stale-cache" | "sample" | "unavailable", language: ResearchLanguage): ResearchResponse {
  const questions = rulesBasedResearchQuestions(ticker, language);
  return {
    ticker,
    status: "not-configured",
    sourceMode,
    aiMode: "not-configured",
    cached: false,
    promptVersion: aiPromptVersion,
    sources: [],
    warnings: ["AI Research Assistant is not configured. The following questions are rules-based, not AI-generated.", ...questions],
    diagnosticCode: "AI_NOT_CONFIGURED",
  };
}
