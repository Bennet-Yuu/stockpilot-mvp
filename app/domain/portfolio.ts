import type { Stock, Ticker } from "../data";
import type { AccountLedger, ChecklistWarning, TradePlan, TradeRecord, TransactionRecord } from "./models";

export const calculatePurchaseCost = (price:number, shares:number) => validPositive(price) && validPositiveInteger(shares) ? roundMoney(price * shares) : 0;
export const calculateSaleProceeds = (price:number, shares:number) => validPositive(price) && validPositiveInteger(shares) ? roundMoney(price * shares) : 0;
export const calculateRealizedPnL = (buyPrice:number, sellPrice:number, shares:number) => calculateSaleProceeds(sellPrice, shares) - calculatePurchaseCost(buyPrice, shares);
export const calculateUnrealizedPnL = (trade:TradeRecord, currentPrice:number) => calculateSaleProceeds(currentPrice, trade.shares) - calculatePurchaseCost(trade.buyPrice, trade.shares);
export const calculatePortfolioWeight = (positionValue:number, portfolioValue:number) => portfolioValue > 0 ? positionValue / portfolioValue * 100 : 0;
export const calculateAvailableCash = (initialCash:number, transactions:TransactionRecord[]) => transactions.reduce((cash, tx) => cash + (tx.type === "sell" ? tx.amount : -tx.amount), initialCash);

export function calculatePortfolioValue(cash:number, trades:TradeRecord[], prices:Record<string, Pick<Stock,"price">>):number {
  return cash + trades.filter(isOpenTrade).reduce((sum, trade) => sum + trade.shares * prices[trade.ticker].price, 0);
}

export function planTrade(ticker:Ticker, price:number, weightPercent:number, portfolioValue:number, cash:number):TradePlan {
  const plannedInvestment = Number.isFinite(weightPercent) ? portfolioValue * weightPercent / 100 : 0;
  const shares = validPositive(price) && weightPercent > 0 && weightPercent <= 100 ? Math.floor(plannedInvestment / price) : 0;
  const purchaseCost = calculatePurchaseCost(price, shares);
  return { ticker, price, shares, plannedInvestment, purchaseCost, cashAfter:cash-purchaseCost, actualWeightPercent:calculatePortfolioWeight(purchaseCost, portfolioValue) };
}

export function validateTradePlan(plan:TradePlan, cash:number):ChecklistWarning[] {
  const warnings:ChecklistWarning[]=[];
  if (!validPositive(plan.price)) warnings.push({code:"INVALID_NUMBER",severity:"serious",message:"The sample price is invalid."});
  if (!validPositiveInteger(plan.shares)) warnings.push({code:"ZERO_SHARES",severity:"serious",message:"The intended allocation is too small to purchase one whole sample share."});
  if (plan.actualWeightPercent > 100) warnings.push({code:"OVERSIZED_POSITION",severity:"serious",message:"A paper position cannot exceed 100% of the portfolio."});
  if (plan.purchaseCost > cash) warnings.push({code:"INSUFFICIENT_CASH",severity:"serious",message:"The planned paper trade exceeds available sample cash."});
  return warnings;
}

export function applyPurchase(account:AccountLedger, trade:TradeRecord):AccountLedger {
  const amount=calculatePurchaseCost(trade.buyPrice,trade.shares);
  if (!amount || amount>account.cashBalance) throw new Error("INSUFFICIENT_CASH");
  const tx:TransactionRecord={id:`buy-${trade.id}`,tradeId:trade.id,type:"buy",ticker:trade.ticker,price:trade.buyPrice,shares:trade.shares,amount,occurredAt:trade.createdAt};
  return {...account,cashBalance:account.cashBalance-amount,transactions:[...account.transactions,tx]};
}

export function closeTrade(account:AccountLedger, trades:TradeRecord[], tradeId:number, sellPrice:number, closedAt:string):{account:AccountLedger;trades:TradeRecord[]} {
  const trade=trades.find(item=>item.id===tradeId);
  if(!trade||!isOpenTrade(trade)||!validPositive(sellPrice)) throw new Error("INVALID_CLOSE");
  const proceeds=calculateSaleProceeds(sellPrice,trade.shares);
  const realizedPnL=calculateRealizedPnL(trade.buyPrice,sellPrice,trade.shares);
  const tx:TransactionRecord={id:`sell-${trade.id}`,tradeId:trade.id,type:"sell",ticker:trade.ticker,price:sellPrice,shares:trade.shares,amount:proceeds,occurredAt:closedAt};
  return {account:{...account,cashBalance:account.cashBalance+proceeds,transactions:[...account.transactions,tx]},trades:trades.map(item=>item.id===tradeId?{...item,closed:true,closedAt,sellPrice,realizedPnL,realizedReturnPercent:realizedPnL/calculatePurchaseCost(item.buyPrice,item.shares)*100}:item)};
}

export function summarizePortfolio(trades:TradeRecord[], stockMap:Record<string,Stock>, accountOrCash:AccountLedger|number) {
  const cash=typeof accountOrCash==="number"?accountOrCash:accountOrCash.cashBalance;
  const openTrades=trades.filter(isOpenTrade); const closedTrades=trades.filter(t=>!isOpenTrade(t));
  const invested=openTrades.reduce((s,t)=>s+calculatePurchaseCost(t.buyPrice,t.shares),0);
  const currentValue=openTrades.reduce((s,t)=>s+stockMap[t.ticker].price*t.shares,0);
  const realizedPnL=closedTrades.reduce((s,t)=>s+(t.realizedPnL??(t.sellPrice?calculateRealizedPnL(t.buyPrice,t.sellPrice,t.shares):0)),0);
  return {openTrades,closedTrades,invested,currentValue,cash,portfolioValue:cash+currentValue,unrealizedPnL:currentValue-invested,realizedPnL};
}

export function calculateTradeMetrics(trade:TradeRecord,currentPrice:number,portfolioValue:number){const costBasis=trade.buyPrice*trade.shares;const currentValue=currentPrice*trade.shares;const unrealizedPnL=currentValue-costBasis;return{costBasis,currentValue,unrealizedPnL,returnPercent:costBasis?unrealizedPnL/costBasis:0,portfolioWeight:portfolioValue?currentValue/portfolioValue:0}}
export const isOpenTrade=(trade:TradeRecord)=>!trade.closed&&!trade.closedAt;
const validPositive=(value:number)=>Number.isFinite(value)&&value>0;
const validPositiveInteger=(value:number)=>Number.isInteger(value)&&value>0;
const roundMoney=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
