const finitePositive = (values) =>
  values.every((value) => Number.isFinite(value) && value > 0);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const rounded = (value) => Math.round(value);

export function fib4({ age, ast, alt, platelets104 }) {
  if (!finitePositive([age, ast, alt, platelets104])) return null;
  const platelets109L = platelets104 * 10;
  return (age * ast) / (platelets109L * Math.sqrt(alt));
}

export function fib3({ ast, alt, platelets104 }) {
  if (!finitePositive([ast, alt, platelets104])) return null;
  return 5 * Math.log(ast) - 2 * Math.log(alt) - 0.18 * platelets104 - 5;
}

export function childPugh({
  bilirubin,
  albumin,
  inr,
  ascites,
  encephalopathy,
  cholestatic = false,
}) {
  if (!finitePositive([bilirubin, albumin, inr])) return null;
  const bilirubinPoints = cholestatic
    ? bilirubin < 2
      ? 1
      : bilirubin <= 4
        ? 2
        : 3
    : bilirubin < 2
      ? 1
      : bilirubin <= 3
        ? 2
        : 3;
  const albuminPoints = albumin > 3.5 ? 1 : albumin >= 2.8 ? 2 : 3;
  const inrPoints = inr < 1.7 ? 1 : inr <= 2.3 ? 2 : 3;
  const ascitesPoints = { none: 1, controlled: 2, refractory: 3 }[ascites];
  const encephalopathyPoints = {
    none: 1,
    grade1: 2,
    grade2: 2,
    grade12: 2,
    grade34: 3,
  }[encephalopathy];
  if (!ascitesPoints || !encephalopathyPoints) return null;
  const score =
    bilirubinPoints +
    albuminPoints +
    inrPoints +
    ascitesPoints +
    encephalopathyPoints;
  return {
    score,
    class: score <= 6 ? "A" : score <= 9 ? "B" : "C",
    components: {
      bilirubinPoints,
      albuminPoints,
      inrPoints,
      ascitesPoints,
      encephalopathyPoints,
    },
  };
}

export function meld({ bilirubin, inr, creatinine, dialysis = false }) {
  if (!finitePositive([bilirubin, inr, creatinine])) return null;
  const b = Math.max(1, bilirubin);
  const i = Math.max(1, inr);
  const c = dialysis ? 4 : clamp(creatinine, 1, 4);
  const raw =
    3.78 * Math.log(b) + 11.2 * Math.log(i) + 9.57 * Math.log(c) + 6.43;
  return clamp(rounded(raw), 6, 40);
}

export function meldNa({
  bilirubin,
  inr,
  creatinine,
  sodium,
  dialysis = false,
}) {
  if (!finitePositive([sodium])) return null;
  const base = meld({ bilirubin, inr, creatinine, dialysis });
  if (base === null) return null;
  const na = clamp(sodium, 125, 137);
  const raw = base + 1.32 * (137 - na) - 0.033 * base * (137 - na);
  return clamp(rounded(raw), 6, 40);
}

export function lille({
  age,
  albuminDay0GPerL,
  bilirubinDay0UmolL,
  bilirubinDay7UmolL,
  prothrombinTimeSeconds,
  renalInsufficiency = false,
}) {
  if (
    !finitePositive([
      age,
      albuminDay0GPerL,
      bilirubinDay0UmolL,
      bilirubinDay7UmolL,
      prothrombinTimeSeconds,
    ])
  )
    return null;
  const r =
    3.19 -
    0.101 * age +
    0.147 * albuminDay0GPerL +
    0.0165 * (bilirubinDay7UmolL - bilirubinDay0UmolL) -
    0.206 * Number(renalInsufficiency) -
    0.0065 * bilirubinDay0UmolL -
    0.0096 * prothrombinTimeSeconds;
  return Math.exp(-r) / (1 + Math.exp(-r));
}

export function maddreyDiscriminantFunction({
  prothrombinTimeSeconds,
  controlProthrombinTimeSeconds,
  totalBilirubin,
}) {
  if (
    !finitePositive([
      prothrombinTimeSeconds,
      controlProthrombinTimeSeconds,
      totalBilirubin,
    ])
  )
    return null;
  return (
    4.6 * (prothrombinTimeSeconds - controlProthrombinTimeSeconds) +
    totalBilirubin
  );
}

export function japanAlcoholicHepatitisScore({
  whiteBloodCellCount,
  creatinine,
  inr = null,
  prothrombinActivity = null,
  totalBilirubin,
  gastrointestinalBleedingOrDic,
  age,
}) {
  if (
    !finitePositive([whiteBloodCellCount, creatinine, totalBilirubin, age]) ||
    typeof gastrointestinalBleedingOrDic !== "boolean"
  )
    return null;
  if (inr !== null && prothrombinActivity !== null) return null;
  if (inr === null && prothrombinActivity === null) return null;

  const whiteBloodCellPoints =
    whiteBloodCellCount >= 20000 ? 3 : whiteBloodCellCount >= 10000 ? 2 : 1;
  const creatininePoints = creatinine >= 3 ? 3 : creatinine > 1.5 ? 2 : 1;
  const coagulationPoints =
    inr !== null
      ? inr >= 2
        ? 3
        : inr > 1.8
          ? 2
          : 1
      : prothrombinActivity <= 30
        ? 3
        : prothrombinActivity < 40
          ? 2
          : 1;
  const bilirubinPoints =
    totalBilirubin >= 10 ? 3 : totalBilirubin >= 5 ? 2 : 1;
  const bleedingOrDicPoints = gastrointestinalBleedingOrDic ? 2 : 1;
  const agePoints = age >= 50 ? 2 : 1;
  const score =
    whiteBloodCellPoints +
    creatininePoints +
    coagulationPoints +
    bilirubinPoints +
    bleedingOrDicPoints +
    agePoints;
  return {
    score,
    severity: score >= 10 ? "severe" : score >= 8 ? "moderate" : "mild",
    components: {
      whiteBloodCellPoints,
      creatininePoints,
      coagulationPoints,
      bilirubinPoints,
      bleedingOrDicPoints,
      agePoints,
    },
    coagulationInput: inr !== null ? "inr" : "prothrombinActivity",
  };
}

export const mgDlToUmolLBilirubin = (value) =>
  Number.isFinite(value) ? value * 17.104 : null;
