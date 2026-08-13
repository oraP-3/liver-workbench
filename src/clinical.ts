import {
  childPugh,
  fib3,
  fib4,
  japanAlcoholicHepatitisScore,
  lille,
  maddreyDiscriminantFunction,
  meld,
  meldNa,
  mgDlToUmolLBilirubin
} from "./scores.js";
import type { Assessment } from "./types";

const LAB_LABELS: Record<string, string> = {
  ast: "AST",
  alt: "ALT",
  platelets: "血小板",
  totalBilirubin: "T-Bil",
  albumin: "Alb",
  inr: "PT-INR",
  creatinine: "Cr",
  sodium: "Na"
};

export const required = (assessment: Assessment, keys: string[]) =>
  keys.filter((key) => assessment.labs[key as keyof Assessment["labs"]] == null).map((key) => LAB_LABELS[key] ?? key);

export function commonScores(assessment: Assessment) {
  const labs = assessment.labs;
  const age = assessment.age;
  const childMissing = [
    ...required(assessment, ["totalBilirubin", "albumin", "inr"]),
    (!assessment.findings.ascites || assessment.findings.ascites === "unknown") && "腹水",
    (!assessment.findings.encephalopathy || assessment.findings.encephalopathy === "unknown") && "肝性脳症"
  ].filter(Boolean) as string[];
  const meldMissing = [
    ...required(assessment, ["totalBilirubin", "inr", "creatinine"]),
    (!assessment.findings.dialysis || assessment.findings.dialysis === "unknown") && "透析の有無"
  ].filter(Boolean) as string[];
  const sodiumMissing = required(assessment, ["sodium"]);

  return {
    fib4: {
      value: fib4({ age, ast: labs.ast, alt: labs.alt, platelets104: labs.platelets }),
      missing: [age == null && "評価時点年齢", ...required(assessment, ["ast", "alt", "platelets"])].filter(Boolean)
    },
    fib3: {
      value: fib3({ ast: labs.ast, alt: labs.alt, platelets104: labs.platelets }),
      missing: required(assessment, ["ast", "alt", "platelets"])
    },
    child: {
      value: childMissing.length
        ? null
        : childPugh({
            bilirubin: labs.totalBilirubin,
            albumin: labs.albumin,
            inr: labs.inr,
            ascites: assessment.findings.ascites,
            encephalopathy: assessment.findings.encephalopathy
          }),
      missing: childMissing
    },
    meld: {
      value: meldMissing.length
        ? null
        : meld({
            bilirubin: labs.totalBilirubin,
            inr: labs.inr,
            creatinine: labs.creatinine,
            dialysis: assessment.findings.dialysis === "yes"
          }),
      missing: meldMissing
    },
    meldNa: {
      value: meldMissing.length || sodiumMissing.length
        ? null
        : meldNa({
            bilirubin: labs.totalBilirubin,
            inr: labs.inr,
            creatinine: labs.creatinine,
            sodium: labs.sodium,
            dialysis: assessment.findings.dialysis === "yes"
          }),
      missing: [...meldMissing, ...sodiumMissing]
    }
  };
}

export function aldScores(day0: Assessment, day7: Assessment) {
  const labs = day0.labs;
  const complicationsKnown =
    typeof day0.findings.dic === "boolean" && typeof day0.findings.gastrointestinalBleeding === "boolean";
  const renalKnown = day0.findings.renalInsufficiency && day0.findings.renalInsufficiency !== "unknown";

  return {
    jas: complicationsKnown
      ? japanAlcoholicHepatitisScore({
          whiteBloodCellCount: labs.wbc,
          creatinine: labs.creatinine,
          inr: labs.inr,
          prothrombinActivity: labs.inr == null ? labs.ptActivity : null,
          totalBilirubin: labs.totalBilirubin,
          gastrointestinalBleedingOrDic:
            day0.findings.dic === true || day0.findings.gastrointestinalBleeding === true,
          age: day0.age
        })
      : null,
    mdf: maddreyDiscriminantFunction({
      prothrombinTimeSeconds: labs.ptSeconds,
      controlProthrombinTimeSeconds: labs.controlPtSeconds,
      totalBilirubin: labs.totalBilirubin
    }),
    lille: renalKnown
      ? lille({
          age: day0.age,
          albuminDay0GPerL: labs.albumin == null ? null : labs.albumin * 10,
          bilirubinDay0UmolL: mgDlToUmolLBilirubin(labs.totalBilirubin),
          bilirubinDay7UmolL: mgDlToUmolLBilirubin(day7.labs.totalBilirubin),
          prothrombinTimeSeconds: labs.ptSeconds,
          renalInsufficiency: day0.findings.renalInsufficiency === "yes"
        })
      : null
  };
}
