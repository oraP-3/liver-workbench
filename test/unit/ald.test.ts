import { describe,expect,it } from "vitest";import { aldScores } from "../../src/clinical";import { emptyAssessment } from "../../src/model";import { buildAldGuidelineReference,SOURCE_LEVEL } from "../../src/ald.js";
describe("ALD presentation",()=>{it("converts Lille UI units",()=>{const d0=emptyAssessment(),d7=emptyAssessment();d0.age=50;d0.labs={albumin:3,totalBilirubin:10,ptSeconds:18};d0.findings.renalInsufficiency="no";d7.labs.totalBilirubin=5;const actual=aldScores(d0,d7).lille;expect(actual).not.toBeNull()});it("keeps fixed source hierarchy",()=>{const cards=buildAldGuidelineReference({clinicianSelectedContext:"aclf-with-severe-alcoholic-hepatitis",mdf:32,lilleDay7:.5}).cards;expect(cards.find((x:any)=>x.id==="mdf").sourceLevel).toBe(SOURCE_LEVEL.FOREIGN_GUIDELINE_CITED);expect(cards.find((x:any)=>x.id==="domestic-steroid-consideration").sourceLevel).toBe(SOURCE_LEVEL.DOMESTIC_RECOMMENDATION);expect(cards.find((x:any)=>x.id==="lille-day7").automatedInterpretation).toBe(false)})});

it("does not treat missing JAS complications or Lille renal status as negative", () => {
  const day0 = emptyAssessment();
  const day7 = emptyAssessment();
  day0.age = 50;
  day0.labs = { wbc: 22000, creatinine: 2, inr: 2, totalBilirubin: 10, albumin: 3, ptSeconds: 18 };
  day7.labs.totalBilirubin = 5;
  expect(aldScores(day0, day7).jas).toBeNull();
  expect(aldScores(day0, day7).lille).toBeNull();
});
