export type ParsedReportItem={accountType:string;otherAccountType:string|null;quantity:number;unitPrice:string;sortOrder:number};
export function canonicalMoney(value:unknown):string;
export function parseReportItems(value:unknown):ParsedReportItem[];
export function itemTotals(items:ParsedReportItem[]):{accounts:number;total:string};
export function canonicalItems(items:ParsedReportItem[]):string;
