import { z } from "zod";
import {
  emptyAssessment,
  emptyFindings,
  emptyLiverFailure,
  emptyLabs,
  emptyMedication,
  emptyTreatments,
  SCHEMA_VERSION,
} from "./model";
import type { Backup, CaseRecord, Facility } from "./types";

const DB_NAME = "liver-workbench";
const STORE = "records";
const DB_VERSION = 3;
const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

const nullableNumber = z.number().finite().nullable();
const triState = z.enum(["yes", "no", "unknown"]);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

const facilitySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  astUln: nullableNumber,
  altUln: nullableNumber,
  alpUln: nullableNumber,
  iggUln: nullableNumber,
  sweUnit: z.enum(["kPa", "m/s"]).nullable(),
  sweCutoff: nullableNumber,
  performsTransplant: triState,
});

const labsSchema = z.object({
  ast: nullableNumber,
  alt: nullableNumber,
  platelets: nullableNumber,
  totalBilirubin: nullableNumber,
  albumin: nullableNumber,
  inr: nullableNumber,
  creatinine: nullableNumber,
  sodium: nullableNumber,
  igg: nullableNumber,
  wbc: nullableNumber,
  ptActivity: nullableNumber,
  ptSeconds: nullableNumber,
  controlPtSeconds: nullableNumber,
  weight: nullableNumber,
});

const findingsSchema = z.object({
  ascites: z.enum(["none", "controlled", "refractory", "unknown"]),
  encephalopathy: z.enum([
    "none",
    "grade1",
    "grade2",
    "grade12",
    "grade34",
    "unknown",
  ]),
  cholestaticChild: z.boolean(),
  dialysis: triState,
  ana: z.string(),
  asma: z.string(),
  lkm1: triState,
  sla: triState,
  histology: z.enum(["typical", "compatible", "atypical", "unknown"]),
  viralExcluded: triState,
  otherCausesExcluded: triState,
  liverAtrophy: triState,
  renalInsufficiency: triState,
  bacterialInfection: triState,
  dic: triState,
  gastrointestinalBleeding: triState,
});

const liverFailureSchema = z.object({
  onsetToEncephalopathyDays: nullableNumber,
  acuteExacerbationDays: nullableNumber,
  vasopressor: triState,
  pao2Fio2: nullableNumber,
  spo2Fio2: nullableNumber,
});

const assessmentSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  timing: z.object({ absoluteDate: date, relativeDay: nullableNumber }),
  age: nullableNumber,
  facilitySnapshot: facilitySchema.nullable(),
  labs: labsSchema,
  findings: findingsSchema,
  treatments: z.object({
    pslResponse: z.enum(["marked", "present", "absent", "unknown"]),
    clinicalCourse: z.enum([
      "improving",
      "worsening",
      "intolerant",
      "relapse",
      "unknown",
    ]),
  }),
  liverFailure: liverFailureSchema,
  selectedClinicalContexts: z.array(z.string()),
  note: z.string(),
});

const medicationSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  start: z.object({ absoluteDate: date, relativeDay: nullableNumber }),
  stop: z.object({ absoluteDate: date, relativeDay: nullableNumber }),
  reexposure: triState,
  suspicion: z.enum(["high", "possible", "low", "unknown"]),
  note: z.string(),
});

const caseSchema = z.object({
  schemaVersion: z.literal(4),
  id: z.string().min(1),
  caseCode: z.string().min(1),
  demographics: z.object({
    sex: z.enum(["female", "male", "other", "unknown"]),
    ageAtBaseline: nullableNumber,
  }),
  baselineDate: date,
  assessments: z.array(assessmentSchema).min(1),
  medications: z.array(medicationSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const result = indexedDB.open(DB_NAME, DB_VERSION);
    result.onupgradeneeded = () => {
      if (!result.result.objectStoreNames.contains(STORE)) {
        result.result.createObjectStore(STORE);
      }
    };
    result.onsuccess = () => resolve(result.result);
    result.onerror = () => reject(result.error);
  });

async function readValue<T>(key: string, fallback: T): Promise<T> {
  const db = await openDb();
  return await new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).get(key);
    request.onsuccess = () =>
      resolve((request.result as T | undefined) ?? fallback);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function writeValues(values: Record<string, unknown>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    Object.entries(values).forEach(([key, value]) => store.put(value, key));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
}

export async function loadCases(): Promise<CaseRecord[]> {
  const raw = await readValue<unknown[]>("cases", []);
  if (!Array.isArray(raw))
    throw new Error("保存済み症例データを読み取れませんでした。");
  return raw.map(migrateCase).map((item) => caseSchema.parse(item));
}

export async function loadFacilities(): Promise<Facility[]> {
  const raw = await readValue<unknown[]>("facilities", []);
  return z.array(facilitySchema).parse(raw);
}

export const loadLastExportedAt = () =>
  readValue<string | null>("lastExportedAt", null);

export const saveAll = (cases: CaseRecord[], facilities: Facility[]) =>
  writeValues({ cases, facilities });

export const saveFacilities = (facilities: Facility[]) =>
  writeValues({ facilities });

export async function noteExport(exportedAt: string) {
  await writeValues({ lastExportedAt: exportedAt });
}

export function migrateCase(raw: unknown): CaseRecord {
  if (!raw || typeof raw !== "object")
    throw new Error("症例データの形式が不正です。");
  const value = structuredClone(raw) as Record<string, unknown>;
  if (value.schemaVersion === 4) return value as unknown as CaseRecord;
  if (value.schemaVersion !== 2 && value.schemaVersion !== 3)
    throw new Error("未対応のschema versionです。");
  const assessments = Array.isArray(value.assessments) ? value.assessments : [];
  const medications = Array.isArray(value.medications) ? value.medications : [];
  return {
    ...(value as unknown as CaseRecord),
    schemaVersion: SCHEMA_VERSION,
    assessments: assessments.map((item) => {
      const assessment = item as Record<string, unknown>;
      const defaults = emptyAssessment();
      return {
        ...defaults,
        ...assessment,
        timing: {
          ...defaults.timing,
          ...(assessment.timing as object | undefined),
        },
        labs: { ...emptyLabs(), ...(assessment.labs as object | undefined) },
        findings: {
          ...emptyFindings(),
          ...(assessment.findings as object | undefined),
        },
        treatments: {
          ...emptyTreatments(),
          ...(assessment.treatments as object | undefined),
        },
        liverFailure: {
          ...emptyLiverFailure(),
          ...(assessment.liverFailure as object | undefined),
        },
        age:
          typeof assessment.age === "number"
            ? assessment.age
            : ((
                value.demographics as
                  { ageAtBaseline?: number | null } | undefined
              )?.ageAtBaseline ?? null),
        selectedClinicalContexts: Array.isArray(
          assessment.selectedClinicalContexts,
        )
          ? (assessment.selectedClinicalContexts as string[])
          : [],
        note: typeof assessment.note === "string" ? assessment.note : "",
      };
    }),
    medications: medications.map((item) => ({
      ...emptyMedication(),
      ...(item as object),
      start: {
        ...emptyMedication().start,
        ...((item as { start?: object }).start ?? {}),
      },
      stop: {
        ...emptyMedication().stop,
        ...((item as { stop?: object }).stop ?? {}),
      },
    })),
  };
}

export function createBackup(
  cases: CaseRecord[],
  facilities: Facility[],
): Backup {
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: __APP_VERSION__,
    exportedAt: new Date().toISOString(),
    facilities: structuredClone(facilities),
    cases: structuredClone(cases),
  };
}

export function validateBackup(text: string): Backup {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) {
    throw new Error("バックアップがサイズ上限（5 MB）を超えています。");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("JSONとして読み取れませんでした。");
  }
  if (!raw || typeof raw !== "object")
    throw new Error("バックアップ形式が不正です。");
  const source = raw as Record<string, unknown>;
  if (
    source.schemaVersion !== 2 &&
    source.schemaVersion !== 3 &&
    source.schemaVersion !== 4
  ) {
    throw new Error("未対応のschema versionです。");
  }
  try {
    const cases = z.array(z.unknown()).parse(source.cases).map(migrateCase);
    const parsedCases = z.array(caseSchema).parse(cases);
    const facilities = z.array(facilitySchema).parse(source.facilities);
    const codes = parsedCases.map((item) => item.caseCode);
    if (new Set(codes).size !== codes.length) {
      throw new Error("バックアップ内で症例整理番号が重複しています。");
    }
    return {
      schemaVersion: 4,
      appVersion: String(source.appVersion ?? "legacy"),
      exportedAt: String(source.exportedAt ?? new Date().toISOString()),
      facilities,
      cases: parsedCases,
    };
  } catch (error) {
    if (error instanceof Error && !(error instanceof z.ZodError)) throw error;
    throw new Error("症例、評価時点、施設または薬剤歴の型が不正です。", {
      cause: error,
    });
  }
}

export const collisionCodes = (
  incoming: CaseRecord[],
  existing: CaseRecord[],
) =>
  incoming
    .map((item) => item.caseCode)
    .filter((code) => existing.some((saved) => saved.caseCode === code));

export function mergeBackup(
  incoming: CaseRecord[],
  existing: CaseRecord[],
  overwrite: boolean,
) {
  if (!overwrite) {
    return [
      ...existing,
      ...incoming.filter(
        (item) => !existing.some((saved) => saved.caseCode === item.caseCode),
      ),
    ];
  }
  const codes = new Set(incoming.map((item) => item.caseCode));
  return [...existing.filter((item) => !codes.has(item.caseCode)), ...incoming];
}
