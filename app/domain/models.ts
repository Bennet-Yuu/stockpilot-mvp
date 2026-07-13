import type { Ticker } from "../data";

export type ChecklistInput = {
  why: string;
  holding: string;
  invalidation: string;
  maxLoss: string;
  weight: string;
  driver: string;
  event: string;
  target: string;
  exit: string;
};

export type ChecklistWarning = {
  code: "MISSING_INVALIDATION" | "OVERSIZED_POSITION" | "HIGH_LOSS_LIMIT" | "MAJOR_EVENT" | "MOMENTUM_CHASING" | "MISSING_EXIT_PLAN";
  severity: "serious" | "general";
  message: string;
};

export type ReadinessResult = {
  score: number;
  completedCount: number;
  warnings: ChecklistWarning[];
};

export type WatchStatus = "Researching" | "Watching" | "Ready to Buy" | "Avoiding";

export type WatchlistRecord = {
  ticker: Ticker;
  target: number;
  reason: string;
  status: WatchStatus;
};

export type TradeRecord = {
  id: number;
  ticker: Ticker;
  buyPrice: number;
  shares: number;
  date: string;
  target: number;
  maxLoss: number;
  thesis: string;
  invalidation: string;
  holding: string;
  closed?: boolean;
  sellPrice?: number;
};

export type JournalRecord = {
  tradeId: number;
  buyReason: string;
  sellReason: string;
  emotionalState: string;
  whatWentWell: string;
  whatWentWrong: string;
  thesisCorrect: string;
  processCorrect: string;
  lessonsLearned: string;
  mistakeCategories: string[];
};

export type UserData = {
  version: 1;
  watchlist: WatchlistRecord[];
  trades: TradeRecord[];
  checklistDrafts: Partial<Record<Ticker, ChecklistInput>>;
  journals: Record<string, JournalRecord>;
};
