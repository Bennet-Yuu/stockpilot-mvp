import type { Stock } from "../data";
import type { ChecklistInput, ChecklistWarning, ReadinessResult } from "./models";

export function calculateEvidenceScore(stock: Pick<Stock, "scores">): number {
  const score = stock.scores.reduce((sum, component) => sum + component.value, 0);
  return Math.max(0, Math.min(100, score));
}

export function calculateReadiness(input: ChecklistInput): ReadinessResult {
  const fields = [input.why, input.holding, input.invalidation, input.maxLoss, input.weight, input.driver, input.event, input.target, input.exit];
  const completedCount = fields.filter((value) => value.trim().length > 0).length;
  let score = Math.round((completedCount / fields.length) * 70);
  if (input.invalidation.trim().length > 20) score += 10;
  if (withinGuardrail(input.weight, 15)) score += 10;
  if (withinGuardrail(input.maxLoss, 15)) score += 5;
  if (input.event === "No") score += 5;

  const warnings: ChecklistWarning[] = [];
  if (!input.invalidation.trim()) warnings.push({ code: "MISSING_INVALIDATION", severity: "serious", message: "Define what evidence would invalidate your thesis." });
  if (Number(input.weight) > 20) warnings.push({ code: "OVERSIZED_POSITION", severity: "serious", message: "Position size above 20% creates concentration risk." });
  else if (Number(input.weight) > 10) warnings.push({ code: "OVERSIZED_POSITION", severity: "general", message: "Position size above 10% deserves an explicit concentration review." });
  if (Number(input.maxLoss) > 20) warnings.push({ code: "HIGH_LOSS_LIMIT", severity: "general", message: "Maximum acceptable loss above 20% exceeds the beginner guardrail." });
  if (input.event === "Yes") warnings.push({ code: "MAJOR_EVENT", severity: "general", message: "A major event is approaching. Record a plan before proceeding." });
  if (input.driver === "Recent price movement") warnings.push({ code: "MOMENTUM_CHASING", severity: "general", message: "Recent price movement alone is not a fundamental thesis." });
  if (!input.exit.trim()) warnings.push({ code: "MISSING_EXIT_PLAN", severity: "serious", message: "Write an exit or reassessment plan before creating a trade." });

  return { score: Math.min(100, score), completedCount, warnings };
}

function withinGuardrail(value: string, max: number): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= max;
}
