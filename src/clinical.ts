import {
  childPugh,
  fib3,
  fib4,
  japanAlcoholicHepatitisScore,
  lille,
  maddreyDiscriminantFunction,
  meld,
  meldNa,
  mgDlToUmolLBilirubin,
} from "./scores.js";
import type { Assessment } from "./types";

export interface ScoreResult<T> {
  value: T | null;
  missing: string[];
}

const isNumber = (value: number | null) => Number.isFinite(value);
const missingLabs = (
  assessment: Assessment,
  keys: (keyof Assessment["labs"])[],
) =>
  keys
    .filter((key) => !isNumber(assessment.labs[key]))
    .map((key) => LAB_LABELS[key]);

const LAB_LABELS: Record<keyof Assessment["labs"], string> = {
  ast: "AST",
  alt: "ALT",
  platelets: "血小板",
  totalBilirubin: "T-Bil",
  albumin: "Alb",
  inr: "PT-INR",
  creatinine: "Cr",
  sodium: "Na",
  igg: "IgG",
  wbc: "WBC",
  ptActivity: "PT活性",
  ptSeconds: "患者PT秒",
  controlPtSeconds: "対照PT秒",
  weight: "体重",
  egfr: "eGFR",
};

export function commonScores(assessment: Assessment) {
  const { labs, findings, age } = assessment;
  const childMissing = [
    ...missingLabs(assessment, ["totalBilirubin", "albumin", "inr"]),
    findings.ascites === "unknown" ? "腹水" : null,
    findings.encephalopathy === "unknown" ? "肝性脳症" : null,
  ].filter((item): item is string => Boolean(item));
  const meldMissing = [
    ...missingLabs(assessment, ["totalBilirubin", "inr", "creatinine"]),
    findings.dialysis === "unknown" ? "透析有無" : null,
  ].filter((item): item is string => Boolean(item));

  return {
    fib4: {
      value: fib4({
        age,
        ast: labs.ast,
        alt: labs.alt,
        platelets104: labs.platelets,
      }),
      missing: [
        age == null ? "評価時点年齢" : null,
        ...missingLabs(assessment, ["ast", "alt", "platelets"]),
      ].filter((item): item is string => Boolean(item)),
    },
    fib3: {
      value: fib3({
        ast: labs.ast,
        alt: labs.alt,
        platelets104: labs.platelets,
      }),
      missing: missingLabs(assessment, ["ast", "alt", "platelets"]),
    },
    child: {
      value: childMissing.length
        ? null
        : childPugh({
            bilirubin: labs.totalBilirubin,
            albumin: labs.albumin,
            inr: labs.inr,
            ascites: findings.ascites,
            encephalopathy: findings.encephalopathy,
            cholestatic: findings.cholestaticChild,
          }),
      missing: childMissing,
    },
    meld: {
      value: meldMissing.length
        ? null
        : meld({
            bilirubin: labs.totalBilirubin,
            inr: labs.inr,
            creatinine: labs.creatinine,
            dialysis: findings.dialysis === "yes",
          }),
      missing: meldMissing,
    },
    meldNa: {
      value:
        meldMissing.length || !isNumber(labs.sodium)
          ? null
          : meldNa({
              bilirubin: labs.totalBilirubin,
              inr: labs.inr,
              creatinine: labs.creatinine,
              sodium: labs.sodium,
              dialysis: findings.dialysis === "yes",
            }),
      missing: [...meldMissing, ...(!isNumber(labs.sodium) ? ["Na"] : [])],
    },
  };
}

export function aldScores(day0: Assessment, day7: Assessment | null) {
  const labs = day0.labs;
  const hasCoagulation = isNumber(labs.inr) || isNumber(labs.ptActivity);
  const bleedingOrDicIsPositive =
    day0.findings.dic === "yes" ||
    day0.findings.gastrointestinalBleeding === "yes";
  const bleedingKnown =
    bleedingOrDicIsPositive ||
    (day0.findings.dic !== "unknown" &&
      day0.findings.gastrointestinalBleeding !== "unknown");
  const jasMissing = [
    day0.age == null ? "評価時点年齢" : null,
    ...missingLabs(day0, ["wbc", "creatinine", "totalBilirubin"]),
    !hasCoagulation ? "PT-INRまたはPT活性" : null,
    !bleedingKnown ? "消化管出血・DIC" : null,
  ].filter((item): item is string => Boolean(item));
  const mdfMissing = missingLabs(day0, [
    "ptSeconds",
    "controlPtSeconds",
    "totalBilirubin",
  ]);
  const lilleMissing = [
    day0.age == null ? "評価時点年齢" : null,
    ...missingLabs(day0, ["albumin", "totalBilirubin", "ptSeconds"]),
    !day7 || !isNumber(day7.labs.totalBilirubin) ? "1週後T-Bil" : null,
    day0.findings.renalInsufficiency === "unknown" ? "腎機能障害" : null,
  ].filter((item): item is string => Boolean(item));

  return {
    jas: {
      value: jasMissing.length
        ? null
        : japanAlcoholicHepatitisScore({
            whiteBloodCellCount: labs.wbc,
            creatinine: labs.creatinine,
            inr: isNumber(labs.inr) ? labs.inr : null,
            prothrombinActivity: isNumber(labs.inr) ? null : labs.ptActivity,
            totalBilirubin: labs.totalBilirubin,
            gastrointestinalBleedingOrDic: bleedingOrDicIsPositive,
            age: day0.age,
          }),
      missing: jasMissing,
    },
    mdf: {
      value: mdfMissing.length
        ? null
        : maddreyDiscriminantFunction({
            prothrombinTimeSeconds: labs.ptSeconds,
            controlProthrombinTimeSeconds: labs.controlPtSeconds,
            totalBilirubin: labs.totalBilirubin,
          }),
      missing: mdfMissing,
    },
    lille: {
      value: lilleMissing.length
        ? null
        : lille({
            age: day0.age,
            albuminDay0GPerL: (labs.albumin as number) * 10,
            bilirubinDay0UmolL: mgDlToUmolLBilirubin(labs.totalBilirubin),
            bilirubinDay7UmolL: mgDlToUmolLBilirubin(
              day7?.labs.totalBilirubin ?? null,
            ),
            prothrombinTimeSeconds: labs.ptSeconds,
            renalInsufficiency: day0.findings.renalInsufficiency === "yes",
          }),
      missing: lilleMissing,
    },
  };
}
