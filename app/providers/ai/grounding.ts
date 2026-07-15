import { tickerList } from "../../data";
import { researchBriefSchema, type ResearchBrief, type ResearchClaim, type ResearchEvidenceBundle, type ResearchSource } from "./schemas";
import { AiProviderError } from "./errors";

const forbiddenPatterns = [
  /\bstrong\s*(buy|sell)\b/i,
  /\b(buy|sell|hold)\b/i,
  /price\s*target/i,
  /target\s*price/i,
  /expected\s*(return|yield)/i,
  /upside|downside/i,
  /probability|chance of success/i,
  /position\s*(size|sizing|weight|allocation)/i,
  /stop[- ]?loss/i,
  /price\s*(forecast|prediction)/i,
  /guaranteed|certainty|certain to/i,
  /买入|卖出|持有|目标价|预期收益|上涨空间|下跌空间|成功概率|仓位|止损|价格预测|保证收益/,
];

const factualSections = ["summary", "financialTrends", "strengths", "risks", "bullCaseConditions", "bearCaseConditions", "limitations"] as const;

export type GroundingValidationResult = {
  success: true;
  brief: ResearchBrief;
} | {
  success: false;
  error: string;
};

function allClaims(brief: ResearchBrief): ResearchClaim[] {
  return factualSections.flatMap((section) => brief[section]).concat(brief.researchQuestions);
}

function extractYears(text: string): number[] {
  return [...text.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
}

function extractPercentages(text: string): number[] {
  return [...text.matchAll(/(-?\d+(?:\.\d+)?)\s*%/g)].map((match) => Number(match[1]));
}

function extractAmounts(text: string): number[] {
  const values: number[] = [];
  for (const match of text.matchAll(/\$\s*(-?\d+(?:\.\d+)?)\s*(T|B|M|K)?\b/gi)) {
    const multiplier = match[2]?.toUpperCase() === "T" ? 1e12 : match[2]?.toUpperCase() === "B" ? 1e9 : match[2]?.toUpperCase() === "M" ? 1e6 : match[2]?.toUpperCase() === "K" ? 1e3 : 1;
    values.push(Number(match[1]) * multiplier);
  }
  return values;
}

function closeEnough(value: number, expected: number): boolean {
  const tolerance = Math.max(Math.abs(expected) * 0.012, 1);
  return Math.abs(value - expected) <= tolerance;
}

function claimText(brief: ResearchBrief): string {
  return allClaims(brief).map((claim) => claim.text).join(" ");
}

function hasForbiddenContent(brief: ResearchBrief): boolean {
  const text = claimText(brief);
  return forbiddenPatterns.some((pattern) => pattern.test(text));
}

function validateCitations(brief: ResearchBrief, bundle: ResearchEvidenceBundle, sources: Map<string, ResearchSource>): string | undefined {
  for (const claim of allClaims(brief)) {
    if (claim.sourceIds.some((sourceId) => !sources.has(sourceId))) return "AI output cited a source that is not present in the evidence bundle.";
  }
  for (const section of factualSections) {
    if (brief[section].some((claim) => claim.sourceIds.length === 0)) return `AI output contains an uncited factual claim in ${section}.`;
  }
  if (brief.sourceIndex.some((sourceId) => !sources.has(sourceId))) return "AI output returned an invalid source index.";
  return undefined;
}

function validateNumbers(brief: ResearchBrief, bundle: ResearchEvidenceBundle, sources: Map<string, ResearchSource>): string | undefined {
  const text = claimText(brief);
  const years = new Set<number>([
    ...bundle.facts.flatMap((fact) => fact.fiscalYear === undefined ? [] : [fact.fiscalYear]),
    ...bundle.annualTrends.flatMap((trend) => trend.fiscalYear === undefined ? [] : [trend.fiscalYear]),
    ...bundle.recentFilings.flatMap((filing) => [filing.filingDate, filing.reportDate].filter((date): date is string => Boolean(date)).map((date) => Number(date.slice(0, 4)))),
  ]);
  if (extractYears(text).some((year) => !years.has(year))) return "AI output introduced a fiscal year that is not present in the evidence bundle.";

  const sourceValues = [...sources.values()].flatMap((source) => source.value === undefined ? [] : [source.value]);
  for (const amount of extractAmounts(text)) if (!sourceValues.some((value) => closeEnough(amount, value))) return "AI output introduced a monetary value that is not present in the evidence bundle.";

  const trendChanges = [...sources.values()].flatMap((source) => source.yearOverYearChange === undefined ? [] : [source.yearOverYearChange]);
  for (const percentage of extractPercentages(text)) if (!trendChanges.some((value) => closeEnough(percentage, value))) return "AI output introduced a percentage that is not present in the evidence bundle.";

  for (const accession of [...text.matchAll(/\b\d{10}-\d{2}-\d{6}\b/g)].map((match) => match[0])) {
    if (!bundle.recentFilings.some((filing) => filing.accessionNumber === accession) && !bundle.facts.some((fact) => fact.accessionNumber === accession)) return "AI output introduced an accession number that is not present in the evidence bundle.";
  }
  return undefined;
}

function validateTicker(brief: ResearchBrief, bundle: ResearchEvidenceBundle): string | undefined {
  if (brief.ticker !== bundle.ticker || brief.asOf !== bundle.asOf) return "AI output ticker or as-of date does not match the evidence bundle.";
  const otherTicker = tickerList.find((ticker) => ticker !== bundle.ticker && new RegExp(`\\b${ticker}\\b`).test(claimText(brief)));
  return otherTicker ? "AI output referenced another supported ticker." : undefined;
}

export function validateResearchBrief(output: unknown, bundle: ResearchEvidenceBundle, language: "en" | "zh"): GroundingValidationResult {
  const parsed = researchBriefSchema.safeParse(output);
  if (!parsed.success) return { success: false, error: "AI output did not match the required structured schema." };
  const brief = parsed.data;
  if (brief.language !== language) return { success: false, error: "AI output language did not match the requested language." };
  if (hasForbiddenContent(brief)) return { success: false, error: "AI output contains a prohibited investment instruction or prediction." };
  const sources = new Map(bundle.sources.map((source) => [source.sourceId, source]));
  const citationError = validateCitations(brief, bundle, sources);
  if (citationError) return { success: false, error: citationError };
  const tickerError = validateTicker(brief, bundle);
  if (tickerError) return { success: false, error: tickerError };
  const numberError = validateNumbers(brief, bundle, sources);
  if (numberError) return { success: false, error: numberError };
  for (const claim of allClaims(brief)) {
    for (const sourceId of claim.sourceIds) {
      const source = sources.get(sourceId);
      if (source?.derived && /free\s*cash\s*flow/i.test(claim.text) && /\bSEC\b/i.test(claim.text)) return { success: false, error: "Derived Free Cash Flow may not be described as a direct SEC disclosure." };
    }
  }
  return { success: true, brief };
}

export function assertGroundedResearchBrief(output: unknown, bundle: ResearchEvidenceBundle, language: "en" | "zh"): ResearchBrief {
  const result = validateResearchBrief(output, bundle, language);
  if (!result.success) throw new AiProviderError("AI_GROUNDING_ERROR", result.error);
  return result.brief;
}

export function containsRefusalRequest(question: string): boolean {
  return forbiddenPatterns.some((pattern) => pattern.test(question)) || /ignore\s+(the\s+)?(previous|system|above)|忽略(之前|系统|上面)/i.test(question);
}
