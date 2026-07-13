import { NextResponse } from "next/server";
import { tickerList, type Ticker } from "../../../data";
import { researchProvider, researchReportSchema, type ResearchProvider } from "../../../providers/research";

export function createResearchResponse(rawTicker:unknown,provider:ResearchProvider=researchProvider){
  if(typeof rawTicker!=="string")return NextResponse.json({error:"Invalid ticker"},{status:400});
  try{
    const value=rawTicker.trim().toUpperCase();
    if(!tickerList.includes(value as Ticker))return NextResponse.json({error:"Unsupported ticker"},{status:400});
    const parsed=researchReportSchema.safeParse(provider.getReport(value as Ticker));
    if(!parsed.success)return NextResponse.json({error:"Mock research failed validation"},{status:500});
    return NextResponse.json({ticker:value,asOf:"2026-07-13",sample:true,disclaimer:"Demo analysis based on sample data. Not investment advice.",sections:parsed.data});
  }catch{
    return NextResponse.json({error:"Research provider unavailable"},{status:500});
  }
}

export async function GET(_request:Request,{params}:{params:Promise<{ticker:string}>}){
  try{return createResearchResponse((await params).ticker)}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
}
