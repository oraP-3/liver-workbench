import { useState, type ReactNode } from "react";
import { buildAldGuidelineReference } from "../ald.js";
import {
  biochemicalRemission,
  formalCriteria,
  pslConversions,
  severity,
  simplifiedScore,
} from "../aih";
import { aldScores, commonScores } from "../clinical";
import {
  aclfEntryCriteria,
  aclfOrganFailureCriteria,
  acuteLiverFailureCoagulation,
  encephalopathyMatchesSelectedContext,
  liverFailureDefinition,
  type Criterion,
} from "../liverFailure";
import type { Assessment, CaseRecord, ModuleId } from "../types";

const moduleNames: Record<ModuleId, string> = {
  common: "共通スコア",
  aih: "AIH 2021",
  liverFailure: "肝不全・ACLF",
  ald: "ALD 2022",
};

export function ResultsPane({
  record,
  assessmentIndex,
  module,
  onModule,
  onRecord,
}: {
  record: CaseRecord;
  assessmentIndex: number;
  module: ModuleId;
  onModule: (module: ModuleId) => void;
  onRecord: (record: CaseRecord) => void;
}) {
  const assessment =
    record.assessments[assessmentIndex] ?? record.assessments[0];
  const updateAssessment = (next: Assessment) =>
    onRecord({
      ...record,
      assessments: record.assessments.map((item, index) =>
        index === assessmentIndex ? next : item,
      ),
    });

  return (
    <section className="results-pane" aria-live="polite">
      <div className="module-tabs" role="tablist" aria-label="臨床モジュール">
        {(Object.keys(moduleNames) as ModuleId[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={module === item}
            className={module === item ? "active" : ""}
            onClick={() => onModule(item)}
          >
            {moduleNames[item]}
          </button>
        ))}
      </div>
      {module === "common" && <CommonResults assessment={assessment} />}
      {module === "aih" && (
        <AihResults
          record={record}
          assessment={assessment}
          onAssessment={updateAssessment}
        />
      )}
      {module === "liverFailure" && (
        <LiverFailureResults
          record={record}
          assessment={assessment}
          onAssessment={updateAssessment}
        />
      )}
      {module === "ald" && (
        <AldResults
          record={record}
          assessment={assessment}
          onAssessment={updateAssessment}
        />
      )}
      <p className="offline-note">
        搭載済みの静的根拠を表示しています。オフライン版は最新情報へ自動追随せず、実行時にガイドラインを取得しません。
      </p>
    </section>
  );
}

function LiverFailureResults({
  record,
  assessment,
  onAssessment,
}: {
  record: CaseRecord;
  assessment: Assessment;
  onAssessment: (assessment: Assessment) => void;
}) {
  const [baselineId, setBaselineId] = useState(record.assessments[0]?.id ?? "");
  const context =
    assessment.selectedClinicalContexts.find((item) =>
      item.startsWith("lf-"),
    ) ?? "";
  const baseline =
    record.assessments.find((item) => item.id === baselineId) ?? null;
  const definition = liverFailureDefinition(context);
  const coagulation = acuteLiverFailureCoagulation(assessment);
  const encephalopathy = encephalopathyMatchesSelectedContext(
    context,
    assessment,
  );
  const transplantFacility =
    assessment.facilitySnapshot?.performsTransplant ?? "unknown";
  const urgentTransplantContext = [
    "lf-alf-acute",
    "lf-alf-subacute",
    "lf-lohf",
  ].includes(context);
  const setContext = (value: string) =>
    onAssessment({
      ...assessment,
      selectedClinicalContexts: [
        ...assessment.selectedClinicalContexts.filter(
          (item) => !item.startsWith("lf-"),
        ),
        ...(value ? [value] : []),
      ],
    });

  return (
    <div className="result-view">
      <ViewHeader
        eyebrow="使用者が病態を選択して参照"
        title="急性肝不全・LOHF・ACLF"
        description="国内基準・ガイドライン記載との対応"
      />
      <div className="select-row">
        <label>
          使用者が選択した病態
          <select
            value={context}
            onChange={(event) => setContext(event.target.value)}
          >
            <option value="">未選択</option>
            <option value="lf-alf-noncoma">急性肝不全 非昏睡型</option>
            <option value="lf-alf-acute">急性肝不全 昏睡型・急性型</option>
            <option value="lf-alf-subacute">急性肝不全 昏睡型・亜急性型</option>
            <option value="lf-lohf">遅発性肝不全（LOHF）</option>
            <option value="lf-aclf">ACLF</option>
          </select>
        </label>
        {context === "lf-aclf" && (
          <label>
            増悪前の評価時点
            <select
              value={baselineId}
              onChange={(event) => setBaselineId(event.target.value)}
            >
              {record.assessments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {!definition ? (
        <p className="empty-state">
          医師が参照する病態を選択すると、その病態の国内基準・記載を表示します。
        </p>
      ) : (
        <>
          <article className="reference-card definition-card">
            <span className="source-label domestic-guide-narrative">
              国内定義
            </span>
            <h2>{definition.title}</h2>
            <p>{definition.text}</p>
          </article>

          {context !== "lf-aclf" && (
            <div className="criteria-list">
              <CriterionRow criterion={coagulation} />
              {encephalopathy && <CriterionRow criterion={encephalopathy} />}
            </div>
          )}

          {context === "lf-aclf" && (
            <>
              <h2 className="result-section-title">ACLF診断基準との対応</h2>
              <div className="criteria-list">
                {aclfEntryCriteria(baseline, assessment).map((criterion) => (
                  <CriterionRow key={criterion.id} criterion={criterion} />
                ))}
              </div>
              <h2 className="result-section-title">
                重症度分類に用いる臓器機能不全
              </h2>
              <div className="criteria-list">
                {aclfOrganFailureCriteria(assessment).map((criterion) => (
                  <CriterionRow key={criterion.id} criterion={criterion} />
                ))}
              </div>
              <p className="scope-note">
                各臓器条件との対応を示します。未入力項目がある状態でGradeを補完せず、ACLF診断・重症度は使用者が判断します。
              </p>
            </>
          )}

          {urgentTransplantContext && (
            <article
              className={`result-card full-card ${transplantFacility === "no" ? "urgent-card" : "caution-card"}`}
            >
              <span className="source-label domestic-recommendation">
                日本肝臓学会・肝移植適応情報
              </span>
              <h2>昏睡型急性肝不全・LOHFと移植評価</h2>
              <p>
                現行の国内情報では、昏睡II度以上かつ肝移植適応スコア4点以上の急性肝不全昏睡型・LOHFは、緊急に肝移植が必要となるI群の対象です。スコアや登録適応は移植実施施設が評価します。
              </p>
              {transplantFacility === "no" && (
                <p className="facility-alert">
                  この評価時点は「自施設で肝移植を実施しない」施設設定です。日本肝臓学会は、厳格な登録基準を満たすまで待たず、早期に移植施設へ問い合わせるよう案内しています。
                </p>
              )}
              {transplantFacility === "unknown" && (
                <p className="missing">施設の肝移植実施有無が未設定です。</p>
              )}
              <small>
                日本肝臓学会「肝移植の適応」・脳死肝移植レシピエント適応基準（2026年3月変更）
              </small>
            </article>
          )}
        </>
      )}
      <p className="scope-note">
        病態選択、診断、治療適用、肝移植適応を自動決定しません。
      </p>
    </div>
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

function CommonResults({ assessment }: { assessment: Assessment }) {
  const scores = commonScores(assessment);
  const meta = {
    fib4: ["FIB-4", "年齢×AST÷（血小板[10⁹/L]×√ALT）"],
    fib3: ["FIB-3", "5×ln(AST)−2×ln(ALT)−0.18×血小板[10⁴/µL]−5"],
    child: ["Child-Pugh", "T-Bil・Alb・PT-INR・腹水・肝性脳症"],
    meld: ["MELD", "上下限処理後のT-Bil・PT-INR・Crを使用（6–40）"],
    meldNa: ["MELD-Na", "MELDとNa（125–137 mEq/Lへ制限）を使用（6–40）"],
  } as const;
  return (
    <div className="result-view">
      <ViewHeader
        eyebrow="選択中の評価時点"
        title="共通スコア"
        description={assessment.label}
      />
      <div className="score-grid">
        {(Object.keys(scores) as Array<keyof typeof scores>).map((key) => {
          const item = scores[key];
          const value = item.value;
          const display =
            value == null
              ? "未算出"
              : typeof value === "object"
                ? `${value.score} / Class ${value.class}`
                : Number(value).toFixed(
                    key === "fib4" || key === "fib3" ? 2 : 0,
                  );
          return (
            <article className="result-card" key={key}>
              <span className="source-label calculation">計算結果</span>
              <h2>{meta[key][0]}</h2>
              <strong className="result-value">{display}</strong>
              <p className="used-point">使用評価時点：{assessment.label}</p>
              {item.missing.length > 0 && (
                <p className="missing">不足項目：{item.missing.join("、")}</p>
              )}
              {key === "fib3" && (
                <p className="caution">
                  研究指標・ガイドライン推奨未確認。カットオフ判定は行いません。
                </p>
              )}
              <details>
                <summary>計算式と版情報</summary>
                <p>{meta[key][1]}</p>
                {key === "child" && assessment.findings.cholestaticChild && (
                  <p>胆汁うっ滞性疾患用のT-Bil区分を使用しています。</p>
                )}
              </details>
            </article>
          );
        })}
      </div>
      <p className="scope-note">
        計算値から診断、治療または移植適応を自動決定しません。
      </p>
    </div>
  );
}

type AihMode = "criteria" | "guideline" | "response" | "acute";

function AihResults({
  record,
  assessment,
  onAssessment,
}: {
  record: CaseRecord;
  assessment: Assessment;
  onAssessment: (assessment: Assessment) => void;
}) {
  const [mode, setMode] = useState<AihMode>("criteria");
  const [baselineId, setBaselineId] = useState(record.assessments[0]?.id ?? "");
  const [followId, setFollowId] = useState(record.assessments[1]?.id ?? "");
  const formal = formalCriteria(assessment);
  const simplified = simplifiedScore(assessment);
  const severityResult = severity(assessment);
  const psl = pslConversions(assessment.labs.weight);
  const follow =
    record.assessments.find((item) => item.id === followId) ?? null;
  const remission = biochemicalRemission(follow);

  return (
    <div className="result-view">
      <ViewHeader
        eyebrow="自己免疫性肝炎"
        title="AIH診療ガイドライン2021"
        description="基準・記載との対応を表示"
      />
      <div className="subtabs">
        {(
          [
            ["criteria", "診断基準との対応"],
            ["guideline", "治療の記載"],
            ["response", "治療反応"],
            ["acute", "急性・重症例"],
          ] as Array<[AihMode, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={mode === value ? "active" : ""}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "criteria" && (
        <div className="score-grid">
          <InfoCard
            label="国内ガイドライン"
            title="厚労省研究班診断指針との形式的対応"
            value={formal.status}
          >
            {formal.range && <p>支持項目：{formal.range} / 4</p>}
            {formal.missing.length > 0 && (
              <p className="missing">{formal.missing.join("、")}</p>
            )}
            <p>診断確定ではなく、入力項目と形式的基準との対応です。</p>
          </InfoCard>
          <InfoCard
            label="計算結果"
            title="簡易型国際診断基準"
            value={
              simplified.total == null ? "未算出" : `${simplified.total}点`
            }
          >
            <p>{simplified.interpretation}</p>
            {simplified.missing.length > 0 && (
              <p className="missing">
                不足項目：{simplified.missing.join("、")}
              </p>
            )}
            <details>
              <summary>点数内訳</summary>
              <p>
                自己抗体 {simplified.components.antibody ?? "—"} / IgG{" "}
                {simplified.components.igg ?? "—"} / 組織{" "}
                {simplified.components.histology ?? "—"} / ウイルス除外{" "}
                {simplified.components.viral ?? "—"}
              </p>
            </details>
          </InfoCard>
          <InfoCard
            label="国内ガイドライン"
            title="AIH重症度分類との形式的対応"
            value={severityResult.level}
          >
            {severityResult.reasons.map((reason) => (
              <p key={reason}>・{reason}</p>
            ))}
            {severityResult.missing.length > 0 && (
              <p className="missing">
                判定に必要：{severityResult.missing.join("、")}
              </p>
            )}
            <p>該当条件は入力済み項目の範囲で表示します。</p>
          </InfoCard>
          <article className="result-card full-card caution-card">
            <h2>急性発症例の適用限界</h2>
            <p>
              急性発症AIHでは自己抗体陰性またはIgG非上昇の例があり、低得点のみでAIHを否定する表示は行いません。
            </p>
          </article>
        </div>
      )}

      {mode === "guideline" && (
        <div className="reference-list">
          <ReferenceCard title="治療対象に関する記載">
            2021年版では、AIHと診断した症例ではALT 30
            U/L超が治療対象として記載されています。入力値だけから診断または治療適用を決定しません。
          </ReferenceCard>
          <ReferenceCard title="第一選択治療と体重換算">
            副腎皮質ステロイドが第一選択と記載されています。
            {psl
              ? `体重${assessment.labs.weight} kgの単純換算は0.6 mg/kg/日＝${psl.dose06} mg/日、0.8 mg/kg/日＝${psl.dose08} mg/日です。`
              : "体重入力後に0.6および0.8 mg/kg/日の単純換算値を表示します。"}{" "}
            錠数への丸めや処方量決定は行いません。
          </ReferenceCard>
          <ReferenceCard title="肝生検と治療開始">
            肝生検は診断・病型評価に重要とされますが、急性・重症例では治療開始を遅らせない判断が記載されています。個別症例の開始判断は使用者が行います。
          </ReferenceCard>
          <ReferenceCard title="AZAを検討する際の確認事項">
            AZAが検討される状況では、NUDT15、血球減少、HBVスクリーニング等に関する記載があります。
          </ReferenceCard>
        </div>
      )}

      {mode === "response" && (
        <div className="response-panel">
          <div className="select-row">
            <label>
              開始時点
              <select
                value={baselineId}
                onChange={(event) => setBaselineId(event.target.value)}
              >
                {record.assessments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              フォロー時点
              <select
                value={followId}
                onChange={(event) => setFollowId(event.target.value)}
              >
                <option value="">未選択</option>
                {record.assessments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <InfoCard
            label="国内ガイドライン"
            title="生化学的寛解との数値上の対応"
            value={
              remission.matches == null
                ? "未算出"
                : remission.matches
                  ? "数値条件に対応"
                  : "数値条件に未対応"
            }
          >
            {remission.missing.length > 0 && (
              <p className="missing">
                不足項目：{remission.missing.join("、")}
              </p>
            )}
            <p>
              選択したフォロー時点のAST・ALT・IgGと、その評価時点に保存された施設ULNを使用します。
            </p>
            <p>
              臨床経過：
              {courseLabel(follow?.treatments.clinicalCourse ?? "unknown")}
              （使用者選択）
            </p>
            <p>
              開始時点：
              {record.assessments.find((item) => item.id === baselineId)
                ?.label ?? "未選択"}
            </p>
          </InfoCard>
          <ReferenceCard title="不完全反応・再燃">
            数値条件と臨床経過を並列表示し、数値だけから不完全反応、再燃、治療不成功を自動確定しません。
          </ReferenceCard>
        </div>
      )}

      {mode === "acute" && (
        <div className="reference-list">
          <label className="field">
            <span>使用者が参照する病態</span>
            <select
              value={
                assessment.selectedClinicalContexts.find((item) =>
                  item.startsWith("aih-acute"),
                ) ?? ""
              }
              onChange={(event) =>
                onAssessment({
                  ...assessment,
                  selectedClinicalContexts: [
                    ...assessment.selectedClinicalContexts.filter(
                      (item) => !item.startsWith("aih-acute"),
                    ),
                    ...(event.target.value ? [event.target.value] : []),
                  ],
                })
              }
            >
              <option value="">未選択</option>
              <option value="aih-acute">急性発症AIH</option>
              <option value="aih-acute-severe">重症AIH</option>
              <option value="aih-acute-liver-failure">
                AIHを原因とする急性肝不全
              </option>
              <option value="aih-acute-aclf">AIHを背景とするACLF</option>
            </select>
          </label>
          <ReferenceCard title="急性発症・重症例に関する2021年版の記載">
            選択した病態に関連するAIH
            2021の記載を参照します。一般的な急性肝不全、LOHF、ACLFの診断や移植適応を実装した画面ではありません。
          </ReferenceCard>
        </div>
      )}
    </div>
  );
}

function AldResults({
  record,
  assessment,
  onAssessment,
}: {
  record: CaseRecord;
  assessment: Assessment;
  onAssessment: (assessment: Assessment) => void;
}) {
  const [day0Id, setDay0Id] = useState(assessment.id);
  const [day7Id, setDay7Id] = useState(
    record.assessments.find((item) => item.id !== assessment.id)?.id ?? "",
  );
  const day0 =
    record.assessments.find((item) => item.id === day0Id) ?? assessment;
  const day7 = record.assessments.find((item) => item.id === day7Id) ?? null;
  const scores = aldScores(day0, day7);
  const storedContext =
    assessment.selectedClinicalContexts.find((item) =>
      item.startsWith("ald-"),
    ) ?? "";
  const context =
    storedContext === "ald-aclf"
      ? "aclf-with-severe-alcoholic-hepatitis"
      : storedContext === "ald-severe"
        ? "severe-alcoholic-hepatitis"
        : "unselected";
  const reference = buildAldGuidelineReference({
    clinicianSelectedContext: context,
    jasResult: scores.jas.value,
    mdf: scores.mdf.value,
    lilleDay7: scores.lille.value,
    complications: {
      bacterialInfection: day0.findings.bacterialInfection === "yes",
      dic: day0.findings.dic === "yes",
      gastrointestinalBleeding:
        day0.findings.gastrointestinalBleeding === "yes",
    },
  });
  const setContext = (value: string) =>
    onAssessment({
      ...assessment,
      selectedClinicalContexts: [
        ...assessment.selectedClinicalContexts.filter(
          (item) => !item.startsWith("ald-"),
        ),
        ...(value ? [value] : []),
      ],
    });
  return (
    <div className="result-view">
      <ViewHeader
        eyebrow="アルコール関連肝疾患"
        title="ALD診療ガイド2022"
        description="スコアと出典階層を分離して表示"
      />
      <div className="select-row">
        <label>
          開始時点
          <select
            value={day0Id}
            onChange={(event) => setDay0Id(event.target.value)}
          >
            {record.assessments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          1週後評価時点
          <select
            value={day7Id}
            onChange={(event) => setDay7Id(event.target.value)}
          >
            <option value="">未選択</option>
            {record.assessments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          使用者が選択した病態
          <select
            value={storedContext}
            onChange={(event) => setContext(event.target.value)}
          >
            <option value="">未選択</option>
            <option value="ald-severe">重症アルコール性肝炎</option>
            <option value="ald-aclf">
              ACLF病態で発症する重症アルコール性肝炎
            </option>
          </select>
        </label>
      </div>
      <div className="score-grid">
        <InfoCard
          label="計算結果"
          title="JAS"
          value={scores.jas.value ? `${scores.jas.value.score}点` : "未算出"}
        >
          {scores.jas.value && (
            <p>{severityLabel(scores.jas.value.severity)}</p>
          )}
          {scores.jas.missing.length > 0 && (
            <p className="missing">不足項目：{scores.jas.missing.join("、")}</p>
          )}
        </InfoCard>
        <InfoCard
          label="計算結果"
          title="MDF"
          value={
            scores.mdf.value == null ? "未算出" : scores.mdf.value.toFixed(1)
          }
        >
          {scores.mdf.missing.length > 0 && (
            <p className="missing">不足項目：{scores.mdf.missing.join("、")}</p>
          )}
        </InfoCard>
        <InfoCard
          label="計算結果"
          title="Lille score"
          value={
            scores.lille.value == null
              ? "未算出"
              : scores.lille.value.toFixed(3)
          }
        >
          {scores.lille.missing.length > 0 && (
            <p className="missing">
              不足項目：{scores.lille.missing.join("、")}
            </p>
          )}
          <p>
            Albはg/dLからg/L、T-Bilはmg/dLからµmol/Lへ内部変換しています。継続・中止の自動判定は行いません。
          </p>
        </InfoCard>
      </div>
      <div className="reference-list">
        {reference.cards.map(
          (card: {
            id: string;
            title: string;
            statement: string;
            sourceLevel: string;
            source: { page: number };
          }) => (
            <article className="reference-card" key={card.id}>
              <span className={`source-label ${card.sourceLevel}`}>
                {sourceLabel(card.sourceLevel)}
              </span>
              <h2>{card.title}</h2>
              <p>{card.statement}</p>
              <small>
                アルコール性肝障害（アルコール関連肝疾患）診療ガイド2022 p.
                {card.source.page}
              </small>
            </article>
          ),
        )}
      </div>
      <p className="scope-note">{reference.disclaimer}</p>
    </div>
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
function InfoCard({
  label,
  title,
  value,
  children,
}: {
  label: string;
  title: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <article className="result-card">
      <span className="source-label calculation">{label}</span>
      <h2>{title}</h2>
      <strong className="result-value text-value">{value}</strong>
      {children}
    </article>
  );
}
function ReferenceCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="reference-card">
      <span className="source-label domestic-guide-narrative">
        国内ガイド本文
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      <small>自己免疫性肝炎（AIH）診療ガイドライン2021</small>
    </article>
  );
}
const sourceLabel = (source: string) =>
  ({
    "domestic-recommendation": "国内Recommendation",
    "domestic-guide-narrative": "国内ガイド本文",
    "foreign-guideline-cited-by-domestic-guide":
      "国内ガイド本文が引用する海外ガイドライン",
    "reported-evidence": "有用との報告",
  })[source] ?? "参照情報";
const severityLabel = (value: string) =>
  ({ severe: "重症", moderate: "中等症", mild: "軽症" })[value] ?? value;
const courseLabel = (value: string) =>
  ({
    improving: "改善",
    worsening: "増悪",
    intolerant: "副作用で継続困難",
    relapse: "寛解後再上昇",
    unknown: "未選択",
  })[value] ?? value;
