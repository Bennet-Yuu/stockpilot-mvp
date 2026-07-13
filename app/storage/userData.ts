import { z } from "zod";
import type { TradeRecord, UserData, UserDataV1 } from "../domain/models";
import { calculatePurchaseCost, calculateRealizedPnL } from "../domain/portfolio";

export const USER_DATA_STORAGE_KEY = "stockpilot-user-data-v2";
export const LEGACY_USER_DATA_STORAGE_KEY = "stockpilot-user-data-v1";
const THEME_STORAGE_KEY = "stockpilot-theme";
const ticker=z.enum(["AAPL","MSFT","NVDA","AMZN","TSLA"]);
const checklist=z.object({why:z.string(),holding:z.string(),invalidation:z.string(),maxLoss:z.string(),weight:z.string(),driver:z.string(),event:z.string(),target:z.string(),exit:z.string()});
const warning=z.object({code:z.enum(["MISSING_INVALIDATION","MISSING_EXIT_PLAN","OVERSIZED_POSITION","HIGH_LOSS_LIMIT","MAJOR_EVENT","EVENT_UNKNOWN","MOMENTUM_CHASING","INVALID_NUMBER","INVALID_TARGET","INSUFFICIENT_CASH","ZERO_SHARES"]),severity:z.enum(["serious","general"]),message:z.string()});
const watchlist=z.object({ticker,target:z.number().finite(),reason:z.string(),status:z.enum(["Researching","Watching","Ready to Buy","Avoiding"])});
const v1Trade=z.object({id:z.number().int(),ticker,buyPrice:z.number().positive(),shares:z.number().positive(),date:z.string(),target:z.number().finite(),maxLoss:z.number().finite(),thesis:z.string(),invalidation:z.string(),holding:z.string(),closed:z.boolean().optional(),sellPrice:z.number().finite().optional()});
const trade=z.object({id:z.number().int(),ticker,buyPrice:z.number().positive(),shares:z.number().positive(),date:z.string(),intendedWeightPercent:z.number().finite(),actualWeightPercentAtEntry:z.number().finite(),buyDriver:z.string(),upcomingEventStatus:z.string(),targetPrice:z.number().finite(),maximumLossPercent:z.number().finite(),thesis:z.string(),invalidationCondition:z.string(),exitPlan:z.string(),expectedHoldingPeriod:z.string(),checklistScoreAtEntry:z.number().finite(),checklistWarningsAtEntry:z.array(warning),createdAt:z.string(),closedAt:z.string().optional(),sellPrice:z.number().finite().optional(),realizedPnL:z.number().finite().optional(),realizedReturnPercent:z.number().finite().optional(),target:z.number().finite().optional(),maxLoss:z.number().finite().optional(),invalidation:z.string().optional(),holding:z.string().optional(),closed:z.boolean().optional()});
const transaction=z.object({id:z.string(),tradeId:z.number().int(),type:z.enum(["buy","sell"]),ticker,price:z.number().positive(),shares:z.number().positive(),amount:z.number().nonnegative(),occurredAt:z.string()});
const journal=z.object({tradeId:z.number().int(),buyReason:z.string(),sellReason:z.string(),emotionalState:z.string(),whatWentWell:z.string(),whatWentWrong:z.string(),thesisCorrect:z.string(),processCorrect:z.string(),lessonsLearned:z.string(),mistakeCategories:z.array(z.string())});
export const userDataV1Schema=z.object({version:z.literal(1),watchlist:z.array(watchlist),trades:z.array(v1Trade),checklistDrafts:z.record(ticker,checklist).default({}),journals:z.record(z.string(),journal).default({})});
export const userDataSchema=z.object({version:z.literal(2),account:z.object({initialCash:z.number().nonnegative(),cashBalance:z.number().nonnegative(),transactions:z.array(transaction)}),watchlist:z.array(watchlist),trades:z.array(trade),checklistDrafts:z.record(ticker,checklist).default({}),journals:z.record(z.string(),journal).default({})});

export function emptyUserData(initialCash=25000):UserData{return{version:2,account:{initialCash,cashBalance:initialCash,transactions:[]},watchlist:[],trades:[],checklistDrafts:{},journals:{}}}

export function migrateV1ToV2(input:UserDataV1):UserData{
  const finalLegacyCash=6000;
  const trades:TradeRecord[]=input.trades.map(old=>{const realizedPnL=old.closed&&old.sellPrice?calculateRealizedPnL(old.buyPrice,old.sellPrice,old.shares):undefined;return{id:old.id,ticker:old.ticker,buyPrice:old.buyPrice,shares:old.shares,date:old.date,intendedWeightPercent:0,actualWeightPercentAtEntry:0,buyDriver:"Migrated from v1",upcomingEventStatus:"Unknown",targetPrice:old.target,maximumLossPercent:old.maxLoss,thesis:old.thesis,invalidationCondition:old.invalidation,exitPlan:"Reassess using the saved invalidation condition.",expectedHoldingPeriod:old.holding,checklistScoreAtEntry:0,checklistWarningsAtEntry:[],createdAt:`${old.date}T12:00:00.000Z`,closed:old.closed,closedAt:old.closed?`${old.date}T12:00:00.000Z`:undefined,sellPrice:old.sellPrice,realizedPnL,realizedReturnPercent:realizedPnL===undefined?undefined:realizedPnL/calculatePurchaseCost(old.buyPrice,old.shares)*100,target:old.target,maxLoss:old.maxLoss,invalidation:old.invalidation,holding:old.holding}});
  const transactions=trades.flatMap(trade=>{const buy={id:`buy-${trade.id}`,tradeId:trade.id,type:"buy" as const,ticker:trade.ticker,price:trade.buyPrice,shares:trade.shares,amount:calculatePurchaseCost(trade.buyPrice,trade.shares),occurredAt:trade.createdAt};return trade.closedAt&&trade.sellPrice?[buy,{id:`sell-${trade.id}`,tradeId:trade.id,type:"sell" as const,ticker:trade.ticker,price:trade.sellPrice,shares:trade.shares,amount:trade.sellPrice*trade.shares,occurredAt:trade.closedAt}]:[buy]});
  const netOutflow=transactions.reduce((sum,tx)=>sum+(tx.type==="buy"?tx.amount:-tx.amount),0);
  return{version:2,account:{initialCash:finalLegacyCash+netOutflow,cashBalance:finalLegacyCash,transactions},watchlist:input.watchlist,trades,checklistDrafts:input.checklistDrafts,journals:input.journals};
}

export function getBrowserStorage():Storage|undefined{try{return typeof window==="undefined"?undefined:window.localStorage}catch{return undefined}}
export function readThemePreference(storage?:Storage):"light"|"dark"{try{return storage?.getItem(THEME_STORAGE_KEY)==="dark"?"dark":"light"}catch{return"light"}}
export function writeThemePreference(theme:"light"|"dark",storage?:Storage):boolean{try{storage?.setItem(THEME_STORAGE_KEY,theme);return Boolean(storage)}catch{return false}}
export function readUserData(storage?:Storage):{data:UserData;recovered:boolean;hasSavedData:boolean;migrated:boolean}{
  if(!storage)return{data:emptyUserData(),recovered:false,hasSavedData:false,migrated:false};
  try{const current=storage.getItem(USER_DATA_STORAGE_KEY);if(current){const parsed=userDataSchema.safeParse(JSON.parse(current));return parsed.success?{data:parsed.data as UserData,recovered:false,hasSavedData:true,migrated:false}:{data:emptyUserData(),recovered:true,hasSavedData:true,migrated:false}}
    const legacy=storage.getItem(LEGACY_USER_DATA_STORAGE_KEY);if(!legacy)return{data:emptyUserData(),recovered:false,hasSavedData:false,migrated:false};const parsed=userDataV1Schema.safeParse(JSON.parse(legacy));if(!parsed.success)return{data:emptyUserData(),recovered:true,hasSavedData:true,migrated:false};const data=migrateV1ToV2(parsed.data as UserDataV1);writeUserData(data,storage);return{data,recovered:false,hasSavedData:true,migrated:true};
  }catch{return{data:emptyUserData(),recovered:true,hasSavedData:true,migrated:false}}
}
export function writeUserData(data:UserData,storage?:Storage):boolean{if(!storage)return false;const parsed=userDataSchema.safeParse(data);if(!parsed.success)return false;try{storage.setItem(USER_DATA_STORAGE_KEY,JSON.stringify(parsed.data));return true}catch{return false}}
