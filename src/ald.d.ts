import type { JasResult } from "./scores.js";

export const SOURCE_LEVEL: {
  DOMESTIC_RECOMMENDATION: string;
  FOREIGN_GUIDELINE_CITED: string;
  DOMESTIC_GUIDE_NARRATIVE: string;
  REPORTED_EVIDENCE: string;
};

export interface AldReferenceCard {
  id: string;
  sourceLevel: string;
  title: string;
  statement: string;
  source: { title: string; page: number };
  value?: number;
  [key: string]: unknown;
}

export function buildAldGuidelineReference(input?: {
  clinicianSelectedContext?: string;
  jasResult?: JasResult | null;
  mdf?: number | null;
  lilleDay7?: number | null;
  complications?: Record<string, boolean>;
}): {
  clinicianSelectedContext: string;
  cards: AldReferenceCard[];
  disclaimer: string;
};
