import { stocks, type Ticker } from "../data";
import type { ChecklistInput, JournalRecord, TradeRecord, WatchlistRecord } from "./models";
import { calculateReadiness } from "./scoring";

export type DecisionTask={id:string;ticker?:Ticker;kind:"checklist"|"risk"|"journal"|"thesis"|"price"|"review";title:string;detail:string};
export function buildDecisionQueue(watchlist:WatchlistRecord[],drafts:Partial<Record<Ticker,ChecklistInput>>,trades:TradeRecord[],journals:Record<string,JournalRecord>):DecisionTask[]{
  const tasks:DecisionTask[]=[];
  watchlist.forEach(item=>{const draft=drafts[item.ticker];if(item.status==="Ready to Buy"&&(!draft||calculateReadiness(draft).completedCount<9))tasks.push({id:`check-${item.ticker}`,ticker:item.ticker,kind:"checklist",title:`Complete ${item.ticker} decision checklist`,detail:"Checklist incomplete"});if(Math.abs(stocks[item.ticker].price-item.target)/stocks[item.ticker].price<=.05)tasks.push({id:`price-${item.ticker}`,ticker:item.ticker,kind:"price",title:`Review ${item.ticker} watch price`,detail:"Sample price is within 5% of your reminder"});if(draft){const serious=calculateReadiness(draft).warnings.filter(w=>w.severity==="serious").length;if(serious)tasks.push({id:`risk-${item.ticker}`,ticker:item.ticker,kind:"risk",title:`Resolve ${item.ticker} risk checks`,detail:`${serious} serious warning${serious===1?"":"s"}`})}});
  trades.forEach(trade=>{if((trade.closedAt||trade.closed)&&!journals[String(trade.id)])tasks.push({id:`journal-${trade.id}`,ticker:trade.ticker,kind:"journal",title:`Reflect on closed ${trade.ticker} trade`,detail:"Journal pending"});if(!trade.closedAt&&!trade.closed&&!trade.invalidationCondition?.trim())tasks.push({id:`thesis-${trade.id}`,ticker:trade.ticker,kind:"thesis",title:`Review ${trade.ticker} thesis`,detail:"Invalidation condition missing"})});
  return tasks;
}
