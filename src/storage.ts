import type { Backup, CaseRecord, Facility } from "./types";
import { SCHEMA_VERSION } from "./model";
const DB="liver-workbench", STORE="records", MAX=5*1024*1024;
const open=()=>new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(DB,3);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
const request=<T>(mode:IDBTransactionMode,operation:(store:IDBObjectStore)=>IDBRequest<T>)=>open().then(db=>new Promise<T>((resolve,reject)=>{const tx=db.transaction(STORE,mode);const req=operation(tx.objectStore(STORE));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();}));
export const loadCases=async()=>await request<CaseRecord[]>("readonly",s=>s.get("cases"))??[];
export const loadFacilities=async()=>await request<Facility[]>("readonly",s=>s.get("facilities"))??[];
export const saveAll=async(cases:CaseRecord[],facilities:Facility[])=>{await request("readwrite",s=>s.put(cases,"cases"));await request("readwrite",s=>s.put(facilities,"facilities"));};
export function migrateV2(value:any):CaseRecord { if(value?.schemaVersion===3)return structuredClone(value);if(value?.schemaVersion!==2)throw new Error("未対応のschema versionです");return {...structuredClone(value),schemaVersion:3,assessments:(value.assessments??[]).map((a:any)=>({age:null,selectedClinicalContexts:[],note:"",...a})),medications:value.medications??[]}; }
const facilityValid=(f:any):f is Facility=>f&&typeof f.id==="string"&&typeof f.name==="string";
const caseValid=(c:any)=>c&&typeof c.id==="string"&&typeof c.caseCode==="string"&&Array.isArray(c.assessments)&&Array.isArray(c.medications);
export function validateBackup(text:string):Backup {if(new Blob([text]).size>MAX)throw new Error("サイズ上限（5 MB）を超えています");let raw:any;try{raw=JSON.parse(text);}catch{throw new Error("JSONの形式が不正です");}if(raw?.schemaVersion!==2&&raw?.schemaVersion!==3)throw new Error("未対応のschema versionです");if(!Array.isArray(raw.facilities)||!Array.isArray(raw.cases)||!raw.facilities.every(facilityValid)||!raw.cases.every(caseValid))throw new Error("バックアップの型が不正です");return {schemaVersion:3,appVersion:String(raw.appVersion??"legacy"),exportedAt:String(raw.exportedAt??new Date().toISOString()),facilities:structuredClone(raw.facilities),cases:raw.cases.map(migrateV2)};}
export const collisions=(incoming:CaseRecord[],existing:CaseRecord[])=>incoming.map(c=>c.caseCode).filter(code=>existing.some(c=>c.caseCode===code));
export const mergeSkippingCollisions=(incoming:CaseRecord[],existing:CaseRecord[])=>[...existing,...incoming.filter(c=>!existing.some(e=>e.caseCode===c.caseCode))];
export const createBackup=(cases:CaseRecord[],facilities:Facility[]):Backup=>({schemaVersion:SCHEMA_VERSION,appVersion:__APP_VERSION__,exportedAt:new Date().toISOString(),facilities:structuredClone(facilities),cases:structuredClone(cases)});
