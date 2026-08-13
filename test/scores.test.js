import test from "node:test";
import assert from "node:assert/strict";
import { childPugh, fib3, fib4, japanAlcoholicHepatitisScore, lille, maddreyDiscriminantFunction, meld, meldNa, mgDlToUmolLBilirubin } from "../src/scores.js";

test("FIB-4 calculation", () => {
  assert.ok(Math.abs(fib4({ age: 60, ast: 40, alt: 36, platelets104: 20 }) - 2) < 1e-12);
});

test("FIB-3 calculation", () => {
  const expected = 5 * Math.log(40) - 2 * Math.log(36) - 0.18 * 20 - 5;
  assert.ok(Math.abs(fib3({ ast: 40, alt: 36, platelets104: 20 }) - expected) < 1e-12);
});

test("Child-Pugh classification", () => {
  const result = childPugh({ bilirubin: 2.5, albumin: 3, inr: 1.8, ascites: "controlled", encephalopathy: "none" });
  assert.deepEqual({ score: result.score, class: result.class }, { score: 9, class: "B" });
});

test("MELD clamps laboratory values and returns allocation range", () => {
  assert.equal(meld({ bilirubin: 0.4, inr: 0.9, creatinine: 0.5 }), 6);
  assert.equal(meld({ bilirubin: 50, inr: 5, creatinine: 8 }), 40);
});

test("MELD-Na clamps sodium", () => {
  const low = meldNa({ bilirubin: 4, inr: 2, creatinine: 1.5, sodium: 120 });
  const clamped = meldNa({ bilirubin: 4, inr: 2, creatinine: 1.5, sodium: 125 });
  assert.equal(low, clamped);
});

test("Lille score is bounded", () => {
  const result = lille({ age: 50, albuminDay0GPerL: 30, bilirubinDay0UmolL: 250, bilirubinDay7UmolL: 180, prothrombinTimeSeconds: 18, renalInsufficiency: false });
  assert.ok(result >= 0 && result <= 1);
});

test("Maddrey discriminant function calculation", () => {
  assert.ok(Math.abs(maddreyDiscriminantFunction({ prothrombinTimeSeconds: 20, controlProthrombinTimeSeconds: 12, totalBilirubin: 10 }) - 46.8) < 1e-12);
});

test("Maddrey discriminant function rejects missing control PT", () => {
  assert.equal(maddreyDiscriminantFunction({ prothrombinTimeSeconds: 20, totalBilirubin: 10 }), null);
});

test("JAS classifies severe alcoholic hepatitis using INR", () => {
  const result = japanAlcoholicHepatitisScore({ whiteBloodCellCount: 22000, creatinine: 3.2, inr: 2.1, totalBilirubin: 12, gastrointestinalBleedingOrDic: true, age: 52 });
  assert.deepEqual({ score: result.score, severity: result.severity, coagulationInput: result.coagulationInput }, { score: 16, severity: "severe", coagulationInput: "inr" });
});

test("JAS uses prothrombin activity when INR is unavailable", () => {
  const result = japanAlcoholicHepatitisScore({ whiteBloodCellCount: 9000, creatinine: 1.2, prothrombinActivity: 35, totalBilirubin: 4, gastrointestinalBleedingOrDic: false, age: 45 });
  assert.deepEqual({ score: result.score, severity: result.severity, coagulationInput: result.coagulationInput }, { score: 7, severity: "mild", coagulationInput: "prothrombinActivity" });
});

test("JAS rejects simultaneous INR and prothrombin activity", () => {
  assert.equal(japanAlcoholicHepatitisScore({ whiteBloodCellCount: 9000, creatinine: 1.2, inr: 1.1, prothrombinActivity: 80, totalBilirubin: 4, gastrointestinalBleedingOrDic: false, age: 45 }), null);
});

test("bilirubin unit conversion", () => {
  assert.ok(Math.abs(mgDlToUmolLBilirubin(1) - 17.104) < 1e-12);
});
