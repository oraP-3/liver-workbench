import { describe,expect,it } from "vitest";
import { emptyAssessment,emptyFacility,snapshotFacility,syncTiming } from "../../src/model";
describe("longitudinal model",()=>{it("synchronizes calendar date and relative day both ways",()=>{const a=emptyAssessment();a.timing.absoluteDate="2026-08-20";expect(syncTiming(a,"2026-08-13","absoluteDate").timing.relativeDay).toBe(7);a.timing.relativeDay=7;expect(syncTiming(a,"2026-08-13","relativeDay").timing.absoluteDate).toBe("2026-08-20")});it("keeps facility snapshots immutable",()=>{const f={...emptyFacility(),name:"A",astUln:35};const snap=snapshotFacility(f)!;f.astUln=40;expect(snap.astUln).toBe(35)})});

it("synchronizes both medication edges without mutating the source", async () => {
  const { emptyMedication, syncMedicationTiming } = await import("../../src/model");
  const source = emptyMedication();
  source.start.absoluteDate = "2026-08-10";
  const started = syncMedicationTiming(source, "2026-08-13", "start", "absoluteDate");
  expect(started.start.relativeDay).toBe(-3);
  expect(source.start.relativeDay).toBeNull();
  started.stop.relativeDay = 7;
  expect(syncMedicationTiming(started, "2026-08-13", "stop", "relativeDay").stop.absoluteDate).toBe("2026-08-20");
});
