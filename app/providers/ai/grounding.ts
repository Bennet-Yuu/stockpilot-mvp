import { tickerList } from "../../data";
import { researchBriefSchema, type ResearchBrief, type ResearchClaim, type ResearchEvidenceBundle, type ResearchSource } from "./schemas";
import { AiProviderError } from "./errors";

const forbiddenPatterns = [
  /\bstrong\s*(?:buy|sell)\b/i,
  /\b(?:buy|sell|hold)(?!\s*back\b)\b/i,
  /\b(?:overweight|underweight|outperform|underperform|accumulate)\b/i,
  /\breduce\s+exposure\b/i,
  /\btrim\s+(?:the\s+)?position\b/i,
  /\bconviction\s+rating\b/i,
  /\bfair\s+value\b/i,
  /\bintrinsic\s+value(?:\s+target)?\b/i,
  /\b(?:entry|exit)\s+price\b/i,
  /\btake\s+profit\b/i,
  /\bprice\s*(?:target|forecast|prediction)\b/i,
  /\btarget\s*price\b/i,
  /\bexpected\s*(?:return|yield)\b/i,
  /\b(?:upside|downside)\s*(?:of|to|at|is|=)\s*(?:[-$()\d])/i,
  /\b(?:upside|downside)\s+(?:target|percentage|percent|estimate)\b/i,
  /\b(?:probability|chance\s+of\s+success)\b/i,
  /\bposition\s*(?:size|sizing|weight|allocation)\b/i,
  /\bstop[- ]?loss\b/i,
  /\b(?:guaranteed|certainty|certain\s+to)\b/i,
  /(?:买入|卖出|持有|增持|减持|超配|低配|跑赢|跑输|建议建仓|建议减仓|入场价|离场价|止盈价|目标价|合理股价|内在价值目标|预期收益|上涨空间|下跌空间|成功概率|仓位|止损|价格预测|保证收益)/i,
];

const directFcfDisclosurePatterns = [
  /\b(?:SEC|filing|reported|disclosed)\b.{0,60}\b(?:free\s+cash\s+flow|FCF)\b/i,
  /\b(?:free\s+cash\s+flow|FCF)\b.{0,60}\b(?:SEC|filing|reported|disclosed)\b/i,
  /(?:SEC\s*(?:directly\s*)?(?:disclosed|reported)|SEC直接披露|SEC披露).{0,40}(?:自由现金流|free\s+cash\s+flow|FCF)/i,
  /(?:自由现金流|FCF).{0,40}(?:SEC\s*(?:directly\s*)?(?:disclosed|reported)|SEC直接披露|SEC披露)/i,
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

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function extractYears(text: string): number[] {
  return [...text.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
}

function extractPercentages(text: string): number[] {
  return [...text.matchAll(/(下降|减少|decrease|decline|down\s+by)?\s*(-)?\s*(\d+(?:\.\d+)?)\s*(?:%|percent\b|百分比)/giu)].map((match) => {
    const value = Number(match[3] ?? "0");
    return match[1] || match[2] ? -Math.abs(value) : value;
  });
}

function parseNumber(value: string): number {
  return Number(value.replaceAll(",", ""));
}

function signedAmount(value: string, parenthesized: boolean, negativeWord?: string): number {
  const number = parseNumber(value);
  return parenthesized || Boolean(negativeWord?.trim()) ? -Math.abs(number) : number;
}

function extractAmounts(text: string): number[] {
  const values: number[] = [];
  const westernPattern = /(\()?\s*(-|negative\s+)?(\$)?\s*(\d[\d,]*(?:\.\d+)?)\s*(trillion|billion|million|thousand|T|B|M|K)?\s*(dollars?|USD)?\s*\)?/giu;
  for (const match of text.matchAll(westernPattern)) {
    const hasMarker = Boolean(match[3] || match[5] || match[6] || match[2]);
    if (!hasMarker) continue;
    const unit = match[5]?.toLowerCase();
    const multiplier = unit === "trillion" || unit === "t" ? 1e12 : unit === "billion" || unit === "b" ? 1e9 : unit === "million" || unit === "m" ? 1e6 : unit === "thousand" || unit === "k" ? 1e3 : 1;
    values.push(signedAmount(match[4] ?? "0", Boolean(match[1]), match[2]) * multiplier);
  }
  const chinesePattern = /(\()?\s*(-)?\s*(\d+(?:\.\d+)?)\s*(万亿|亿)\s*\)?/gu;
  for (const match of text.matchAll(chinesePattern)) {
    const multiplier = match[4] === "万亿" ? 1e12 : 1e8;
    const number = Number(match[3] ?? "0") * multiplier;
    values.push(match[1] || match[2] ? -Math.abs(number) : number);
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

function hasForbiddenContentText(text: string): boolean {
  return forbiddenPatterns.some((pattern) => pattern.test(text));
}

function hasForbiddenContent(brief: ResearchBrief): boolean {
  return hasForbiddenContentText(claimText(brief));
}

function isUnavailableSource(source: ResearchSource): boolean {
  return ["metric", "derived", "trend"].includes(source.sourceType) && source.value === undefined;
}

function validateCitations(brief: ResearchBrief, sources: Map<string, ResearchSource>): string | undefined {
  const claims = allClaims(brief);
  for (const claim of claims) {
    if (claim.sourceIds.some((sourceId) => !sources.has(sourceId))) return "AI output cited a source that is not present in the evidence bundle.";
    if (claim.sourceIds.some((sourceId) => isUnavailableSource(sources.get(sourceId)!))) return "AI output cited an unavailable SEC fact.";
  }
  for (const section of factualSections) {
    if (brief[section].some((claim) => claim.sourceIds.length === 0)) return `AI output contains an uncited factual claim in ${section}.`;
  }
  const usedSourceIds = unique(claims.flatMap((claim) => claim.sourceIds));
  if (new Set(brief.sourceIndex).size !== brief.sourceIndex.length || brief.sourceIndex.length !== usedSourceIds.length || brief.sourceIndex.some((sourceId) => !usedSourceIds.includes(sourceId)) || usedSourceIds.some((sourceId) => !brief.sourceIndex.includes(sourceId))) return "AI output sourceIndex does not exactly match the cited source IDs.";
  return undefined;
}

function claimSources(claim: ResearchClaim, sources: Map<string, ResearchSource>): ResearchSource[] {
  return claim.sourceIds.map((sourceId) => sources.get(sourceId)).filter((source): source is ResearchSource => Boolean(source));
}

const metricAliases: Array<{ metric: string; patterns: RegExp[] }> = [
  { metric: "Revenue", patterns: [/\brevenue\b/i, /\bsales\b/i, /营收|营业收入|销售额/u] },
  { metric: "Net Income", patterns: [/\bnet\s+income\b/i, /\bnet\s+profit\b/i, /净利润|净收入/u] },
  { metric: "Operating Income", patterns: [/\boperating\s+income\b/i, /营业利润|经营利润/u] },
  { metric: "Operating Cash Flow", patterns: [/\boperating\s+cash\s+flow\b|\bOCF\b/i, /经营活动现金流|经营现金流/u] },
  { metric: "Capital Expenditure", patterns: [/\bcapital\s+expenditure\b|\bcapital\s+spending\b|\bCapEx\b/i, /资本开支|资本性支出/u] },
  { metric: "Free Cash Flow", patterns: [/\bfree\s+cash\s+flow\b|\bFCF\b/i, /自由现金流/u] },
  { metric: "Assets", patterns: [/\bassets\b/i, /资产/u] },
  { metric: "Liabilities", patterns: [/\bliabilities\b/i, /负债/u] },
  { metric: "Cash", patterns: [/\bcash\s+and\s+cash\s+equivalents\b/i, /现金及现金等价物|现金余额/u] },
  { metric: "Diluted EPS", patterns: [/\bdiluted\s+EPS\b|\bEPS\b/i, /稀释每股收益|每股收益/u] },
];

function mentionedMetrics(text: string): string[] {
  return metricAliases.filter(({ patterns }) => patterns.some((pattern) => pattern.test(text))).map(({ metric }) => metric);
}

function validateClaimMetrics(claim: ResearchClaim, sources: ResearchMap): string | undefined {
  if (claim.sourceIds.length === 0) return undefined;
  const mentioned = mentionedMetrics(claim.text);
  if (mentioned.length === 0) return undefined;
  const citedMetrics = new Set(claimSources(claim, sources).map((source) => source.metric));
  if (mentioned.some((metric) => !citedMetrics.has(metric))) return "AI output described a metric that was not included in the claim's cited sources.";
  return undefined;
}

type ResearchMap = Map<string, ResearchSource>;

function sourceYears(source: ResearchSource): number[] {
  return [source.fiscalYear, source.periodEnd, source.periodStart, source.filedAt]
    .flatMap((value) => typeof value === "number" ? [value] : value ? [Number(value.slice(0, 4))] : [])
    .filter((value) => Number.isInteger(value));
}

function validateClaimNumbers(claim: ResearchClaim, sources: ResearchMap): string | undefined {
  if (claim.sourceIds.length === 0) return undefined;
  const cited = claimSources(claim, sources);
  const text = claim.text;
  if (extractYears(text).some((year) => !cited.some((source) => sourceYears(source).includes(year)))) return "AI output introduced a year not supported by the claim's cited sources.";
  for (const amount of extractAmounts(text)) {
    if (!cited.some((source) => source.value !== undefined && closeEnough(amount, source.value))) return "AI output introduced a monetary value not supported by the claim's cited sources.";
  }
  for (const percentage of extractPercentages(text)) {
    if (!cited.some((source) => source.yearOverYearChange !== undefined && closeEnough(percentage, source.yearOverYearChange))) return "AI output introduced a percentage not supported by the claim's cited trend sources.";
  }
  for (const accession of [...text.matchAll(/\b\d{10}-\d{2}-\d{6}\b/g)].map((match) => match[0])) {
    if (!cited.some((source) => source.accessionNumber === accession)) return "AI output introduced an accession number not supported by the claim's cited sources.";
  }
  return undefined;
}

function validateDerivedSources(bundle: ResearchEvidenceBundle, sources: Map<string, ResearchSource>): string | undefined {
  for (const source of bundle.sources.filter((value) => value.derived)) {
    const derivedFrom = source.derivedFrom ?? [];
    if (source.metric !== "Free Cash Flow" || derivedFrom.length !== 2 || new Set(derivedFrom).size !== 2) return "Evidence Bundle contains invalid Free Cash Flow provenance.";
    const underlying = derivedFrom.map((sourceId) => sources.get(sourceId));
    if (underlying.some((value) => !value || value.derived || value.value === undefined)) return "Evidence Bundle contains unavailable Free Cash Flow provenance.";
    const metrics = new Set(underlying.map((value) => value?.metric));
    if (!metrics.has("Operating Cash Flow") || !metrics.has("Capital Expenditure") || metrics.size !== 2) return "Free Cash Flow must cite Operating Cash Flow and Capital Expenditure only.";
    if (underlying.some((value) => !value || value.taxonomy !== source.taxonomy || !value.concept || value.accessionNumber !== source.accessionNumber || value.periodStart !== source.periodStart || value.periodEnd !== source.periodEnd || value.unit !== source.unit || value.form !== source.form)) return "Free Cash Flow provenance does not match its underlying sources.";
  }
  return undefined;
}

function validateTicker(brief: ResearchBrief, bundle: ResearchEvidenceBundle): string | undefined {
  if (brief.ticker !== bundle.ticker || brief.asOf !== bundle.asOf) return "AI output ticker or as-of date does not match the evidence bundle.";
  const otherTicker = tickerList.find((ticker) => ticker !== bundle.ticker && new RegExp(`\\b${ticker}\\b`).test(claimText(brief)));
  return otherTicker ? "AI output referenced another supported ticker." : undefined;
}

function validateDerivedFcfClaims(brief: ResearchBrief, sources: Map<string, ResearchSource>): string | undefined {
  for (const claim of allClaims(brief)) {
    if (!claim.sourceIds.some((sourceId) => sources.get(sourceId)?.derived && sources.get(sourceId)?.metric === "Free Cash Flow")) continue;
    if (directFcfDisclosurePatterns.some((pattern) => pattern.test(claim.text))) return "Derived Free Cash Flow may not be described as a direct SEC disclosure.";
  }
  return undefined;
}

export function validateResearchBrief(output: unknown, bundle: ResearchEvidenceBundle, language: "en" | "zh"): GroundingValidationResult {
  const parsed = researchBriefSchema.safeParse(output);
  if (!parsed.success) return { success: false, error: "AI output did not match the required structured schema." };
  const brief = parsed.data;
  if (brief.language !== language) return { success: false, error: "AI output language did not match the requested language." };
  if (hasForbiddenContent(brief)) return { success: false, error: "AI output contains a prohibited investment instruction or prediction." };
  const sources = new Map(bundle.sources.map((source) => [source.sourceId, source]));
  const citationError = validateCitations(brief, sources);
  if (citationError) return { success: false, error: citationError };
  const derivedError = validateDerivedSources(bundle, sources);
  if (derivedError) return { success: false, error: derivedError };
  const tickerError = validateTicker(brief, bundle);
  if (tickerError) return { success: false, error: tickerError };
  for (const claim of allClaims(brief)) {
    const metricError = validateClaimMetrics(claim, sources);
    if (metricError) return { success: false, error: metricError };
    const numberError = validateClaimNumbers(claim, sources);
    if (numberError) return { success: false, error: numberError };
  }
  const fcfError = validateDerivedFcfClaims(brief, sources);
  if (fcfError) return { success: false, error: fcfError };
  return { success: true, brief };
}

export function assertGroundedResearchBrief(output: unknown, bundle: ResearchEvidenceBundle, language: "en" | "zh"): ResearchBrief {
  const result = validateResearchBrief(output, bundle, language);
  if (!result.success) throw new AiProviderError("AI_GROUNDING_ERROR", result.error);
  return result.brief;
}

export function containsRefusalRequest(question: string): boolean {
  return hasForbiddenContentText(question) || /ignore\s+(?:the\s+)?(?:previous|system|above)|忽略(?:之前|系统|上面)/i.test(question);
}
