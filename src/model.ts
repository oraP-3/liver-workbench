import type { Assessment, CaseRecord, Facility, Medication } from "./types";
export const SCHEMA_VERSION = 3 as const;
export const id = (prefix:string) => `${prefix}-${crypto.randomUUID()}`;
export const emptyFacility = ():Facility => ({id:id("facility"),name:"",astUln:null,altUln:null,alpUln:null,iggUln:null,sweUnit:null,sweCutoff:null,performsTransplant:"unknown"});
export const snapshotFacility = (facility:Facility|null) => facility ? structuredClone(facility) : null;
export const emptyAssessment = (facility:Facility|null=null):Assessment => ({id:id("assessment"),label:"評価",timing:{absoluteDate:null,relativeDay:null},age:null,facilitySnapshot:snapshotFacility(facility),labs:{},findings:{},treatments:{},selectedClinicalContexts:[],note:""});
export const createAssessmentForCase = (record: CaseRecord, facility: Facility | null = null): Assessment => ({ ...emptyAssessment(facility), age: record.demographics.ageAtBaseline });
export const emptyCase = ():CaseRecord => { const now=new Date().toISOString(); return {schemaVersion:3,id:id("case"),caseCode:"",demographics:{sex:"unknown",ageAtBaseline:null},baselineDate:null,assessments:[],medications:[],createdAt:now,updatedAt:now}; };
export const emptyMedication = ():Medication => ({id:id("medication"),name:"",start:{absoluteDate:null,relativeDay:null},stop:{absoluteDate:null,relativeDay:null},reexposure:"unknown",suspicion:"unknown",note:""});
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`));
export function syncTiming(assessment:Assessment,baseline:string|null,edited:"absoluteDate"|"relativeDay"):Assessment { const next=structuredClone(assessment); if(!baseline||!validDate(baseline)) return next; if(edited==="absoluteDate"&&next.timing.absoluteDate&&validDate(next.timing.absoluteDate)){next.timing.relativeDay=Math.round((Date.parse(`${next.timing.absoluteDate}T00:00:00Z`)-Date.parse(`${baseline}T00:00:00Z`))/86400000);} if(edited==="relativeDay"&&Number.isFinite(next.timing.relativeDay)){const d=new Date(`${baseline}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+(next.timing.relativeDay as number));next.timing.absoluteDate=d.toISOString().slice(0,10);} return next; }
export function syncMedicationTiming(medication: Medication, baseline: string | null, edge: "start" | "stop", edited: "absoluteDate" | "relativeDay"): Medication {
  if (!baseline || !validDate(baseline)) return structuredClone(medication);
  const next = structuredClone(medication);
  if (edited === "absoluteDate" && next[edge].absoluteDate && validDate(next[edge].absoluteDate!)) {
    next[edge].relativeDay = Math.round((Date.parse(`${next[edge].absoluteDate}T00:00:00Z`) - Date.parse(`${baseline}T00:00:00Z`)) / 86400000);
  } else if (edited === "relativeDay" && Number.isFinite(next[edge].relativeDay)) {
    const date = new Date(`${baseline}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + next[edge].relativeDay!);
    next[edge].absoluteDate = date.toISOString().slice(0, 10);
  }
  return next;
}
