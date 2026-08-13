import { emptyCase, emptyFacility } from "./model";
import type { CaseRecord, Facility } from "./types";

export const demoFacility = (): Facility => ({
  ...emptyFacility(),
  name: "デモ施設",
  astUln: 35,
  altUln: 30,
  alpUln: 113,
  iggUln: 1700,
  sweUnit: "kPa",
  sweCutoff: 9.5,
  performsTransplant: "no",
});

const base = (code: string) => {
  const facility = demoFacility();
  const record = emptyCase(facility);
  record.caseCode = code;
  record.demographics = { sex: "female", ageAtBaseline: 52 };
  record.baselineDate = "2026-08-01";
  record.assessments[0].age = 52;
  record.assessments[0].timing = { absoluteDate: "2026-08-01", relativeDay: 0 };
  return { record, facility };
};

export function chronicAihDemo(): CaseRecord {
  const { record } = base("DEMO-AIH-01");
  const assessment = record.assessments[0];
  assessment.label = "治療開始前";
  assessment.labs = {
    ...assessment.labs,
    ast: 186,
    alt: 212,
    platelets: 18.5,
    totalBilirubin: 1.8,
    albumin: 3.5,
    inr: 1.1,
    creatinine: 0.7,
    sodium: 139,
    igg: 2450,
    weight: 55,
  };
  assessment.findings = {
    ...assessment.findings,
    ana: "1:160",
    asma: "negative",
    histology: "typical",
    viralExcluded: "yes",
    otherCausesExcluded: "yes",
    liverAtrophy: "no",
    encephalopathy: "none",
    ascites: "none",
    dialysis: "no",
  };
  assessment.treatments.pslResponse = "marked";
  const follow = structuredClone(assessment);
  follow.id = `${assessment.id}-follow`;
  follow.label = "治療8週後";
  follow.timing = { absoluteDate: "2026-09-26", relativeDay: 56 };
  follow.labs = { ...follow.labs, ast: 24, alt: 27, igg: 1530 };
  record.assessments.push(follow);
  return record;
}

export function acuteAihDemo(): CaseRecord {
  const { record } = base("DEMO-AIH-02");
  const assessment = record.assessments[0];
  assessment.label = "急性発症時";
  assessment.labs = {
    ...assessment.labs,
    ast: 920,
    alt: 1100,
    totalBilirubin: 8.2,
    inr: 1.5,
    igg: 1620,
    weight: 48,
  };
  assessment.findings = {
    ...assessment.findings,
    ana: "negative",
    asma: "negative",
    histology: "compatible",
    viralExcluded: "yes",
    otherCausesExcluded: "yes",
    liverAtrophy: "no",
    encephalopathy: "none",
  };
  assessment.selectedClinicalContexts = ["aih-acute"];
  return record;
}

export function diliDifferentialDemo(): CaseRecord {
  const record = chronicAihDemo();
  record.caseCode = "DEMO-AIH-DILI";
  record.assessments[0].findings.otherCausesExcluded = "unknown";
  record.medications = [
    {
      id: "demo-medication",
      name: "架空薬A",
      start: { absoluteDate: "2026-06-01", relativeDay: -61 },
      stop: { absoluteDate: "2026-08-03", relativeDay: 2 },
      reexposure: "no",
      suspicion: "possible",
      note: "DILIとの鑑別が未確定という表示確認用の架空データ",
    },
  ];
  return record;
}

export function aldDemo(): CaseRecord {
  const { record } = base("DEMO-ALD-01");
  record.demographics.sex = "male";
  const day0 = record.assessments[0];
  day0.label = "ステロイド開始時";
  day0.labs = {
    ...day0.labs,
    wbc: 22000,
    creatinine: 2,
    inr: 2,
    totalBilirubin: 12,
    albumin: 2.8,
    ptSeconds: 22,
    controlPtSeconds: 12,
  };
  day0.findings = {
    ...day0.findings,
    dic: "no",
    gastrointestinalBleeding: "yes",
    bacterialInfection: "no",
    renalInsufficiency: "yes",
  };
  day0.selectedClinicalContexts = ["ald-severe"];
  const day7 = structuredClone(day0);
  day7.id = `${day0.id}-day7`;
  day7.label = "投与1週後";
  day7.timing = { absoluteDate: "2026-08-08", relativeDay: 7 };
  day7.labs.totalBilirubin = 8;
  record.assessments.push(day7);
  return record;
}

export const DEMOS: Record<string, () => CaseRecord> = {
  典型的な慢性AIH: chronicAihDemo,
  "急性発症・自己抗体陰性AIH": acuteAihDemo,
  DILIとの鑑別が未確定のAIH: diliDifferentialDemo,
  "JAS・MDF・Lille確認用ALD": aldDemo,
};
