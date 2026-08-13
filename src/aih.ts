import type { Assessment } from "./types";

const positiveText = (value: string) => {
  const text = value.trim().toLowerCase();
  return text === "positive" || text === "陽性" || /^1\s*:\s*\d+$/.test(text);
};

const titer = (value: string) => {
  const match = value.trim().match(/^1\s*:\s*(\d+)$/);
  return match ? Number(match[1]) : null;
};

export function formalCriteria(assessment: Assessment) {
  const { findings, labs, treatments, facilitySnapshot } = assessment;
  if (findings.otherCausesExcluded !== "yes") {
    return {
      status: "判定保留",
      count: null,
      range: null,
      missing: ["他原因肝障害の除外"],
    };
  }
  const entries: Array<boolean | null> = [
    findings.ana || findings.asma
      ? positiveText(findings.ana) || positiveText(findings.asma)
      : null,
    labs.igg != null && facilitySnapshot?.iggUln
      ? labs.igg > facilitySnapshot.iggUln * 1.1
      : null,
    findings.histology === "unknown"
      ? null
      : findings.histology === "typical" || findings.histology === "compatible",
    treatments.pslResponse === "unknown"
      ? null
      : treatments.pslResponse === "marked",
  ];
  const count = entries.filter((value) => value === true).length;
  const unknown = entries.filter((value) => value === null).length;
  const maximum = count + unknown;
  let status = "判定保留";
  if (count >= 3) status = "典型例の形式的基準に対応";
  else if (count >= 1 && maximum < 3) status = "非典型例の形式的基準に対応";
  else if (maximum === 0) status = "支持項目なし";
  return {
    status,
    count,
    range: unknown ? `${count}〜${maximum}` : String(count),
    missing: unknown ? ["未入力の支持項目あり"] : [],
  };
}

export function simplifiedScore(assessment: Assessment) {
  const { findings, labs, facilitySnapshot } = assessment;
  const missing: string[] = [];
  let antibody: number | null = null;
  const ana = titer(findings.ana);
  const asma = titer(findings.asma);
  if (
    ana != null ||
    asma != null ||
    findings.lkm1 !== "unknown" ||
    findings.sla !== "unknown"
  ) {
    antibody =
      Math.max(ana ?? 0, asma ?? 0) >= 80 ||
      findings.lkm1 === "yes" ||
      findings.sla === "yes"
        ? 2
        : Math.max(ana ?? 0, asma ?? 0) >= 40 ||
            positiveText(findings.ana) ||
            positiveText(findings.asma)
          ? 1
          : 0;
  } else missing.push("自己抗体");

  let igg: number | null = null;
  if (labs.igg != null && facilitySnapshot?.iggUln) {
    igg =
      labs.igg > facilitySnapshot.iggUln * 1.1
        ? 2
        : labs.igg > facilitySnapshot.iggUln
          ? 1
          : 0;
  } else missing.push("IgG・施設ULN");

  const histology =
    findings.histology === "unknown"
      ? null
      : findings.histology === "typical"
        ? 2
        : findings.histology === "compatible"
          ? 1
          : 0;
  if (histology == null) missing.push("肝組織");
  const viral = findings.viralExcluded === "yes" ? 2 : null;
  if (viral == null) missing.push("ウイルス性肝炎の除外");
  const total = [antibody, igg, histology, viral].every(
    (value) => value != null,
  )
    ? (antibody as number) +
      (igg as number) +
      (histology as number) +
      (viral as number)
    : null;
  const interpretation =
    total == null
      ? "未算出"
      : total >= 7
        ? "definite AIH相当"
        : total === 6
          ? "probable AIH相当"
          : "基準上の支持が不足";
  return {
    total,
    interpretation,
    components: { antibody, igg, histology, viral },
    missing,
  };
}

export function severity(assessment: Assessment) {
  const { labs, findings } = assessment;
  const requiredMissing = [
    labs.ast == null ? "AST" : null,
    labs.alt == null ? "ALT" : null,
    labs.totalBilirubin == null ? "T-Bil" : null,
    labs.inr == null ? "PT-INR" : null,
    findings.encephalopathy === "unknown" ? "肝性脳症" : null,
    findings.liverAtrophy === "unknown" ? "肝萎縮" : null,
  ].filter((value): value is string => Boolean(value));
  const severe = [
    findings.encephalopathy !== "unknown" && findings.encephalopathy !== "none"
      ? "肝性脳症あり"
      : null,
    findings.liverAtrophy === "yes" ? "肝萎縮あり" : null,
    labs.inr != null && labs.inr >= 1.3 ? "PT-INR 1.3以上" : null,
  ].filter((value): value is string => Boolean(value));
  if (severe.length)
    return { level: "重症", reasons: severe, missing: requiredMissing };
  if (requiredMissing.length)
    return { level: "判定保留", reasons: [], missing: requiredMissing };
  const moderate = [
    Math.max(labs.ast ?? 0, labs.alt ?? 0) > 200
      ? "ASTまたはALT 200 U/L超"
      : null,
    (labs.totalBilirubin ?? 0) > 5 ? "T-Bil 5 mg/dL超" : null,
  ].filter((value): value is string => Boolean(value));
  return moderate.length
    ? { level: "中等症", reasons: moderate, missing: [] }
    : {
        level: "軽症",
        reasons: ["入力済み全必須項目で重症・中等症条件なし"],
        missing: [],
      };
}

export function biochemicalRemission(assessment: Assessment | null) {
  if (!assessment) return { matches: null, missing: ["フォロー評価時点"] };
  const { labs, facilitySnapshot } = assessment;
  const missing = [
    labs.ast == null ? "AST" : null,
    labs.alt == null ? "ALT" : null,
    labs.igg == null ? "IgG" : null,
    !facilitySnapshot?.astUln ? "AST ULN" : null,
    !facilitySnapshot?.altUln ? "ALT ULN" : null,
    !facilitySnapshot?.iggUln ? "IgG ULN" : null,
  ].filter((value): value is string => Boolean(value));
  return {
    matches: missing.length
      ? null
      : (labs.ast as number) <= (facilitySnapshot?.astUln as number) &&
        (labs.alt as number) <= (facilitySnapshot?.altUln as number) &&
        (labs.igg as number) <= (facilitySnapshot?.iggUln as number),
    missing,
  };
}

export const pslConversions = (weight: number | null) =>
  weight != null && weight > 0
    ? {
        dose06: Math.round(weight * 0.6 * 10) / 10,
        dose08: Math.round(weight * 0.8 * 10) / 10,
      }
    : null;
