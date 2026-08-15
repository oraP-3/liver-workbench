import { describe, expect, it } from "vitest";
import {
  aclfEntryCriteria,
  aclfOrganFailureCriteria,
  acuteLiverFailureCoagulation,
  encephalopathyMatchesSelectedContext,
} from "./liverFailure";
import { emptyAssessment } from "./model";

describe("acute liver failure and ACLF references", () => {
  it("accepts either PT activity or INR for the acute liver failure coagulation condition", () => {
    const assessment = emptyAssessment();
    assessment.labs.ptActivity = 35;
    expect(acuteLiverFailureCoagulation(assessment).state).toBe("met");

    assessment.labs.ptActivity = null;
    assessment.labs.inr = 1.6;
    expect(acuteLiverFailureCoagulation(assessment).state).toBe("met");
  });

  it("keeps an OR criterion unknown when one branch is negative and the other is missing", () => {
    const assessment = emptyAssessment();
    assessment.labs.inr = 1.2;
    expect(acuteLiverFailureCoagulation(assessment).state).toBe("unknown");
  });

  it("shows exact encephalopathy timing correspondence for subacute ALF", () => {
    const assessment = emptyAssessment();
    assessment.findings.encephalopathy = "grade2";
    assessment.liverFailure.onsetToEncephalopathyDays = 14;
    expect(
      encephalopathyMatchesSelectedContext("lf-alf-subacute", assessment)
        ?.state,
    ).toBe("met");
  });

  it("evaluates the four ACLF entry conditions without diagnosing ACLF", () => {
    const baseline = emptyAssessment();
    baseline.labs = {
      ...baseline.labs,
      totalBilirubin: 1.5,
      albumin: 3.8,
      inr: 1.2,
    };
    baseline.findings.ascites = "none";
    baseline.findings.encephalopathy = "none";

    const current = emptyAssessment();
    current.labs.totalBilirubin = 6;
    current.labs.inr = 1.6;
    current.liverFailure.acuteExacerbationDays = 14;

    expect(
      aclfEntryCriteria(baseline, current).map((criterion) => criterion.state),
    ).toEqual(["met", "met", "met", "met"]);
  });

  it("maps all six ACLF organ-failure domains and preserves unknowns", () => {
    const assessment = emptyAssessment();
    assessment.labs.totalBilirubin = 13;
    assessment.labs.creatinine = 1;
    assessment.findings.dialysis = "no";
    assessment.findings.encephalopathy = "grade34";
    assessment.labs.inr = 1.4;
    assessment.labs.platelets = 10;
    assessment.liverFailure.vasopressor = "no";
    assessment.liverFailure.pao2Fio2 = 180;

    expect(
      aclfOrganFailureCriteria(assessment).map((criterion) => criterion.state),
    ).toEqual(["met", "not-met", "met", "not-met", "not-met", "met"]);
  });
});
