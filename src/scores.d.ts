export interface ChildResult {
  score: number;
  class: "A" | "B" | "C";
  components: Record<string, number>;
}

export interface JasResult {
  score: number;
  severity: "mild" | "moderate" | "severe";
  components: Record<string, number>;
  coagulationInput: "inr" | "prothrombinActivity";
}

export function fib4(input: {
  age: number | null;
  ast: number | null;
  alt: number | null;
  platelets104: number | null;
}): number | null;
export function fib3(input: {
  ast: number | null;
  alt: number | null;
  platelets104: number | null;
}): number | null;
export function childPugh(input: {
  bilirubin: number | null;
  albumin: number | null;
  inr: number | null;
  ascites: string;
  encephalopathy: string;
  cholestatic?: boolean;
}): ChildResult | null;
export function meld(input: {
  bilirubin: number | null;
  inr: number | null;
  creatinine: number | null;
  dialysis?: boolean;
}): number | null;
export function meldNa(input: {
  bilirubin: number | null;
  inr: number | null;
  creatinine: number | null;
  sodium: number | null;
  dialysis?: boolean;
}): number | null;
export function lille(input: {
  age: number | null;
  albuminDay0GPerL: number | null;
  bilirubinDay0UmolL: number | null;
  bilirubinDay7UmolL: number | null;
  prothrombinTimeSeconds: number | null;
  renalInsufficiency?: boolean;
}): number | null;
export function maddreyDiscriminantFunction(input: {
  prothrombinTimeSeconds: number | null;
  controlProthrombinTimeSeconds: number | null;
  totalBilirubin: number | null;
}): number | null;
export function japanAlcoholicHepatitisScore(input: {
  whiteBloodCellCount: number | null;
  creatinine: number | null;
  inr?: number | null;
  prothrombinActivity?: number | null;
  totalBilirubin: number | null;
  gastrointestinalBleedingOrDic: boolean;
  age: number | null;
}): JasResult | null;
export function mgDlToUmolLBilirubin(value: number | null): number | null;
