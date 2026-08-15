import type {
  Assessment,
  CaseRecord,
  Facility,
  Findings,
  Labs,
  LiverFailureAssessment,
  MedicationExposure,
  Timing,
  Treatments,
  ViralHepatitisAssessment,
} from "./types";

export const SCHEMA_VERSION = 5 as const;

export const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(16).slice(2)}`;

export const emptyLabs = (): Labs => ({
  ast: null,
  alt: null,
  platelets: null,
  totalBilirubin: null,
  albumin: null,
  inr: null,
  creatinine: null,
  sodium: null,
  igg: null,
  wbc: null,
  ptActivity: null,
  ptSeconds: null,
  controlPtSeconds: null,
  weight: null,
  egfr: null,
});

export const emptyFindings = (): Findings => ({
  ascites: "unknown",
  encephalopathy: "unknown",
  cholestaticChild: false,
  dialysis: "unknown",
  ana: "",
  asma: "",
  lkm1: "unknown",
  sla: "unknown",
  histology: "unknown",
  viralExcluded: "unknown",
  otherCausesExcluded: "unknown",
  liverAtrophy: "unknown",
  renalInsufficiency: "unknown",
  bacterialInfection: "unknown",
  dic: "unknown",
  gastrointestinalBleeding: "unknown",
});

export const emptyTreatments = (): Treatments => ({
  pslResponse: "unknown",
  clinicalCourse: "unknown",
});

export const emptyLiverFailure = (): LiverFailureAssessment => ({
  onsetToEncephalopathyDays: null,
  acuteExacerbationDays: null,
  vasopressor: "unknown",
  pao2Fio2: null,
  spo2Fio2: null,
});

export const emptyViralHepatitis = (): ViralHepatitisAssessment => ({
  hbvDnaLogIU: null,
  hbvDnaDetected: "unknown",
  hbeAg: "unknown",
  hbsAg: "unknown",
  hbsAb: "unknown",
  hbcAb: "unknown",
  igmHbcAbIndex: null,
  hbcrAgLogU: null,
  fibrosisF2Plus: "unknown",
  hccFamilyHistory: "unknown",
  renalBoneRisk: "unknown",
  hcvRnaDetected: "unknown",
  hcvGenotype: "unknown",
  hcvTreatmentHistory: "unknown",
  p32Deletion: "unknown",
});

export const emptyFacility = (): Facility => ({
  id: uid("facility"),
  name: "",
  astUln: null,
  altUln: null,
  alpUln: null,
  iggUln: null,
  sweUnit: null,
  sweCutoff: null,
  performsTransplant: "unknown",
});

export const snapshotFacility = (facility: Facility | null | undefined) =>
  facility ? structuredClone(facility) : null;

export const emptyAssessment = (
  facility: Facility | null = null,
  age: number | null = null,
  label = "初回評価",
): Assessment => ({
  id: uid("assessment"),
  label,
  timing: { absoluteDate: null, relativeDay: null },
  age,
  facilitySnapshot: snapshotFacility(facility),
  labs: emptyLabs(),
  findings: emptyFindings(),
  treatments: emptyTreatments(),
  liverFailure: emptyLiverFailure(),
  viralHepatitis: emptyViralHepatitis(),
  selectedClinicalContexts: [],
  note: "",
});

export const emptyMedication = (): MedicationExposure => ({
  id: uid("medication"),
  name: "",
  start: { absoluteDate: null, relativeDay: null },
  stop: { absoluteDate: null, relativeDay: null },
  reexposure: "unknown",
  suspicion: "unknown",
  note: "",
});

export const emptyCase = (facility: Facility | null = null): CaseRecord => {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid("case"),
    caseCode: "",
    demographics: { sex: "unknown", ageAtBaseline: null },
    baselineDate: null,
    assessments: [emptyAssessment(facility)],
    medications: [],
    createdAt: now,
    updatedAt: now,
  };
};

const asIsoDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const addDays = (date: string, days: number) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};

const dayDifference = (later: string, earlier: string) =>
  Math.round(
    (new Date(`${later}T00:00:00Z`).getTime() -
      new Date(`${earlier}T00:00:00Z`).getTime()) /
      86400000,
  );

export function syncTiming(
  assessment: Assessment,
  baselineDate: string | null,
  editedField: keyof Timing,
): Assessment {
  const next = structuredClone(assessment);
  const baseline = asIsoDate(baselineDate);
  if (!baseline) return next;
  if (editedField === "absoluteDate" && next.timing.absoluteDate) {
    next.timing.absoluteDate = asIsoDate(next.timing.absoluteDate);
    if (next.timing.absoluteDate) {
      next.timing.relativeDay = dayDifference(
        next.timing.absoluteDate,
        baseline,
      );
    }
  }
  if (
    editedField === "relativeDay" &&
    Number.isFinite(next.timing.relativeDay)
  ) {
    next.timing.absoluteDate = addDays(
      baseline,
      next.timing.relativeDay as number,
    );
  }
  return next;
}

export function syncMedicationTiming(
  exposure: MedicationExposure,
  baselineDate: string | null,
  edge: "start" | "stop",
  editedField: keyof Timing,
): MedicationExposure {
  const next = structuredClone(exposure);
  const baseline = asIsoDate(baselineDate);
  if (!baseline) return next;
  if (editedField === "absoluteDate" && next[edge].absoluteDate) {
    const absolute = asIsoDate(next[edge].absoluteDate);
    next[edge].absoluteDate = absolute;
    if (absolute) next[edge].relativeDay = dayDifference(absolute, baseline);
  }
  if (
    editedField === "relativeDay" &&
    Number.isFinite(next[edge].relativeDay)
  ) {
    next[edge].absoluteDate = addDays(
      baseline,
      next[edge].relativeDay as number,
    );
  }
  return next;
}

export const createAssessmentForCase = (
  record: CaseRecord,
  facility: Facility | null,
) =>
  emptyAssessment(
    facility,
    record.demographics.ageAtBaseline,
    `評価 ${record.assessments.length + 1}`,
  );
