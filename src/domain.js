export const SCHEMA_VERSION = 2;

const uid = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const isoDate = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};
const addDays = (date, days) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};
const dayDifference = (later, earlier) =>
  Math.round(
    (new Date(`${later}T00:00:00Z`) - new Date(`${earlier}T00:00:00Z`)) /
      86400000,
  );

export function createCase({
  caseCode = "",
  sex = "unknown",
  ageAtBaseline = null,
  baselineDate = null,
} = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid("case"),
    caseCode,
    demographics: { sex, ageAtBaseline },
    baselineDate: isoDate(baselineDate),
    assessments: [],
    medications: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createAssessment({
  label = "評価",
  absoluteDate = null,
  relativeDay = null,
  facilitySnapshot = null,
  labs = {},
  findings = {},
  treatments = {},
} = {}) {
  return {
    id: uid("assessment"),
    label,
    timing: {
      absoluteDate: isoDate(absoluteDate),
      relativeDay: Number.isFinite(relativeDay) ? relativeDay : null,
    },
    facilitySnapshot,
    labs,
    findings,
    treatments,
    selectedClinicalContexts: [],
    note: "",
  };
}

export function synchronizeTiming(assessment, baselineDate, editedField) {
  const next = structuredClone(assessment);
  const baseline = isoDate(baselineDate);
  if (!baseline) return next;
  if (editedField === "absoluteDate" && next.timing.absoluteDate) {
    next.timing.absoluteDate = isoDate(next.timing.absoluteDate);
    next.timing.relativeDay = dayDifference(next.timing.absoluteDate, baseline);
  }
  if (
    editedField === "relativeDay" &&
    Number.isFinite(next.timing.relativeDay)
  ) {
    next.timing.absoluteDate = addDays(baseline, next.timing.relativeDay);
  }
  return next;
}

export function addAssessment(caseRecord, assessment) {
  const next = structuredClone(caseRecord);
  const normalized = next.baselineDate
    ? synchronizeTiming(
        assessment,
        next.baselineDate,
        assessment.timing.absoluteDate ? "absoluteDate" : "relativeDay",
      )
    : structuredClone(assessment);
  next.assessments.push(normalized);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function createMedicationExposure({
  name = "",
  startDate = null,
  stopDate = null,
  startRelativeDay = null,
  stopRelativeDay = null,
  reexposure = "unknown",
  suspicion = "unknown",
  note = "",
} = {}) {
  return {
    id: uid("medication"),
    name,
    start: {
      absoluteDate: isoDate(startDate),
      relativeDay: Number.isFinite(startRelativeDay) ? startRelativeDay : null,
    },
    stop: {
      absoluteDate: isoDate(stopDate),
      relativeDay: Number.isFinite(stopRelativeDay) ? stopRelativeDay : null,
    },
    reexposure,
    suspicion,
    note,
  };
}

export function synchronizeMedicationTiming(exposure, baselineDate) {
  const next = structuredClone(exposure);
  const baseline = isoDate(baselineDate);
  if (!baseline) return next;
  for (const edge of ["start", "stop"]) {
    if (next[edge].absoluteDate)
      next[edge].relativeDay = dayDifference(next[edge].absoluteDate, baseline);
    else if (Number.isFinite(next[edge].relativeDay))
      next[edge].absoluteDate = addDays(baseline, next[edge].relativeDay);
  }
  return next;
}

export function addMedication(caseRecord, exposure) {
  const next = structuredClone(caseRecord);
  next.medications.push(
    synchronizeMedicationTiming(exposure, next.baselineDate),
  );
  next.updatedAt = new Date().toISOString();
  return next;
}

export function migrateLegacyCase(legacy) {
  if (legacy?.schemaVersion === SCHEMA_VERSION) return structuredClone(legacy);
  const data = legacy?.data ?? legacy ?? {};
  const record = createCase({
    caseCode: data.caseId ?? "",
    sex: data.sex ?? "unknown",
    ageAtBaseline: numberOrNull(data.age),
  });
  const assessment = createAssessment({
    label: "移行時評価",
    facilitySnapshot: legacy?.facilityId
      ? { id: legacy.facilityId, name: legacy.facilityName ?? "" }
      : null,
    labs: {
      ast: numberOrNull(data.ast),
      alt: numberOrNull(data.alt),
      totalBilirubin: numberOrNull(data.bilirubin),
      inr: numberOrNull(data.inr),
      igg: numberOrNull(data.igg),
      iggUln: numberOrNull(data.iggUln),
    },
    findings: {
      encephalopathy: data.encephalopathy ?? "unknown",
      liverAtrophy: data.atrophy ?? "unknown",
    },
  });
  return addAssessment(record, assessment);
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
