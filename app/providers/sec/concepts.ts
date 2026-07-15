import type { SecMetricName } from "./types";

export const SEC_CONCEPT_CANDIDATES: Record<SecMetricName, string[]> = {
  Revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"],
  "Operating Income": ["OperatingIncomeLoss"],
  "Net Income": ["NetIncomeLoss"],
  "Operating Cash Flow": ["NetCashProvidedByUsedInOperatingActivities"],
  "Capital Expenditure": ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"],
  "Free Cash Flow": [],
  Assets: ["Assets"],
  Liabilities: ["Liabilities"],
  "Cash and Cash Equivalents": ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
  "Diluted EPS": ["EarningsPerShareDiluted"],
};

export const SEC_UNIT_PREFERENCES: Record<SecMetricName, string[]> = {
  Revenue: ["USD"],
  "Operating Income": ["USD"],
  "Net Income": ["USD"],
  "Operating Cash Flow": ["USD"],
  "Capital Expenditure": ["USD"],
  "Free Cash Flow": ["USD"],
  Assets: ["USD"],
  Liabilities: ["USD"],
  "Cash and Cash Equivalents": ["USD"],
  "Diluted EPS": ["USD/shares", "USD / shares"],
};

export function conceptCandidates(metric: SecMetricName): string[] {
  return SEC_CONCEPT_CANDIDATES[metric];
}

export function preferredUnits(metric: SecMetricName): string[] {
  return SEC_UNIT_PREFERENCES[metric];
}
