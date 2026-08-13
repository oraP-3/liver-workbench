const SOURCE_LEVEL = Object.freeze({
  DOMESTIC_RECOMMENDATION: "domestic-recommendation",
  FOREIGN_GUIDELINE_CITED: "foreign-guideline-cited-by-domestic-guide",
  DOMESTIC_GUIDE_NARRATIVE: "domestic-guide-narrative",
  REPORTED_EVIDENCE: "reported-evidence"
});

const card = (id, sourceLevel, title, statement, page, extra = {}) => ({
  id,
  sourceLevel,
  title,
  statement,
  source: {
    title: "アルコール性肝障害（アルコール関連肝疾患）診療ガイド2022",
    page
  },
  ...extra
});

/**
 * 入力値から診断や治療を決定せず、医師が選択した病態とガイド本文の対応を返す。
 * clinicianSelectedContext は利用者自身の病態判断であり、本関数では推定しない。
 */
export function buildAldGuidelineReference({
  clinicianSelectedContext = "unselected",
  jasResult = null,
  mdf = null,
  lilleDay7 = null,
  complications = {}
} = {}) {
  const cards = [];

  if (jasResult && Number.isFinite(jasResult.score)) {
    cards.push(card(
      "jas-severity",
      SOURCE_LEVEL.DOMESTIC_GUIDE_NARRATIVE,
      "JASによる重症度",
      `JAS ${jasResult.score}点（${jasResult.severity}）。国内診断基準では10点以上を重症アルコール性肝炎とする。`,
      33,
      { value: jasResult.score, classification: jasResult.severity }
    ));
  }

  if (clinicianSelectedContext === "aclf-with-severe-alcoholic-hepatitis") {
    cards.push(card(
      "domestic-steroid-consideration",
      SOURCE_LEVEL.DOMESTIC_RECOMMENDATION,
      "国内Recommendation",
      "ACLFの病態で発症する重症アルコール性肝炎に対しては、副腎皮質ステロイドの投与を検討すると記載されている。",
      39
    ));
  }

  if (Number.isFinite(mdf)) {
    cards.push(card(
      "mdf",
      SOURCE_LEVEL.FOREIGN_GUIDELINE_CITED,
      "MDFと海外ガイドラインの記載",
      mdf >= 32
        ? "MDFは32以上。国内ガイド本文はAASLDガイドラインの記載として、MDF 32以上の重症アルコール性肝炎ではプレドニゾロン40 mg/日の経口投与を28日間行う方法を紹介している。"
        : "MDFは32未満。国内ガイド本文が紹介するAASLDガイドラインの『MDF 32以上』には該当しないが、この結果だけで治療方針は決定しない。",
      37,
      {
        value: mdf,
        citedThreshold: 32,
        provenanceNote: "国内Recommendation欄の直接推奨ではなく、国内ガイド本文中で引用されたAASLDガイドラインの記載"
      }
    ));
  }

  if (Number.isFinite(lilleDay7)) {
    cards.push(card(
      "lille-day7",
      SOURCE_LEVEL.FOREIGN_GUIDELINE_CITED,
      "投与開始1週後のLille score",
      "国内ガイド本文は海外ガイドラインでの運用として、ステロイド投与開始1週間後にLille scoreで継続の有無を評価する考え方を紹介している。本実装では確認済み資料に判定閾値がないため、計算値のみを表示する。",
      33,
      { value: lilleDay7, automatedInterpretation: false }
    ));
  }

  const complicationEntries = [
    ["bacterialInfection", "細菌感染症", "抗菌薬投与"],
    ["dic", "DIC", "抗凝固療法"],
    ["gastrointestinalBleeding", "消化管出血", "内視鏡的止血および必要に応じた輸血"]
  ];
  const selectedComplications = complicationEntries.filter(([key]) => complications[key] === true);
  if (selectedComplications.length > 0) {
    cards.push(card(
      "complication-treatment-narrative",
      SOURCE_LEVEL.DOMESTIC_GUIDE_NARRATIVE,
      "併存病態に関する本文記載",
      `国内ガイド本文には、${selectedComplications.map(([, name, treatment]) => `${name}では${treatment}`).join("、")}を行う旨が記載されている。`,
      37
    ));
  }

  if (clinicianSelectedContext === "severe-alcoholic-hepatitis" || clinicianSelectedContext === "aclf-with-severe-alcoholic-hepatitis") {
    cards.push(card(
      "steroid-pulse-gma-report",
      SOURCE_LEVEL.REPORTED_EVIDENCE,
      "パルス療法と顆粒球単球吸着除去療法",
      "副腎皮質ステロイドのパルス投与と顆粒球単球吸着除去療法の併用が有用との報告がある。標準治療の指示としては表示しない。",
      39,
      { evidenceNote: "本文では少数例の報告として扱われ、アルコール性肝炎に対する顆粒球単球吸着除去療法は保険適用外と記載されている。" }
    ));
    cards.push(card(
      "artificial-liver-support-evidence",
      SOURCE_LEVEL.DOMESTIC_GUIDE_NARRATIVE,
      "人工肝補助療法",
      "国内ガイド本文では、ACLFおよび重症アルコール性肝炎における人工肝補助療法のエビデンスは未確立と記載されている。",
      38
    ));
  }

  return {
    clinicianSelectedContext,
    cards,
    disclaimer: "入力値とガイドライン記載の対応を示す参照情報であり、病態の自動判定または治療指示ではない。"
  };
}

export { SOURCE_LEVEL };
