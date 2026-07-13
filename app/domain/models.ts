import type { Ticker } from "../data";

export type ChecklistInput = {
  why: string; holding: string; invalidation: string; maxLoss: string;
  weight: string; driver: string; event: string; target: string; exit: string;
};

export type ChecklistWarningCode =
  | "MISSING_INVALIDATION" | "MISSING_EXIT_PLAN" | "OVERSIZED_POSITION"
  | "HIGH_LOSS_LIMIT" | "MAJOR_EVENT" | "EVENT_UNKNOWN" | "MOMENTUM_CHASING"
  | "INVALID_NUMBER" | "INVALID_TARGET" | "INSUFFICIENT_CASH" | "ZERO_SHARES";

export type ChecklistWarning = { code: ChecklistWarningCode; severity: "serious" | "general"; message: string };
export type ReadinessResult = { score: number; completedCount: number; warnings: ChecklistWarning[]; isValid: boolean };

export type WatchStatus = "Researching" | "Watching" | "Ready to Buy" | "Avoiding";
export type WatchlistRecord = { ticker: Ticker; target: number; reason: string; status: WatchStatus };

export type TransactionRecord = {
  id: string; tradeId: number; type: "buy" | "sell"; ticker: Ticker;
  price: number; shares: number; amount: number; occurredAt: string;
};

export type TradeRecord = {
  id: number; ticker: Ticker; buyPrice: number; shares: number; date: string;
  intendedWeightPercent: number; actualWeightPercentAtEntry: number;
  buyDriver: string; upcomingEventStatus: string; targetPrice: number;
  maximumLossPercent: number; thesis: string; invalidationCondition: string;
  exitPlan: string; expectedHoldingPeriod: string; checklistScoreAtEntry: number;
  checklistWarningsAtEntry: ChecklistWarning[]; createdAt: string;
  closedAt?: string; sellPrice?: number; realizedPnL?: number; realizedReturnPercent?: number;
  // v1-compatible aliases remain readable during the migration window.
  target?: number; maxLoss?: number; invalidation?: string; holding?: string; closed?: boolean;
};

export type JournalRecord = {
  tradeId: number; buyReason: string; sellReason: string; emotionalState: string;
  whatWentWell: string; whatWentWrong: string; thesisCorrect: string;
  processCorrect: string; lessonsLearned: string; mistakeCategories: string[];
};

export type AccountLedger = { initialCash: number; cashBalance: number; transactions: TransactionRecord[] };

export type UserDataV1 = {
  version: 1; watchlist: WatchlistRecord[];
  trades: Array<{ id:number; ticker:Ticker; buyPrice:number; shares:number; date:string; target:number; maxLoss:number; thesis:string; invalidation:string; holding:string; closed?:boolean; sellPrice?:number }>;
  checklistDrafts: Partial<Record<Ticker, ChecklistInput>>; journals: Record<string, JournalRecord>;
};

export type UserData = {
  version: 2; account: AccountLedger; watchlist: WatchlistRecord[]; trades: TradeRecord[];
  checklistDrafts: Partial<Record<Ticker, ChecklistInput>>; journals: Record<string, JournalRecord>;
};

export type TradePlan = {
  ticker: Ticker; price: number; shares: number; plannedInvestment: number;
  purchaseCost: number; cashAfter: number; actualWeightPercent: number;
};
