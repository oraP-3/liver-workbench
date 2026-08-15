export type TriState = "yes" | "no" | "unknown";
export type Sex = "female" | "male" | "other" | "unknown";

export interface Facility {
  id: string;
  name: string;
  astUln: number | null;
  altUln: number | null;
  alpUln: number | null;
  iggUln: number | null;
  sweUnit: "kPa" | "m/s" | null;
  sweCutoff: number | null;
  performsTransplant: TriState;
}

export interface Timing {
  absoluteDate: string | null;
  relativeDay: number | null;
}

export interface Labs {
  ast: number | null;
  alt: number | null;
  platelets: number | null;
  totalBilirubin: number | null;
  albumin: number | null;
  inr: number | null;
  creatinine: number | null;
  sodium: number | null;
  igg: number | null;
  wbc: number | null;
  ptActivity: number | null;
  ptSeconds: number | null;
  controlPtSeconds: number | null;
  weight: number | null;
  egfr: number | null;
}

export interface Findings {
  ascites: "none" | "controlled" | "refractory" | "unknown";
  encephalopathy:
    "none" | "grade1" | "grade2" | "grade12" | "grade34" | "unknown";
  cholestaticChild: boolean;
  dialysis: TriState;
  ana: string;
  asma: string;
  lkm1: TriState;
  sla: TriState;
  histology: "typical" | "compatible" | "atypical" | "unknown";
  viralExcluded: TriState;
  otherCausesExcluded: TriState;
  liverAtrophy: TriState;
  renalInsufficiency: TriState;
  bacterialInfection: TriState;
  dic: TriState;
  gastrointestinalBleeding: TriState;
}

export interface LiverFailureAssessment {
  onsetToEncephalopathyDays: number | null;
  acuteExacerbationDays: number | null;
  vasopressor: TriState;
  pao2Fio2: number | null;
  spo2Fio2: number | null;
}

export interface ViralHepatitisAssessment {
  hbvDnaLogIU: number | null;
  hbvDnaDetected: TriState;
  hbeAg: TriState;
  hbsAg: TriState;
  hbsAb: TriState;
  hbcAb: TriState;
  igmHbcAbIndex: number | null;
  hbcrAgLogU: number | null;
  fibrosisF2Plus: TriState;
  hccFamilyHistory: TriState;
  renalBoneRisk: TriState;
  hcvRnaDetected: TriState;
  hcvGenotype: "1" | "2" | "mixed12" | "other" | "unknown";
  hcvTreatmentHistory:
    "none" | "ifnProteaseFailure" | "ifnFreeDaaFailure" | "unknown";
  p32Deletion: TriState;
}

export interface Treatments {
  pslResponse: "marked" | "present" | "absent" | "unknown";
  clinicalCourse:
    "improving" | "worsening" | "intolerant" | "relapse" | "unknown";
}

export interface Assessment {
  id: string;
  label: string;
  timing: Timing;
  age: number | null;
  facilitySnapshot: Facility | null;
  labs: Labs;
  findings: Findings;
  treatments: Treatments;
  liverFailure: LiverFailureAssessment;
  viralHepatitis: ViralHepatitisAssessment;
  selectedClinicalContexts: string[];
  note: string;
}

export interface MedicationExposure {
  id: string;
  name: string;
  start: Timing;
  stop: Timing;
  reexposure: TriState;
  suspicion: "high" | "possible" | "low" | "unknown";
  note: string;
}

export interface CaseRecord {
  schemaVersion: 5;
  id: string;
  caseCode: string;
  demographics: { sex: Sex; ageAtBaseline: number | null };
  baselineDate: string | null;
  assessments: Assessment[];
  medications: MedicationExposure[];
  createdAt: string;
  updatedAt: string;
}

export interface Backup {
  schemaVersion: 5;
  appVersion: string;
  exportedAt: string;
  facilities: Facility[];
  cases: CaseRecord[];
}

export type ModuleId =
  "common" | "aih" | "liverFailure" | "hbv" | "hcv" | "ald";
