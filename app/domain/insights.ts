import type { JournalRecord, TradeRecord } from "./models";

export type InsightBucket={label:string;averageReturn:number;sampleSize:number};
const returns=(trades:TradeRecord[])=>trades.filter(t=>t.closedAt||t.closed).map(t=>t.realizedReturnPercent??(t.sellPrice?(t.sellPrice/t.buyPrice-1)*100:0));
export const calculateWinRate=(trades:TradeRecord[])=>{const values=returns(trades);return values.length?values.filter(v=>v>0).length/values.length*100:0};
export const calculateAverageGain=(trades:TradeRecord[])=>average(returns(trades).filter(v=>v>0));
export const calculateAverageLoss=(trades:TradeRecord[])=>average(returns(trades).filter(v=>v<0));
export const calculateProfitFactor=(trades:TradeRecord[])=>{const values=returns(trades),gains=values.filter(v=>v>0).reduce((a,b)=>a+b,0),losses=Math.abs(values.filter(v=>v<0).reduce((a,b)=>a+b,0));return losses===0?(gains>0?null:0):gains/losses};
export function calculateMostCommonMistake(journals:Record<string,JournalRecord>){const counts=new Map<string,number>();Object.values(journals).forEach(j=>j.mistakeCategories.forEach(m=>counts.set(m,(counts.get(m)??0)+1)));return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]??null}
export const calculatePerformanceByHoldingPeriod=(trades:TradeRecord[])=>bucket(trades,t=>normalizeHolding(t.expectedHoldingPeriod||t.holding||"Unknown"));
export const calculatePerformanceByPositionSize=(trades:TradeRecord[])=>bucket(trades,t=>{const w=t.actualWeightPercentAtEntry??0;return w<5?"Under 5%":w<=10?"5–10%":w<=20?"10–20%":"Over 20%"});
export function calculateBestPerformingTicker(trades:TradeRecord[]){const groups=bucket(trades,t=>t.ticker);return groups.sort((a,b)=>b.averageReturn-a.averageReturn)[0]??null}
export function summarizeInsights(trades:TradeRecord[],journals:Record<string,JournalRecord>){const closed=trades.filter(t=>t.closedAt||t.closed);return{sampleSize:closed.length,winRate:calculateWinRate(closed),averageGain:calculateAverageGain(closed),averageLoss:calculateAverageLoss(closed),profitFactor:calculateProfitFactor(closed),mostCommonMistake:calculateMostCommonMistake(journals),holdingPeriods:calculatePerformanceByHoldingPeriod(closed),positionSizes:calculatePerformanceByPositionSize(closed),bestTicker:closed.length>=5?calculateBestPerformingTicker(closed):null,isSmallSample:closed.length<3}}
function bucket(trades:TradeRecord[],key:(trade:TradeRecord)=>string):InsightBucket[]{const groups=new Map<string,number[]>();trades.filter(t=>t.closedAt||t.closed).forEach(t=>{const k=key(t),v=t.realizedReturnPercent??(t.sellPrice?(t.sellPrice/t.buyPrice-1)*100:0);groups.set(k,[...(groups.get(k)??[]),v])});return[...groups].map(([label,values])=>({label,averageReturn:average(values),sampleSize:values.length}))}
const average=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const normalizeHolding=(value:string)=>value==="1–3 years"||value==="3+ years"?"1+ years":value;
