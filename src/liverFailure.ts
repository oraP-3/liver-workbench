import { commonScores } from "./clinical";
import type { Assessment } from "./types";

export type CriterionState = "met" | "not-met" | "unknown";

export interface Criterion {
  id: string;
  label: string;
  state: CriterionState;
  detail: string;
}

const threshold = (
  value: number | null,
  predicate: (value: number) => boolean,
): CriterionState =>
  value == null ? "unknown" : predicate(value) ? "met" : "not-met";

const anyOf = (values: CriterionState[]): CriterionState => {
  if (values.includes("met")) return "met";
  if (values.includes("unknown")) return "unknown";
  return "not-met";
};

const tri = (value: "yes" | "no" | "unknown"): CriterionState =>
  value === "yes" ? "met" : value === "no" ? "not-met" : "unknown";

export function acuteLiverFailureCoagulation(
  assessment: Assessment,
): Criterion {
  const { inr, ptActivity } = assessment.labs;
  return {
    id: "alf-coagulation",
    label: "PT活性40%以下、またはPT-INR 1.5以上",
    state: anyOf([
      threshold(ptActivity, (value) => value <= 40),
      threshold(inr, (value) => value >= 1.5),
    ]),
    detail: `PT活性 ${ptActivity ?? "—"}% / PT-INR ${inr ?? "—"}`,
  };
}

export function aclfEntryCriteria(
  baseline: Assessment | null,
  current: Assessment,
): Criterion[] {
  const baselineChild = baseline ? commonScores(baseline).child.value : null;
  const { acuteExacerbationDays } = current.liverFailure;
  return [
    {
      id: "baseline-child",
      label: "増悪前Child-Pugh 5〜9点",
      state:
        baselineChild == null
          ? "unknown"
          : baselineChild.score >= 5 && baselineChild.score <= 9
            ? "met"
            : "not-met",
      detail:
        baselineChild == null
          ? "増悪前評価時点のChild-Pughを算出できません"
          : `${baselineChild.score}点 / Class ${baselineChild.class}`,
    },
    {
      id: "within-28-days",
      label: "増悪要因から28日以内",
      state: threshold(
        acuteExacerbationDays,
        (value) => value >= 0 && value <= 28,
      ),
      detail:
        acuteExacerbationDays == null ? "—" : `${acuteExacerbationDays}日`,
    },
    {
      id: "aclf-coagulation",
      label: "PT活性40%以下、またはPT-INR 1.5以上",
      state: acuteLiverFailureCoagulation(current).state,
      detail: acuteLiverFailureCoagulation(current).detail,
    },
    {
      id: "aclf-bilirubin",
      label: "T-Bil 5.0 mg/dL以上",
      state: threshold(current.labs.totalBilirubin, (value) => value >= 5),
      detail: `T-Bil ${current.labs.totalBilirubin ?? "—"} mg/dL`,
    },
  ];
}

export function aclfOrganFailureCriteria(assessment: Assessment): Criterion[] {
  const { labs, findings, liverFailure } = assessment;
  return [
    {
      id: "organ-liver",
      label: "肝臓：T-Bil 12 mg/dL以上",
      state: threshold(labs.totalBilirubin, (value) => value >= 12),
      detail: `T-Bil ${labs.totalBilirubin ?? "—"} mg/dL`,
    },
    {
      id: "organ-kidney",
      label: "腎臓：Cr 2 mg/dL以上、または血液透析",
      state: anyOf([
        threshold(labs.creatinine, (value) => value >= 2),
        tri(findings.dialysis),
      ]),
      detail: `Cr ${labs.creatinine ?? "—"} mg/dL / 透析 ${triLabel(findings.dialysis)}`,
    },
    {
      id: "organ-brain",
      label: "中枢神経：昏睡III度以上の肝性脳症",
      state:
        findings.encephalopathy === "unknown" ||
        findings.encephalopathy === "grade12"
          ? "unknown"
          : findings.encephalopathy === "grade34"
            ? "met"
            : "not-met",
      detail: encephalopathyLabel(findings.encephalopathy),
    },
    {
      id: "organ-coagulation",
      label: "凝固：PT-INR 2.5超、または血小板2万/µL以下",
      state: anyOf([
        threshold(labs.inr, (value) => value > 2.5),
        threshold(labs.platelets, (value) => value <= 2),
      ]),
      detail: `PT-INR ${labs.inr ?? "—"} / 血小板 ${labs.platelets ?? "—"}万/µL`,
    },
    {
      id: "organ-circulation",
      label: "循環器：ドパミンまたはドブタミン投与",
      state: tri(liverFailure.vasopressor),
      detail: triLabel(liverFailure.vasopressor),
    },
    {
      id: "organ-respiration",
      label: "呼吸器：P/F比200未満、またはS/F比200未満",
      state: anyOf([
        threshold(liverFailure.pao2Fio2, (value) => value < 200),
        threshold(liverFailure.spo2Fio2, (value) => value < 200),
      ]),
      detail: `P/F ${liverFailure.pao2Fio2 ?? "—"} / S/F ${liverFailure.spo2Fio2 ?? "—"}`,
    },
  ];
}

export const liverFailureDefinition = (context: string) =>
  ({
    "lf-alf-noncoma": {
      title: "急性肝不全 非昏睡型",
      text: "肝障害発症前の肝機能が正常と推定され、初発症状から8週以内に凝固条件を満たし、肝性脳症がI度以下の病態です。",
    },
    "lf-alf-acute": {
      title: "急性肝不全 昏睡型・急性型",
      text: "急性肝不全の凝固条件を満たし、初発症状から10日以内にII度以上の肝性脳症を生じる病態です。",
    },
    "lf-alf-subacute": {
      title: "急性肝不全 昏睡型・亜急性型",
      text: "急性肝不全の凝固条件を満たし、初発症状から11〜56日でII度以上の肝性脳症を生じる病態です。",
    },
    "lf-lohf": {
      title: "遅発性肝不全（LOHF）",
      text: "初発症状から8〜24週（57〜168日）でII度以上の肝性脳症を生じる病態として扱われます。",
    },
    "lf-aclf": {
      title: "Acute-on-chronic liver failure（ACLF）",
      text: "Child-Pugh 5〜9点の肝硬変に急性増悪要因が加わり、28日以内に凝固条件とT-Bil 5.0 mg/dL以上をともに満たす国内診断基準です。",
    },
  })[context] ?? null;

export function encephalopathyMatchesSelectedContext(
  context: string,
  assessment: Assessment,
): Criterion | null {
  if (!context.startsWith("lf-alf") && context !== "lf-lohf") return null;
  const grade = assessment.findings.encephalopathy;
  const days = assessment.liverFailure.onsetToEncephalopathyDays;
  let state: CriterionState = "unknown";
  if (grade !== "unknown" && grade !== "grade12") {
    if (context === "lf-alf-noncoma") {
      state = grade === "none" || grade === "grade1" ? "met" : "not-met";
    } else {
      const coma = grade === "grade2" || grade === "grade34";
      if (days != null) {
        const timingMatches =
          context === "lf-alf-acute"
            ? days >= 0 && days <= 10
            : context === "lf-alf-subacute"
              ? days >= 11 && days <= 56
              : days >= 57 && days <= 168;
        state = coma && timingMatches ? "met" : "not-met";
      }
    }
  }
  return {
    id: "encephalopathy-timing",
    label:
      context === "lf-alf-noncoma"
        ? "肝性脳症I度以下"
        : "肝性脳症II度以上と発症後日数",
    state,
    detail: `${encephalopathyLabel(grade)} / ${days == null ? "発症後日数 —" : `発症後${days}日`}`,
  };
}

const triLabel = (value: "yes" | "no" | "unknown") =>
  ({ yes: "あり", no: "なし", unknown: "未入力" })[value];

const encephalopathyLabel = (value: Assessment["findings"]["encephalopathy"]) =>
  ({
    none: "なし",
    grade1: "I度",
    grade2: "II度",
    grade12: "I〜II度（旧入力）",
    grade34: "III〜IV度",
    unknown: "未入力",
  })[value];
