import type { Ticker } from "../data";
import type { ChecklistInput, JournalRecord } from "./models";
export const blankChecklist=():ChecklistInput=>({why:"",holding:"",invalidation:"",maxLoss:"",weight:"",driver:"",event:"",target:"",exit:""});
export const readChecklistDraft=(drafts:Partial<Record<Ticker,ChecklistInput>>,ticker:Ticker):ChecklistInput=>({...blankChecklist(),...drafts[ticker]});
export const saveChecklistDraft=(drafts:Partial<Record<Ticker,ChecklistInput>>,ticker:Ticker,draft:ChecklistInput)=>({...drafts,[ticker]:{...draft}});
export const readJournalDraft=(journals:Record<string,JournalRecord>,tradeId:number,thesis:string):JournalRecord=>journals[String(tradeId)]?{...journals[String(tradeId)],mistakeCategories:[...journals[String(tradeId)].mistakeCategories]}:{tradeId,buyReason:thesis,sellReason:"",emotionalState:"Calm",whatWentWell:"",whatWentWrong:"",thesisCorrect:"Mostly",processCorrect:"Yes",lessonsLearned:"",mistakeCategories:[]};
export const saveJournalDraft=(journals:Record<string,JournalRecord>,tradeId:number,draft:JournalRecord)=>({...journals,[String(tradeId)]:{...draft,tradeId,mistakeCategories:[...draft.mistakeCategories]}});
