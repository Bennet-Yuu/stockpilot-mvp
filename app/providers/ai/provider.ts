import { getAiRuntimeConfig, isAiConfigured, requestOpenAiResearch } from "./client";
import { getAiCache, makeAiCacheKey } from "./cache";
import { AiProviderError, setLastAiDiagnosticCode } from "./errors";
import { assertGroundedResearchBrief } from "./grounding";
import { aiPromptVersion, type ResearchBrief } from "./schemas";
import type { ResearchAssistantInput, ResearchAssistantProvider, ResearchAssistantResult } from "./types";

function makeMockBrief(input: ResearchAssistantInput): ResearchBrief {
  const sourceIds = input.evidence.sources.slice(0, 3).map((source) => source.sourceId);
  const primary = sourceIds[0] ?? `sec:identity:${input.ticker}`;
  const second = sourceIds[1] ?? primary;
  const chinese = input.language === "zh";
  const claim = (text: string, ids: string[] = [primary]) => ({ text, sourceIds: ids });
  return {
    ticker: input.ticker,
    language: input.language,
    asOf: input.evidence.asOf,
    summary: chinese ? [claim("该简报仅整理已提供的 SEC 标准化事实。"), claim("所有观察都需要结合原始来源继续核验。", [second])] : [claim("This brief only summarizes the SEC standardized facts provided."), claim("Every observation should be checked against the original sources.", [second])],
    financialTrends: chinese ? [claim("年度财务事实保留了原始期间、单位和申报表单。", [primary]), claim("系统预先计算的趋势变化仅描述证据中存在的期间。", [second])] : [claim("Annual financial facts retain their original periods, units, and filing forms.", [primary]), claim("System-precomputed trend changes describe only periods present in the evidence.", [second])],
    strengths: chinese ? [claim("可验证的优势来自连续可用的标准化事实，而不是评级。", [primary])] : [claim("Verifiable strengths come from available standardized facts, not a rating.", [primary])],
    risks: chinese ? [claim("数据缺失、期间差异和申报正文不可用会限制结论。", [primary]), claim("任何情景都需要在后续研究中验证。", [second])] : [claim("Missing data, period differences, and unavailable filing body text limit conclusions.", [primary]), claim("Any scenario requires further verification.", [second])],
    bullCaseConditions: chinese ? [claim("看多情景成立需要相关财务趋势在后续申报中保持可验证。", [primary])] : [claim("A bull-case condition is that the relevant financial trend remains verifiable in later filings.", [primary])],
    bearCaseConditions: chinese ? [claim("看空情景成立条件包括趋势恶化或关键指标持续缺失。", [second])] : [claim("A bear-case condition is sustained deterioration or continued absence of a key metric.", [second])],
    researchQuestions: chinese ? [claim("哪些业务因素解释了最新年度变化？", []), claim("现金流和资本开支的期间是否一致？", []), claim("下一份申报会补充哪些缺失事实？", [])] : [claim("Which business factors explain the latest annual change?", []), claim("Do cash flow and capital expenditure use matching periods?", []), claim("Which missing facts could the next filing add?", [])],
    limitations: chinese ? [claim("这是基于当前 SEC facts 的规则化测试简报，不包含申报正文，也不是投资建议。", [primary])] : [claim("This is a rules-based test brief from the current SEC facts; it does not contain filing body text and is not investment advice.", [primary])],
    sourceIndex: sourceIds.length > 0 ? sourceIds : [primary],
    generatedAt: new Date().toISOString(),
    model: "mock",
    promptVersion: aiPromptVersion,
  };
}

export class UnavailableResearchAssistantProvider implements ResearchAssistantProvider {
  async generateResearchBrief(input: ResearchAssistantInput): Promise<ResearchAssistantResult> {
    void input;
    throw new AiProviderError("AI_NOT_CONFIGURED", "AI Research Assistant is not configured.");
  }
}

export class MockResearchAssistantProvider implements ResearchAssistantProvider {
  async generateResearchBrief(input: ResearchAssistantInput): Promise<ResearchAssistantResult> {
    const brief = assertGroundedResearchBrief(makeMockBrief(input), input.evidence, input.language);
    return { status: "success", aiMode: "ai-live", cached: false, brief, warnings: ["Mock provider used for offline tests only."], latencyMs: 0 };
  }
}

export class OpenAIResearchAssistantProvider implements ResearchAssistantProvider {
  constructor(private readonly now: () => number = Date.now) {}

  async generateResearchBrief(input: ResearchAssistantInput): Promise<ResearchAssistantResult> {
    const config = getAiRuntimeConfig();
    if (!config.apiKey) throw new AiProviderError("AI_NOT_CONFIGURED", "AI Research Assistant is not configured.");
    const key = makeAiCacheKey({ ticker: input.ticker, evidenceHash: input.evidence.evidenceHash, language: input.language, promptVersion: aiPromptVersion, model: config.model, question: input.question });
    const cache = getAiCache();
    if (!input.regenerate) {
      const cached = cache.getFresh(key);
      if (cached) {
        setLastAiDiagnosticCode(undefined);
        return { status: "cached", aiMode: "ai-cached", cached: true, brief: cached.brief, warnings: ["This brief was served from the server-side AI cache."], latencyMs: 0 };
      }
    }
    const started = this.now();
    try {
      const generated = await requestOpenAiResearch({ bundle: input.evidence, language: input.language, question: input.question });
      const candidate = { ...generated.brief, ticker: input.ticker, language: input.language, asOf: input.evidence.asOf, generatedAt: new Date(this.now()).toISOString(), model: config.model, promptVersion: aiPromptVersion };
      const brief = assertGroundedResearchBrief(candidate, input.evidence, input.language);
      cache.set(key, brief, config.cacheTtlSeconds);
      setLastAiDiagnosticCode(undefined);
      return { status: "success", aiMode: "ai-live", cached: false, brief, warnings: input.evidence.sourceMode === "stale-cache" ? ["SEC evidence is from a stale cache; verify the source dates before relying on this brief."] : [], latencyMs: Math.max(0, this.now() - started), tokenUsage: generated.tokenUsage };
    } catch (error) {
      const safe = error instanceof AiProviderError ? error : new AiProviderError("AI_PROVIDER_ERROR", "The AI provider is unavailable.");
      setLastAiDiagnosticCode(safe.code);
      throw safe;
    }
  }
}

export function getResearchAssistantProvider(): ResearchAssistantProvider {
  return isAiConfigured() ? new OpenAIResearchAssistantProvider() : new UnavailableResearchAssistantProvider();
}

export function createResearchAssistantProvider(kind: "openai" | "mock" | "unavailable" = "openai"): ResearchAssistantProvider {
  if (kind === "mock") return new MockResearchAssistantProvider();
  if (kind === "unavailable") return new UnavailableResearchAssistantProvider();
  return new OpenAIResearchAssistantProvider();
}
