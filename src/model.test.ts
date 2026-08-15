import { describe, expect, it } from "vitest";
import {
  emptyCase,
  emptyFacility,
  emptyMedication,
  snapshotFacility,
  syncMedicationTiming,
  syncTiming,
} from "./model";

describe("longitudinal model", () => {
  it("synchronizes absolute and relative assessment dates", () => {
    const record = emptyCase();
    let assessment = record.assessments[0];
    assessment.timing.absoluteDate = "2026-08-20";
    assessment = syncTiming(assessment, "2026-08-13", "absoluteDate");
    expect(assessment.timing.relativeDay).toBe(7);
    assessment.timing.relativeDay = -2;
    expect(
      syncTiming(assessment, "2026-08-13", "relativeDay").timing.absoluteDate,
    ).toBe("2026-08-11");
  });

  it("keeps the assessment facility snapshot immutable", () => {
    const facility = { ...emptyFacility(), name: "A", astUln: 35 };
    const snapshot = snapshotFacility(facility)!;
    facility.astUln = 40;
    expect(snapshot.astUln).toBe(35);
  });

  it("synchronizes either medication edge", () => {
    const medication = emptyMedication();
    medication.start.relativeDay = -10;
    const next = syncMedicationTiming(
      medication,
      "2026-08-13",
      "start",
      "relativeDay",
    );
    expect(next.start.absoluteDate).toBe("2026-08-03");
    expect(medication.start.absoluteDate).toBeNull();
  });
});
