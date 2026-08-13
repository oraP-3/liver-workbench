import type { Assessment, Backup, CaseRecord, Facility, Medication } from "./types";
import { SCHEMA_VERSION } from "./model";

const DB = "liver-workbench";
const STORE = "records";
const MAX = 5 * 1024 * 1024;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SEX = new Set(["female", "male", "other", "unknown"]);
const TRI = new Set(["yes", "no", "unknown"]);
const finiteOrNull = (value: unknown) => value === null || (typeof value === "number" && Number.isFinite(value));
const dateOrNull = (value: unknown) => value === null || (typeof value === "string" && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const result = indexedDB.open(DB, 3);
    result.onupgradeneeded = () => {
      if (!result.result.objectStoreNames.contains(STORE)) result.result.createObjectStore(STORE);
    };
    result.onsuccess = () => resolve(result.result);
    result.onerror = () => reject(result.error);
  });

const request = <T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) =>
  open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const result = operation(transaction.objectStore(STORE));
        result.onsuccess = () => resolve(result.result);
        result.onerror = () => reject(result.error);
        transaction.oncomplete = () => db.close();
      })
  );

export function migrateV2(value: unknown): CaseRecord {
  if (!object(value)) throw new Error("症例データが不正です");
  if (value.schemaVersion === 3) return structuredClone(value) as unknown as CaseRecord;
  if (value.schemaVersion !== 2) throw new Error("未対応のschema versionです");
  const copy = structuredClone(value) as Record<string, unknown>;
  return {
    ...copy,
    schemaVersion: 3,
    assessments: Array.isArray(copy.assessments)
      ? copy.assessments.map((assessment) => ({ age: null, selectedClinicalContexts: [], note: "", ...assessment }))
      : [],
    medications: Array.isArray(copy.medications) ? copy.medications : []
  } as unknown as CaseRecord;
}

export const loadCases = async () => {
  const original = (await request<unknown[]>("readonly", (store) => store.get("cases"))) ?? [];
  if (!Array.isArray(original)) throw new Error("保存済み症例データが不正です");
  return original.map(migrateV2);
};
export const loadFacilities = async () =>
  (await request<Facility[]>("readonly", (store) => store.get("facilities"))) ?? [];

export const saveAll = async (cases: CaseRecord[], facilities: Facility[]) => {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(cases, "cases");
    transaction.objectStore(STORE).put(facilities, "facilities");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
};
export const saveFacilities = async (facilities: Facility[]) =>
  request("readwrite", (store) => store.put(facilities, "facilities"));

function validFacility(value: unknown): value is Facility {
  if (!object(value)) return false;
  return (
    typeof value.id === "string" && typeof value.name === "string" &&
    ["astUln", "altUln", "alpUln", "iggUln", "sweCutoff"].every((key) => finiteOrNull(value[key])) &&
    (value.sweUnit === null || value.sweUnit === "kPa" || value.sweUnit === "m/s") &&
    TRI.has(String(value.performsTransplant))
  );
}
function validAssessment(value: unknown): value is Assessment {
  if (!object(value) || !object(value.timing) || !object(value.labs) || !object(value.findings)) return false;
  return (
    typeof value.id === "string" && typeof value.label === "string" && finiteOrNull(value.age) &&
    dateOrNull(value.timing.absoluteDate) && finiteOrNull(value.timing.relativeDay) &&
    (value.facilitySnapshot === null || validFacility(value.facilitySnapshot)) &&
    Object.values(value.labs).every(finiteOrNull) && Array.isArray(value.selectedClinicalContexts) &&
    value.selectedClinicalContexts.every((item) => typeof item === "string") && typeof value.note === "string"
  );
}
function validMedication(value: unknown): value is Medication {
  if (!object(value) || !object(value.start) || !object(value.stop)) return false;
  return typeof value.id === "string" && typeof value.name === "string" && dateOrNull(value.start.absoluteDate) &&
    finiteOrNull(value.start.relativeDay) && dateOrNull(value.stop.absoluteDate) && finiteOrNull(value.stop.relativeDay) &&
    TRI.has(String(value.reexposure)) && new Set(["high", "possible", "low", "unknown"]).has(String(value.suspicion)) &&
    typeof value.note === "string";
}
function validCase(value: unknown): value is CaseRecord {
  if (!object(value) || !object(value.demographics)) return false;
  return typeof value.id === "string" && typeof value.caseCode === "string" && value.caseCode.trim() !== "" &&
    SEX.has(String(value.demographics.sex)) && finiteOrNull(value.demographics.ageAtBaseline) && dateOrNull(value.baselineDate) &&
    Array.isArray(value.assessments) && value.assessments.every(validAssessment) && Array.isArray(value.medications) &&
    value.medications.every(validMedication) && typeof value.createdAt === "string" && typeof value.updatedAt === "string";
}

export function validateBackup(text: string): Backup {
  if (new Blob([text]).size > MAX) throw new Error("サイズ上限（5 MB）を超えています");
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("JSONの形式が不正です"); }
  if (!object(raw) || (raw.schemaVersion !== 2 && raw.schemaVersion !== 3)) throw new Error("未対応のschema versionです");
  if (!Array.isArray(raw.facilities) || !raw.facilities.every(validFacility) || !Array.isArray(raw.cases))
    throw new Error("バックアップの施設または症例配列が不正です");
  const cases = raw.cases.map(migrateV2);
  if (!cases.every(validCase)) throw new Error("症例、評価時点、検査値、所見または薬剤歴が不正です");
  const codes = cases.map((record) => record.caseCode);
  if (new Set(codes).size !== codes.length) throw new Error("入力JSON内で症例整理番号が重複しています");
  return { schemaVersion: 3, appVersion: String(raw.appVersion ?? "legacy"), exportedAt: String(raw.exportedAt ?? new Date().toISOString()), facilities: structuredClone(raw.facilities), cases };
}
export const collisions = (incoming: CaseRecord[], existing: CaseRecord[]) => incoming.map((item) => item.caseCode).filter((code) => existing.some((item) => item.caseCode === code));
export const mergeSkippingCollisions = (incoming: CaseRecord[], existing: CaseRecord[]) => [...existing, ...incoming.filter((item) => !existing.some((saved) => saved.caseCode === item.caseCode))];
export const createBackup = (cases: CaseRecord[], facilities: Facility[]): Backup => ({ schemaVersion: SCHEMA_VERSION, appVersion: __APP_VERSION__, exportedAt: new Date().toISOString(), facilities: structuredClone(facilities), cases: structuredClone(cases) });
