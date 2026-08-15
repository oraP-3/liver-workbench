import type { Criterion } from "./liverFailure";
import type { Assessment } from "./types";

export interface HbvTreatmentStatus {
  label: string;
  detail: string;
  missing: string[];
  tone: "met" | "indeterminate" | "not-met" | "unknown";
}

const finite = (value: number | null): value is number =>
  Number.isFinite(value);

export function hbvChronicTreatmentStatus(
  assessment: Assessment,
): HbvTreatmentStatus {
  const { alt } = assessment.labs;
  const { hbvDnaLogIU } = assessment.viralHepatitis;
  const missing = [
    finite(alt) ? null : "ALT",
    finite(hbvDnaLogIU) ? null : "HBV DNA（Log IU/mL）",
  ].filter((item): item is string => Boolean(item));

  if (missing.length) {
    return {
      label: "未評価",
      detail: "慢性肝炎の数値条件を確認するにはALTとHBV DNAが必要です。",
      missing,
      tone: "unknown",
    };
  }

  const altHigh = (alt as number) >= 31;
  const dnaHigh = (hbvDnaLogIU as number) >= 3.3;
  if (altHigh && dnaHigh) {
    return {
      label: "治療対象の数値条件に対応",
      detail:
        "ALT 31 U/L以上かつHBV DNA 2,000 IU/mL（3.3 Log IU/mL）以上に対応します。",
      missing: [],
      tone: "met",
    };
  }
  if (altHigh || dnaHigh) {
    return {
      label: "Indeterminate phaseの数値条件に対応",
      detail:
        "ALTまたはHBV DNAの一方のみが基準以上です。線維化や肝細胞癌家族歴などを含めて治療を検討する記載があります。",
      missing: [],
      tone: "indeterminate",
    };
  }
  return {
    label: "治療対象の数値条件には未対応",
    detail:
      "単一時点の値のみでは非活動性キャリアを確定できません。1年以上に3回以上の経時評価と線維化評価が必要です。",
    missing: [],
    tone: "not-met",
  };
}

export function hbvCirrhosisDnaCriterion(assessment: Assessment): Criterion {
  const viral = assessment.viralHepatitis;
  const numericPositive = finite(viral.hbvDnaLogIU);
  if (viral.hbvDnaDetected === "unknown" && !numericPositive) {
    return {
      id: "hbv-cirrhosis-dna",
      label: "肝硬変：HBV DNA陽性",
      detail: "HBV DNAの検出有無が未入力です。",
      state: "unknown",
    };
  }
  const positive = viral.hbvDnaDetected === "yes" || numericPositive;
  return {
    id: "hbv-cirrhosis-dna",
    label: "肝硬変：HBV DNA陽性",
    detail: positive
      ? "HBV DNA陽性であり、ALT値にかかわらず治療対象とする国内記載に対応します。"
      : "HBV DNAは陰性として入力されています。",
    state: positive ? "met" : "not-met",
  };
}

export function hbvRiskCriteria(assessment: Assessment): Criterion[] {
  const viral = assessment.viralHepatitis;
  const platelets = assessment.labs.platelets;
  const age = assessment.age;
  return [
    {
      id: "hbv-fibrosis",
      label: "中等度以上の線維化（F2以上）",
      detail:
        viral.fibrosisF2Plus === "unknown"
          ? "未入力です。"
          : viral.fibrosisF2Plus === "yes"
            ? "F2以上として入力されています。"
            : "F2以上ではないとして入力されています。",
      state:
        viral.fibrosisF2Plus === "unknown"
          ? "unknown"
          : viral.fibrosisF2Plus === "yes"
            ? "met"
            : "not-met",
    },
    {
      id: "hbv-family",
      label: "肝細胞癌の家族歴",
      detail:
        viral.hccFamilyHistory === "unknown"
          ? "未入力です。"
          : viral.hccFamilyHistory === "yes"
            ? "家族歴ありとして入力されています。"
            : "家族歴なしとして入力されています。",
      state:
        viral.hccFamilyHistory === "unknown"
          ? "unknown"
          : viral.hccFamilyHistory === "yes"
            ? "met"
            : "not-met",
    },
    {
      id: "hbv-platelets",
      label: "血小板 15万/µL未満",
      detail: finite(platelets)
        ? `${platelets} ×10⁴/µL`
        : "血小板が未入力です。",
      state: finite(platelets)
        ? platelets < 15
          ? "met"
          : "not-met"
        : "unknown",
    },
    {
      id: "hbv-age",
      label: "40歳以上",
      detail: finite(age) ? `${age}歳` : "評価時点年齢が未入力です。",
      state: finite(age) ? (age >= 40 ? "met" : "not-met") : "unknown",
    },
  ];
}

export function hbvAcuteSeverityCriteria(assessment: Assessment): Criterion[] {
  const { totalBilirubin, inr } = assessment.labs;
  const { encephalopathy, ascites } = assessment.findings;
  return [
    {
      id: "hbv-acute-bilirubin",
      label: "総ビリルビン >3.0 mg/dL",
      detail: finite(totalBilirubin)
        ? `${totalBilirubin} mg/dL`
        : "T-Bilが未入力です。",
      state: finite(totalBilirubin)
        ? totalBilirubin > 3
          ? "met"
          : "not-met"
        : "unknown",
    },
    {
      id: "hbv-acute-inr",
      label: "PT-INR >1.5",
      detail: finite(inr) ? String(inr) : "PT-INRが未入力です。",
      state: finite(inr) ? (inr > 1.5 ? "met" : "not-met") : "unknown",
    },
    {
      id: "hbv-acute-encephalopathy",
      label: "肝性脳症",
      detail:
        encephalopathy === "unknown"
          ? "未入力です。"
          : encephalopathy === "none"
            ? "なし"
            : "ありとして入力されています。",
      state:
        encephalopathy === "unknown"
          ? "unknown"
          : encephalopathy === "none"
            ? "not-met"
            : "met",
    },
    {
      id: "hbv-acute-ascites",
      label: "腹水",
      detail:
        ascites === "unknown"
          ? "未入力です。"
          : ascites === "none"
            ? "なし"
            : "ありとして入力されています。",
      state:
        ascites === "unknown"
          ? "unknown"
          : ascites === "none"
            ? "not-met"
            : "met",
    },
  ];
}

export interface HcvRegimen {
  id: string;
  name: string;
  duration: string;
  state: "listed" | "contraindicated" | "specialist";
  note: string;
}

const severeRenalImpairment = (assessment: Assessment) =>
  assessment.findings.dialysis === "yes" ||
  (finite(assessment.labs.egfr) && assessment.labs.egfr < 30);

export function hcvInitialRegimens(
  context: string,
  assessment: Assessment,
): HcvRegimen[] {
  const sofContraindicated = severeRenalImpairment(assessment);
  if (context === "hcv-decompensated") {
    return [
      {
        id: "sof-vel-decomp",
        name: "SOF/VEL",
        duration: "12週",
        state: sofContraindicated ? "contraindicated" : "listed",
        note: sofContraindicated
          ? "eGFR 30未満または透析として入力されており、国内ガイドラインではSOF投与は禁忌です。"
          : "非代償性肝硬変に対する国内ガイドラインの選択肢です。",
      },
    ];
  }

  if (!["1", "2", "mixed12"].includes(assessment.viralHepatitis.hcvGenotype)) {
    return [];
  }

  const compensated = context === "hcv-compensated";
  return [
    {
      id: "sof-ldv",
      name: "SOF/LDV",
      duration: "12週",
      state: sofContraindicated ? "contraindicated" : "listed",
      note: sofContraindicated
        ? "eGFR 30未満または透析として入力されており、国内ガイドラインではSOF投与は禁忌です。"
        : "DAA治療歴なしの慢性肝炎・代償性肝硬変に記載された選択肢です。",
    },
    {
      id: "gle-pib",
      name: "GLE/PIB",
      duration: compensated ? "12週" : "8週",
      state: "listed",
      note: compensated
        ? "代償性肝硬変の投与期間です。"
        : "DAA治療歴なし・非肝硬変の投与期間です。",
    },
    {
      id: "sof-vel",
      name: "SOF/VEL",
      duration: "12週",
      state: sofContraindicated ? "contraindicated" : "listed",
      note: sofContraindicated
        ? "eGFR 30未満または透析として入力されており、国内ガイドラインではSOF投与は禁忌です。"
        : "DAA治療歴なしの慢性肝炎・代償性肝硬変に記載された選択肢です。",
    },
  ];
}

export const hcvNeedsSpecialistRetreatment = (assessment: Assessment) =>
  assessment.viralHepatitis.hcvTreatmentHistory === "ifnFreeDaaFailure";
