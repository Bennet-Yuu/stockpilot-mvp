import { NextResponse } from "next/server";
import { tickerList, type Ticker } from "../../../data";
import { researchProvider, researchReportSchema } from "../../../providers/research";

export async function GET(_request:Request,{params}:{params:Promise<{ticker:string}>}){
  const value=(await params).ticker.toUpperCase();
  if(!tickerList.includes(value as Ticker))return NextResponse.json({error:"Unsupported ticker"},{status:400});
  const parsed=researchReportSchema.safeParse(researchProvider.getReport(value as Ticker));
  if(!parsed.success)return NextResponse.json({error:"Mock research failed validation"},{status:500});
  return NextResponse.json({ticker:value,asOf:"2026-07-13",sample:true,disclaimer:"Demo analysis based on sample data. Not investment advice.",sections:parsed.data});
}
