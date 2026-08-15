import { describe, expect, it } from "vitest";
import { emptyCase } from "./model";
import {
  hbvChronicTreatmentStatus,
  hbvCirrhosisDnaCriterion,
  hcvInitialRegimens,
} from "./viralHepatitis";

describe("HBV guideline correspondence", () => {
  it("matches the chronic hepatitis treatment threshold", () => {
    const assessment = emptyCase().assessments[0];
    assessment.labs.alt = 31;
    assessment.viralHepatitis.hbvDnaLogIU = 3.3;
    expect(hbvChronicTreatmentStatus(assessment).tone).toBe("met");
  });

  it("identifies the indeterminate numeric phase", () => {
    const assessment = emptyCase().assessments[0];
    assessment.labs.alt = 20;
    assessment.viralHepatitis.hbvDnaLogIU = 4;
    expect(hbvChronicTreatmentStatus(assessment).tone).toBe("indeterminate");
  });

  it("uses DNA positivity for cirrhosis", () => {
    const assessment = emptyCase().assessments[0];
    assessment.viralHepatitis.hbvDnaDetected = "yes";
    expect(hbvCirrhosisDnaCriterion(assessment).state).toBe("met");
  });
});

describe("HCV treatment references", () => {
  it("lists 8 weeks of GLE/PIB for non-cirrhotic initial treatment", () => {
    const assessment = emptyCase().assessments[0];
    assessment.viralHepatitis.hcvGenotype = "1";
    const regimen = hcvInitialRegimens("hcv-chronic", assessment).find(
      (item) => item.id === "gle-pib",
    );
    expect(regimen?.duration).toBe("8週");
  });

  it("flags SOF regimens with severe renal impairment", () => {
    const assessment = emptyCase().assessments[0];
    assessment.viralHepatitis.hcvGenotype = "2";
    assessment.labs.egfr = 29;
    const regimens = hcvInitialRegimens("hcv-chronic", assessment);
    expect(regimens.find((item) => item.id === "sof-ldv")?.state).toBe(
      "contraindicated",
    );
    expect(regimens.find((item) => item.id === "gle-pib")?.state).toBe(
      "listed",
    );
  });

  it("does not expand genotype-specific initial regimens when genotype is unknown", () => {
    const assessment = emptyCase().assessments[0];
    expect(hcvInitialRegimens("hcv-chronic", assessment)).toEqual([]);
  });
});
