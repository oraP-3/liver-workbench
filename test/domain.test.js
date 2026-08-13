import test from "node:test";
import assert from "node:assert/strict";
import { addAssessment, addMedication, createAssessment, createCase, createMedicationExposure, migrateLegacyCase, synchronizeTiming } from "../src/domain.js";

test("calendar date computes relative day", () => {
  const assessment = createAssessment({ absoluteDate: "2026-08-20" });
  const result = synchronizeTiming(assessment, "2026-08-13", "absoluteDate");
  assert.equal(result.timing.relativeDay, 7);
});

test("relative day computes calendar date", () => {
  const assessment = createAssessment({ relativeDay: 7 });
  const result = synchronizeTiming(assessment, "2026-08-13", "relativeDay");
  assert.equal(result.timing.absoluteDate, "2026-08-20");
});

test("relative-only assessment is retained without a baseline date", () => {
  const record = addAssessment(createCase({ caseCode: "X-1" }), createAssessment({ relativeDay: 3 }));
  assert.equal(record.assessments[0].timing.relativeDay, 3);
  assert.equal(record.assessments[0].timing.absoluteDate, null);
});

test("medication timing is synchronized to case baseline", () => {
  const record = addMedication(createCase({ baselineDate: "2026-08-01" }), createMedicationExposure({ name: "被疑薬A", startRelativeDay: -10, stopDate: "2026-08-03" }));
  assert.equal(record.medications[0].start.absoluteDate, "2026-07-22");
  assert.equal(record.medications[0].stop.relativeDay, 2);
});

test("legacy v1 mock case migrates into first longitudinal assessment", () => {
  const migrated = migrateLegacyCase({ data: { caseId: "AIH-024", age: "58", sex: "女性", ast: "186", alt: "212", igg: "2450" }, facilityId: "a", facilityName: "施設A" });
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.caseCode, "AIH-024");
  assert.equal(migrated.assessments[0].labs.alt, 212);
  assert.equal(migrated.assessments[0].facilitySnapshot.name, "施設A");
});
