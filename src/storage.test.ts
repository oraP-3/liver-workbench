import { beforeEach, describe, expect, it } from "vitest";
import { emptyCase, emptyFacility } from "./model";
import {
  createBackup,
  loadCases,
  loadFacilities,
  mergeBackup,
  saveAll,
  validateBackup,
} from "./storage";

beforeEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("liver-workbench");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
});

describe("local persistence and backup", () => {
  it("round-trips cases and facilities through IndexedDB", async () => {
    const record = emptyCase();
    record.caseCode = "X-1";
    const facility = emptyFacility();
    facility.name = "A";
    await saveAll([record], [facility]);
    expect((await loadCases())[0].caseCode).toBe("X-1");
    expect((await loadFacilities())[0].name).toBe("A");
  });

  it("rejects a malformed nested assessment", () => {
    const backup = createBackup([], []);
    expect(() =>
      validateBackup(
        JSON.stringify({
          ...backup,
          cases: [
            {
              schemaVersion: 3,
              id: "x",
              caseCode: "x",
              assessments: [{}],
              medications: [],
            },
          ],
        }),
      ),
    ).toThrow();
  });

  it("rejects a case without an assessment", () => {
    const record = emptyCase();
    record.caseCode = "X";
    const backup = createBackup([record], []);
    backup.cases[0].assessments = [];
    expect(() => validateBackup(JSON.stringify(backup))).toThrow();
  });

  it("skips collisions unless overwrite is explicit", () => {
    const existing = emptyCase();
    existing.caseCode = "X";
    const incoming = emptyCase();
    incoming.caseCode = "X";
    incoming.id = "new";
    expect(mergeBackup([incoming], [existing], false)[0].id).toBe(existing.id);
    expect(mergeBackup([incoming], [existing], true)[0].id).toBe("new");
  });

  it("migrates schema 3 cases with liver-failure defaults", () => {
    const legacy = structuredClone(emptyCase()) as unknown as Record<
      string,
      unknown
    >;
    legacy.schemaVersion = 3;
    const assessments = legacy.assessments as Array<Record<string, unknown>>;
    delete assessments[0].liverFailure;
    const backup = {
      schemaVersion: 3,
      appVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      facilities: [],
      cases: [{ ...legacy, caseCode: "V3" }],
    };

    const migrated = validateBackup(JSON.stringify(backup));
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.cases[0].assessments[0].liverFailure.vasopressor).toBe(
      "unknown",
    );
  });

  it("migrates schema 4 cases with viral-hepatitis defaults", () => {
    const legacy = structuredClone(emptyCase()) as unknown as Record<
      string,
      unknown
    >;
    legacy.schemaVersion = 4;
    const assessments = legacy.assessments as Array<Record<string, unknown>>;
    delete assessments[0].viralHepatitis;
    const backup = {
      schemaVersion: 4,
      appVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      facilities: [],
      cases: [{ ...legacy, caseCode: "V4" }],
    };

    const migrated = validateBackup(JSON.stringify(backup));
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.cases[0].assessments[0].viralHepatitis.hcvRnaDetected).toBe(
      "unknown",
    );
  });
});
