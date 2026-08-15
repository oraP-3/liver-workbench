import type { ReactNode } from "react";
import { commonScores } from "../clinical";
import {
  hbvAcuteSeverityCriteria,
  hbvChronicTreatmentStatus,
  hbvCirrhosisDnaCriterion,
  hbvRiskCriteria,
  hcvInitialRegimens,
  hcvNeedsSpecialistRetreatment,
  type HcvRegimen,
} from "../viralHepatitis";
import type { Criterion } from "../liverFailure";
import type { Assessment } from "../types";

export function HbvResults({
  assessment,
  onAssessment,
}: {
  assessment: Assessment;
  onAssessment: (assessment: Assessment) => void;
}) {
  const context =
    assessment.selectedClinicalContexts.find((item) =>
      item.startsWith("hbv-"),
    ) ?? "";
  const chronic = hbvChronicTreatmentStatus(assessment);
  const setContext = (value: string) =>
    onAssessment({
      ...assessment,
      selectedClinicalContexts: [
        ...assessment.selectedClinicalContexts.filter(
          (item) => !item.startsWith("hbv-"),
        ),
        ...(value ? [value] : []),
      ],
    });
  const transplantFacility =
    assessment.facilitySnapshot?.performsTransplant ?? "unknown";

  return (
    <div className="result-view">
      <ViewHeader
        eyebrow="B型肝炎"
        title="B型肝炎治療ガイドライン 第5版"
        description="2026年6月版の記載との対応"
      />
      <div className="select-row">
        <label>
          使用者が選択した病態
          <select
            value={context}
            onChange={(event) => setContext(event.target.value)}
          >
            <option value="">未選択</option>
            <option value="hbv-chronic">B型慢性肝炎</option>
            <option value="hbv-cirrhosis">B型肝硬変</option>
            <option value="hbv-acute">B型急性肝炎</option>
            <option value="hbv-acute-failure">HBVによる急性肝不全</option>
            <option value="hbv-reactivation">HBV再活性化対策</option>
          </select>
        </label>
      </div>

      {!context && (
        <p className="empty-state">
          医師が参照する病態を選択すると、対応する国内ガイドライン記載を表示します。
        </p>
      )}

      {context === "hbv-chronic" && (
        <>
          <article className={`result-card full-card hbv-${chronic.tone}`}>
            <span className="source-label calculation">入力値との対応</span>
            <h2>慢性肝炎の治療対象</h2>
            <strong className="result-value text-value">{chronic.label}</strong>
            <p>{chronic.detail}</p>
            {chronic.missing.length > 0 && (
              <p className="missing">不足項目：{chronic.missing.join("、")}</p>
            )}
            <small>B型肝炎治療ガイドライン第5版 p.25–26</small>
          </article>
          <h2 className="result-section-title">発癌・線維化リスクの確認</h2>
          <div className="criteria-list">
            {hbvRiskCriteria(assessment).map((criterion) => (
              <CriterionRow key={criterion.id} criterion={criterion} />
            ))}
          </div>
          <GuidelineCard title="初回治療の選択肢" page="73">
            核酸アナログではTAF、TDF、ETVが第一選択薬として記載されています。腎機能障害、低P血症、骨減少症・骨粗鬆症がある場合は、ETVまたはTAFを第一選択とする記載です。
            {assessment.viralHepatitis.renalBoneRisk === "yes" && (
              <span className="inline-alert">
                この症例では腎・骨関連リスクありと入力されています。
              </span>
            )}
          </GuidelineCard>
          <GuidelineCard title="HBe抗原陽性例のALT上昇" page="26">
            HBe抗原陽性でALTが上昇した場合、劇症化の懸念や線維化進展がなければ、自然経過でHBe抗原セロコンバージョンが起こる可能性を考慮し、1年程度治療を待機する選択肢が記載されています。一方、PT延長やビリルビン上昇を伴う急性増悪では待機を推奨しない記載です。
          </GuidelineCard>
        </>
      )}

      {context === "hbv-cirrhosis" && (
        <>
          <div className="criteria-list">
            <CriterionRow criterion={hbvCirrhosisDnaCriterion(assessment)} />
          </div>
          <GuidelineCard title="肝硬変の抗ウイルス療法" page="73">
            B型肝硬変ではHBV
            DNA陽性が治療対象で、初回から核酸アナログの長期継続治療を行う記載です。TAF、TDF、ETVが第一選択薬として挙げられています。
          </GuidelineCard>
        </>
      )}

      {(context === "hbv-acute" || context === "hbv-acute-failure") && (
        <>
          <GuidelineCard title="急性感染とキャリア急性増悪の鑑別" page="98">
            HBs抗原・抗体、IgM-HBc抗体、HBc抗体、HBV
            DNAを測定し、発症前のHBs抗原や経過中のHBs抗体陽性化も用いて鑑別する記載です。IgM-HBc抗体価は参考情報であり、単独で確定しません。
          </GuidelineCard>
          <h2 className="result-section-title">
            国内本文が引用する海外ガイドラインの重症・遷延所見
          </h2>
          <div className="criteria-list">
            {hbvAcuteSeverityCriteria(assessment).map((criterion) => (
              <CriterionRow key={criterion.id} criterion={criterion} />
            ))}
          </div>
          <article className="reference-card caution-card">
            <span className="source-label foreign-guideline-cited-by-domestic-guide">
              国内本文が引用する海外基準
            </span>
            <h2>B型急性肝炎と核酸アナログ</h2>
            <p>
              一般的なB型急性肝炎は自然軽快し治療不要とする一方、急性肝不全または遷延する重症所見では核酸アナログを検討する記載です。国内ガイドラインは、劇症化が危惧される場合の明確な単一基準はないとしています。
            </p>
            <small>B型肝炎治療ガイドライン第5版 p.99</small>
          </article>
          {context === "hbv-acute-failure" && (
            <article className="result-card full-card urgent-card">
              <span className="source-label domestic-guide-narrative">
                国内ガイド本文
              </span>
              <h2>HBVによる急性肝不全</h2>
              <p>
                急性感染かキャリア急性増悪かにかかわらず、疑われた段階で核酸アナログを速やかに開始し、集学的治療と肝移植適応の早期評価を行う記載です。
              </p>
              {transplantFacility === "no" && (
                <p className="facility-alert">
                  この評価時点は自施設で肝移植を実施しない設定です。移植施設への早期相談を想起する表示です。
                </p>
              )}
              <small>B型肝炎治療ガイドライン第5版 p.99–101</small>
            </article>
          )}
        </>
      )}

      {context === "hbv-reactivation" && (
        <HbvReactivation assessment={assessment} />
      )}

      <p className="scope-note">
        病態、感染相、治療開始、薬剤選択を自動決定しません。入力値とガイドライン記載の対応を表示します。
      </p>
    </div>
  );
}

function HbvReactivation({ assessment }: { assessment: Assessment }) {
  const viral = assessment.viralHepatitis;
  const dna = viral.hbvDnaLogIU;
  const dnaQuantified = Number.isFinite(dna);
  const dnaAtPreemptiveThreshold = dnaQuantified && (dna as number) >= 1.3;
  const screeningComplete =
    viral.hbsAg !== "unknown" &&
    viral.hbcAb !== "unknown" &&
    viral.hbsAb !== "unknown";
  const carrier = viral.hbsAg === "yes";
  const resolved =
    viral.hbsAg === "no" && (viral.hbcAb === "yes" || viral.hbsAb === "yes");
  return (
    <div className="reference-list">
      <article className="result-card">
        <span className="source-label calculation">入力状況</span>
        <h2>治療前スクリーニング</h2>
        <strong className="result-value text-value">
          {screeningComplete ? "3項目入力済み" : "未完了"}
        </strong>
        <p>HBs抗原、HBc抗体、HBs抗体を系統的に確認するフローです。</p>
        {!screeningComplete && (
          <p className="missing">未入力項目を左側で確認してください。</p>
        )}
      </article>
      {carrier && (
        <GuidelineCard title="HBs抗原陽性" page="102, 107–108">
          肝臓専門医へ相談し、HBe抗原・抗体とHBV
          DNAを評価します。免疫抑制・化学療法開始前から核酸アナログを先行または予防投与するフローです。
        </GuidelineCard>
      )}
      {resolved && (
        <>
          <GuidelineCard
            title="HBs抗原陰性・既往感染パターン"
            page="102, 107–110"
          >
            HBV
            DNAを定量し、治療内容の再活性化リスクと合わせて予防投与または定期モニタリングを選ぶフローです。
          </GuidelineCard>
          {dnaAtPreemptiveThreshold && (
            <article className="result-card full-card caution-card">
              <span className="source-label calculation">入力値との対応</span>
              <h2>HBV DNA 20 IU/mL以上</h2>
              <p>
                入力値 {dna} Log IU/mL は1.3 Log
                IU/mL以上です。既往感染例では核酸アナログの予防投与を行う国内フローに対応します。
              </p>
              <small>B型肝炎治療ガイドライン第5版 p.107–110</small>
            </article>
          )}
          {dnaQuantified && !dnaAtPreemptiveThreshold && (
            <GuidelineCard title="HBV DNA 20 IU/mL未満" page="107–110">
              1～3か月ごとにHBV DNAをモニタリングし、20 IU/mL（1.3 Log
              IU/mL）以上となった時点で核酸アナログを開始するフローです。免疫抑制・化学療法終了後も少なくとも12か月は継続する記載です。
            </GuidelineCard>
          )}
          {!dnaQuantified && (
            <p className="missing">
              予防投与とモニタリング記載との対応にはHBV
              DNA定量値を入力してください。
            </p>
          )}
        </>
      )}
      {screeningComplete && !carrier && !resolved && (
        <GuidelineCard title="3項目陰性として入力" page="102, 107">
          入力上はHBs抗原・HBc抗体・HBs抗体が陰性です。ワクチン歴、検査感度、治療内容を含む最終評価は使用者が行います。
        </GuidelineCard>
      )}
      <GuidelineCard title="再活性化対策の限界" page="102">
        予防投与によって劇症化予防が完全に保証されるわけではないことも併記されています。
      </GuidelineCard>
    </div>
  );
}

export function HcvResults({
  assessment,
  onAssessment,
}: {
  assessment: Assessment;
  onAssessment: (assessment: Assessment) => void;
}) {
  const context =
    assessment.selectedClinicalContexts.find((item) =>
      item.startsWith("hcv-"),
    ) ?? "";
  const viral = assessment.viralHepatitis;
  const scores = commonScores(assessment);
  const child = scores.child.value;
  const setContext = (value: string) =>
    onAssessment({
      ...assessment,
      selectedClinicalContexts: [
        ...assessment.selectedClinicalContexts.filter(
          (item) => !item.startsWith("hcv-"),
        ),
        ...(value ? [value] : []),
      ],
    });
  const initial = viral.hcvTreatmentHistory === "none";
  const regimens = initial ? hcvInitialRegimens(context, assessment) : [];

  return (
    <div className="result-view">
      <ViewHeader
        eyebrow="C型肝炎"
        title="C型肝炎治療ガイドライン 第8.4版"
        description="2025年4月版の治療フローを参照"
      />
      <div className="select-row">
        <label>
          使用者が選択した病態
          <select
            value={context}
            onChange={(event) => setContext(event.target.value)}
          >
            <option value="">未選択</option>
            <option value="hcv-chronic">C型慢性肝炎（非肝硬変）</option>
            <option value="hcv-compensated">C型代償性肝硬変</option>
            <option value="hcv-decompensated">C型非代償性肝硬変</option>
            <option value="hcv-svr">SVR後フォロー</option>
          </select>
        </label>
      </div>

      {!context && (
        <p className="empty-state">
          医師が参照する病態を選択すると、対応する治療フローを表示します。
        </p>
      )}

      {context && context !== "hcv-svr" && (
        <>
          <article className="reference-card">
            <span className="source-label domestic-recommendation">
              国内Recommendation
            </span>
            <h2>抗ウイルス治療の対象</h2>
            <p>
              非代償性肝硬変を含むすべてのC型肝炎症例で、年齢・ALT・血小板数にかかわらず抗ウイルス治療を検討する記載です。
            </p>
            {viral.hcvRnaDetected !== "yes" && (
              <p className="missing">
                HCV
                RNA陽性が入力されていません。持続感染の確認は使用者が行います。
              </p>
            )}
            <small>C型肝炎治療ガイドライン第8.4版 p.14</small>
          </article>

          {viral.hcvTreatmentHistory === "unknown" && (
            <p className="missing">左側でHCV治療歴を選択してください。</p>
          )}

          {initial && (
            <>
              {regimens.length > 0 && (
                <div className="regimen-grid">
                  {regimens.map((regimen) => (
                    <RegimenCard key={regimen.id} regimen={regimen} />
                  ))}
                </div>
              )}
              {context !== "hcv-decompensated" &&
                !["1", "2", "mixed12"].includes(viral.hcvGenotype) && (
                  <p className="missing">
                    国内治療フローの初回レジメン表示にはゲノタイプ1型、2型、または1・2型混合を選択してください。その他のゲノタイプはこの版では候補を自動展開しません。
                  </p>
                )}
            </>
          )}

          {context !== "hcv-decompensated" &&
            viral.hcvTreatmentHistory === "ifnProteaseFailure" && (
              <GuidelineCard
                title="IFNベースDAA前治療不成功例"
                page="資料1 p.2"
              >
                SOF/LDV、GLE/PIB、SOF/VELが治療フローに掲載されています。国内試験でDAA治療歴のある慢性肝炎・代償性肝硬変に対するGLE/PIBは12週です。腎機能と併用薬を含めて選択します。
              </GuidelineCard>
            )}

          {context !== "hcv-decompensated" &&
            hcvNeedsSpecialistRetreatment(assessment) && (
              <article className="result-card full-card caution-card">
                <span className="source-label domestic-recommendation">
                  国内Recommendation
                </span>
                <h2>IFNフリーDAA不成功例</h2>
                <p>
                  NS3/4A・NS5A領域の耐性変異、特にP32欠失を測定し、肝臓専門医が再治療薬を選択する記載です。再治療候補は前治療レジメン、ゲノタイプ、P32欠失、RBV使用可否で分岐し、一部は有効性を示すエビデンスが限定的です。
                </p>
                <p>
                  P32欠失：
                  {viral.p32Deletion === "yes"
                    ? "あり"
                    : viral.p32Deletion === "no"
                      ? "なし"
                      : "未入力"}
                </p>
                <small>C型肝炎治療ガイドライン第8.4版 資料1 p.2–3</small>
              </article>
            )}

          {context === "hcv-decompensated" && !initial && (
            <article className="result-card full-card caution-card">
              <span className="source-label domestic-recommendation">
                国内Recommendation
              </span>
              <h2>非代償性肝硬変のDAA前治療不成功例</h2>
              <p>
                SOF/VEL＋RBV 24週は推奨しない記載です。肝臓専門医の判断でSOF/VEL
                12週を選択肢として検討する記載があり、一般的な慢性肝炎・代償性肝硬変の再治療フローはここでは展開しません。
              </p>
              <small>C型肝炎治療ガイドライン第8.4版 p.66</small>
            </article>
          )}

          {context === "hcv-decompensated" && (
            <article
              className={`result-card full-card ${child && child.score >= 13 ? "urgent-card" : "caution-card"}`}
            >
              <span className="source-label domestic-recommendation">
                国内Recommendation
              </span>
              <h2>非代償性肝硬変とChild-Pugh</h2>
              <p>
                SOF/VEL 12週が選択肢として記載されています。Child-Pugh
                C、とくに13–15点は安全性が十分に検証されておらず、肝臓専門医による方針決定と極めて慎重な観察が記載されています。
              </p>
              <p>
                現在の共通入力によるChild-Pugh：
                {child ? `${child.score}点 / Class ${child.class}` : "未算出"}
              </p>
              {scores.child.missing.length > 0 && (
                <p className="missing">
                  不足項目：{scores.child.missing.join("、")}
                </p>
              )}
              <small>C型肝炎治療ガイドライン第8.4版 p.66</small>
            </article>
          )}

          <GuidelineCard title="治療開始前の確認" page="資料1・資料2">
            DAAの併用禁忌・併用注意薬、腎機能、肝予備能、HBV重複・既往感染を確認します。薬剤相互作用表は更新され得るため、このオフライン版で網羅的な処方チェックは行いません。
          </GuidelineCard>
        </>
      )}

      {context === "hcv-svr" && (
        <article className="reference-card">
          <span className="source-label domestic-recommendation">
            国内Recommendation
          </span>
          <h2>SVR後の肝発癌フォロー</h2>
          <p>
            HCV排除後も肝発癌は完全には抑制されないため、長期的な肝発癌フォローを継続し、高齢・線維化進展例では特に注意する記載です。
          </p>
          <small>C型肝炎治療ガイドライン第8.4版 p.12–13</small>
        </article>
      )}

      <p className="scope-note">
        処方、併用可否、治療適応を自動決定しません。薬剤名・期間は国内治療フローの参照表示です。
      </p>
    </div>
  );
}

function RegimenCard({ regimen }: { regimen: HcvRegimen }) {
  const label =
    regimen.state === "listed"
      ? "ガイド掲載候補"
      : regimen.state === "contraindicated"
        ? "入力上の禁忌条件"
        : "専門医判断";
  return (
    <article className={`result-card regimen-card ${regimen.state}`}>
      <span className="source-label domestic-recommendation">{label}</span>
      <h2>{regimen.name}</h2>
      <strong className="result-value text-value">{regimen.duration}</strong>
      <p>{regimen.note}</p>
      <small>C型肝炎治療ガイドライン第8.4版 資料1</small>
    </article>
  );
}

function CriterionRow({ criterion }: { criterion: Criterion }) {
  const label = {
    met: "条件に対応",
    "not-met": "条件に未対応",
    unknown: "未評価",
  }[criterion.state];
  return (
    <article className={`criterion-row ${criterion.state}`}>
      <span>{label}</span>
      <div>
        <strong>{criterion.label}</strong>
        <small>{criterion.detail}</small>
      </div>
    </article>
  );
}

function GuidelineCard({
  title,
  page,
  children,
}: {
  title: string;
  page: string;
  children: ReactNode;
}) {
  return (
    <article className="reference-card">
      <span className="source-label domestic-guide-narrative">
        国内ガイド本文
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      <small>該当ガイドライン {page}</small>
    </article>
  );
}

function ViewHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="view-header">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
