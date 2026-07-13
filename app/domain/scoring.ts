import type { Stock } from "../data";
import type { ChecklistInput, ChecklistWarning, ReadinessResult, TradePlan } from "./models";
import { validateTradePlan } from "./portfolio";

export function calculateEvidenceScore(stock:Pick<Stock,"scores">):number{return Math.max(0,Math.min(100,stock.scores.reduce((sum,item)=>sum+(item.label==="Momentum"?0:item.value),0)))}

export function calculateReadiness(input:ChecklistInput, plan?:TradePlan, cash=Infinity):ReadinessResult {
  const fields=[input.why,input.holding,input.invalidation,input.maxLoss,input.weight,input.driver,input.event,input.target,input.exit];
  const completedCount=fields.filter(value=>value.trim()).length;
  let score=Math.round(completedCount/fields.length*70);
  if(input.invalidation.trim().length>20)score+=10;
  if(withinGuardrail(input.weight,10))score+=10;
  if(withinGuardrail(input.maxLoss,20))score+=5;
  if(input.event==="No")score+=5;
  const warnings:ChecklistWarning[]=[];
  if(!input.invalidation.trim())warnings.push(warn("MISSING_INVALIDATION","serious","Define what evidence would invalidate your thesis."));
  if(!input.exit.trim())warnings.push(warn("MISSING_EXIT_PLAN","serious","Write an exit or reassessment plan before creating a trade."));
  const weight=Number(input.weight), loss=Number(input.maxLoss), target=Number(input.target);
  if(!validPercent(weight)||!validPercent(loss))warnings.push(warn("INVALID_NUMBER","serious","Position size and maximum loss must be numbers greater than 0 and no more than 100%."));
  if(!Number.isFinite(target)||target<=0)warnings.push(warn("INVALID_TARGET","serious","Target price must be a valid number greater than 0."));
  if(weight>20)warnings.push(warn("OVERSIZED_POSITION","serious","Position size above 20% creates concentration risk."));
  else if(weight>10)warnings.push(warn("OVERSIZED_POSITION","general","Position size above 10% deserves an explicit concentration review."));
  if(loss>20)warnings.push(warn("HIGH_LOSS_LIMIT","general","Maximum acceptable loss above 20% exceeds the beginner guardrail."));
  if(input.event==="Yes")warnings.push(warn("MAJOR_EVENT","general","A major event is approaching. Record a plan before proceeding."));
  if(input.event==="Not sure")warnings.push(warn("EVENT_UNKNOWN","general","Confirm whether earnings or another major event is approaching."));
  if(input.driver==="Recent price movement")warnings.push(warn("MOMENTUM_CHASING","general","Recent price movement alone is not a fundamental thesis."));
  if(plan)warnings.push(...validateTradePlan(plan,cash));
  const requiredValid=completedCount===9&&Boolean(input.why.trim()&&input.invalidation.trim()&&input.exit.trim())&&validPercent(weight)&&validPercent(loss)&&target>0;
  return {score:Math.min(100,score),completedCount,warnings,isValid:requiredValid&&!warnings.some(item=>item.severity==="serious")};
}
const warn=(code:ChecklistWarning["code"],severity:ChecklistWarning["severity"],message:string):ChecklistWarning=>({code,severity,message});
const validPercent=(value:number)=>Number.isFinite(value)&&value>0&&value<=100;
const withinGuardrail=(value:string,max:number)=>{const parsed=Number(value);return Number.isFinite(parsed)&&parsed>0&&parsed<=max};
