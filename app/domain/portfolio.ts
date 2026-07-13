import type { Stock } from "../data";
import type { TradeRecord } from "./models";

export type TradeMetrics = {
  costBasis: number;
  currentValue: number;
  unrealizedPnL: number;
  returnPercent: number;
  portfolioWeight: number;
};

export function calculateTradeMetrics(trade: TradeRecord, currentPrice: number, portfolioValue: number): TradeMetrics {
  const costBasis = trade.buyPrice * trade.shares;
  const currentValue = currentPrice * trade.shares;
  const unrealizedPnL = currentValue - costBasis;
  return {
    costBasis,
    currentValue,
    unrealizedPnL,
    returnPercent: costBasis === 0 ? 0 : unrealizedPnL / costBasis,
    portfolioWeight: portfolioValue === 0 ? 0 : currentValue / portfolioValue,
  };
}

export function summarizePortfolio(trades: TradeRecord[], stockMap: Record<string, Stock>, cash: number) {
  const openTrades = trades.filter((trade) => !trade.closed);
  const invested = openTrades.reduce((sum, trade) => sum + trade.buyPrice * trade.shares, 0);
  const currentValue = openTrades.reduce((sum, trade) => sum + stockMap[trade.ticker].price * trade.shares, 0);
  const portfolioValue = currentValue + cash;
  return { openTrades, invested, currentValue, portfolioValue, unrealizedPnL: currentValue - invested };
}
