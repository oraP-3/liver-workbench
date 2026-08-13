import { describe, expect, it } from "vitest";
import { biochemicalRemission, severity, simplifiedScore } from "./aih";
import { emptyAssessment, emptyFacility } from "./model";

describe("AIH logic", () => {
  it("does not label incomplete severity input as mild", () => {
    expect(severity(emptyAssessment()).level).toBe("判定保留");
  });

  it("calculates the simplified score only when every domain is evaluable", () => {
    const assessment = emptyAssessment({ ...emptyFacility(), iggUln: 1700 });
    assessment.labs.igg = 2200;
    assessment.findings = {
      ...assessment.findings,
      ana: "1:80",
      histology: "typical",
      viralExcluded: "yes",
    };
    expect(simplifiedScore(assessment).total).toBe(8);
  });

  it("uses follow-up snapshot ULNs for biochemical remission", () => {
    const assessment = emptyAssessment({
      ...emptyFacility(),
      astUln: 35,
      altUln: 30,
      iggUln: 1700,
    });
    assessment.labs = { ...assessment.labs, ast: 35, alt: 30, igg: 1700 };
    expect(biochemicalRemission(assessment).matches).toBe(true);
  });
});
