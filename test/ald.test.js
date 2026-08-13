import test from "node:test";
import assert from "node:assert/strict";
import { buildAldGuidelineReference, SOURCE_LEVEL } from "../src/ald.js";

test("domestic steroid recommendation requires clinician-selected ACLF context", () => {
  const unselected = buildAldGuidelineReference({ clinicianSelectedContext: "unselected", mdf: 40 });
  assert.equal(unselected.cards.some(item => item.id === "domestic-steroid-consideration"), false);

  const selected = buildAldGuidelineReference({ clinicianSelectedContext: "aclf-with-severe-alcoholic-hepatitis", mdf: 40 });
  const recommendation = selected.cards.find(item => item.id === "domestic-steroid-consideration");
  assert.equal(recommendation.sourceLevel, SOURCE_LEVEL.DOMESTIC_RECOMMENDATION);
});

test("MDF treatment text retains foreign-guideline provenance", () => {
  const result = buildAldGuidelineReference({ mdf: 32 });
  const mdfCard = result.cards.find(item => item.id === "mdf");
  assert.equal(mdfCard.sourceLevel, SOURCE_LEVEL.FOREIGN_GUIDELINE_CITED);
  assert.match(mdfCard.provenanceNote, /AASLD/);
});

test("Lille is displayed without an unverified automatic threshold", () => {
  const result = buildAldGuidelineReference({ lilleDay7: 0.52 });
  const lilleCard = result.cards.find(item => item.id === "lille-day7");
  assert.equal(lilleCard.value, 0.52);
  assert.equal(lilleCard.automatedInterpretation, false);
});

test("reported GMA evidence is not labeled as a domestic recommendation", () => {
  const result = buildAldGuidelineReference({ clinicianSelectedContext: "severe-alcoholic-hepatitis" });
  const report = result.cards.find(item => item.id === "steroid-pulse-gma-report");
  assert.equal(report.sourceLevel, SOURCE_LEVEL.REPORTED_EVIDENCE);
  assert.match(report.evidenceNote, /保険適用外/);
});

test("complication text only includes clinician-selected complications", () => {
  const result = buildAldGuidelineReference({ complications: { bacterialInfection: true, dic: false, gastrointestinalBleeding: true } });
  const narrative = result.cards.find(item => item.id === "complication-treatment-narrative");
  assert.match(narrative.statement, /細菌感染症/);
  assert.match(narrative.statement, /消化管出血/);
  assert.doesNotMatch(narrative.statement, /DIC/);
});
