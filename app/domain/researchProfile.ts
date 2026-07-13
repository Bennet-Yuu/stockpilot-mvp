import type { Stock } from "../data";

export type ResearchDimension={label:"Financial Quality"|"Growth Durability"|"Valuation Context"|"Risk Resilience"|"Research Completeness";score:number;max:number;meaning:string;supportingMetric:string;rule:string;dataType:"Sample provider fact"|"Deterministic calculation"};
export type ResearchProfile={score:number;momentum:number;asOf:string;version:string;dimensions:ResearchDimension[]};
export function calculateResearchProfile(stock:Stock):ResearchProfile{
  const pe=parseMetric(stock.forwardPe),growth=parseMetric(stock.growth),margin=parseMetric(stock.margin),fcf=parseMetric(stock.fcf);
  const dimensions:ResearchDimension[]=[
    dim("Financial Quality",clamp(Math.round(margin/2+Math.min(fcf,100)/10),0,25),25,"Cash generation and margin strength.",`${stock.margin} margin; ${stock.fcf} FCF`,`Margin and free-cash-flow bands, capped at 25.`),
    dim("Growth Durability",clamp(Math.round(growth*.65),0,20),20,"Scale and durability of current growth.",`${stock.growth} sample revenue growth`,`Revenue-growth bands, capped at 20.`),
    dim("Valuation Context",clamp(Math.round(20-(pe-15)*.55),0,20),20,"How demanding the sample multiple is.",`${stock.forwardPe} forward P/E`,`Lower positive multiples receive more context coverage.`),
    dim("Risk Resilience",clamp(Math.round(margin/3+8),0,20),20,"Capacity to absorb operating setbacks.",`${stock.margin} net margin`,`Margin-based resilience proxy, capped at 20.`),
    dim("Research Completeness",stock.report.length===9?15:Math.min(15,stock.report.length),15,"Coverage of the structured research checklist.",`${stock.report.length}/9 report sections`,`One point per section plus full-coverage bonus.`),
  ];
  const oldMomentum=stock.scores.find(s=>s.label==="Momentum");
  return{score:dimensions.reduce((s,d)=>s+d.score,0),momentum:oldMomentum?oldMomentum.value/oldMomentum.max*100:0,asOf:"2026-07-13",version:"profile-v2.0",dimensions};
}
function dim(label:ResearchDimension["label"],score:number,max:number,meaning:string,supportingMetric:string,rule:string):ResearchDimension{return{label,score,max,meaning,supportingMetric,rule,dataType:"Deterministic calculation"}}
const parseMetric=(value:string)=>Number(value.replace(/[^0-9.-]/g,""))||0;
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
