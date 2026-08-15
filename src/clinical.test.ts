import { describe, expect, it } from "vitest";
import { aldScores, commonScores } from "./clinical";
import { emptyAssessment } from "./model";

describe("UI clinical adapters", () => {
  it("uses assessment age for FIB-4", () => {
    const assessment = emptyAssessment();
    assessment.age = 60;
    assessment.labs = { ...assessment.labs, ast: 40, alt: 36, platelets: 20 };
    expect(commonScores(assessment).fib4.value).toBeCloseTo(2);
  });

  it("requires explicit unknown-sensitive JAS and Lille fields", () => {
    const day0 = emptyAssessment();
    const day7 = emptyAssessment();
    day0.age = 50;
    day0.labs = {
      ...day0.labs,
      wbc: 22000,
      creatinine: 2,
      inr: 2,
      totalBilirubin: 10,
      albumin: 3,
      ptSeconds: 18,
    };
    day7.labs.totalBilirubin = 5;
    expect(aldScores(day0, day7).jas.value).toBeNull();
    expect(aldScores(day0, day7).lille.value).toBeNull();
  });

  it("prefers INR when both JAS coagulation values are present", () => {
    const day0 = emptyAssessment();
    day0.age = 50;
    day0.labs = {
      ...day0.labs,
      wbc: 9000,
      creatinine: 1.2,
      inr: 1.1,
      ptActivity: 35,
      totalBilirubin: 4,
    };
    day0.findings.dic = "yes";

    const jas = aldScores(day0, null).jas;
    expect(jas.value?.coagulationInput).toBe("inr");
    expect(jas.missing).not.toContain("消化管出血・DIC");
  });
});
