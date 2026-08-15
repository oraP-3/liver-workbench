import { useState, type ReactNode } from "react";
import {
  createAssessmentForCase,
  emptyMedication,
  snapshotFacility,
  syncMedicationTiming,
  syncTiming,
} from "../model";
import type {
  Assessment,
  CaseRecord,
  Facility,
  MedicationExposure,
  ModuleId,
} from "../types";
import { Field, SelectField, TriOptions } from "./Fields";

const numberOrNull = (value: string) => (value === "" ? null : Number(value));

export function InputPane({
  record,
  assessmentIndex,
  module,
  facility,
  collapsed,
  onCollapsed,
  onRecord,
  onAssessmentIndex,
  onSave,
}: {
  record: CaseRecord;
  assessmentIndex: number;
  module: ModuleId;
  facility: Facility | null;
  collapsed: boolean;
  onCollapsed: (value: boolean) => void;
  onRecord: (record: CaseRecord) => void;
  onAssessmentIndex: (index: number) => void;
  onSave: () => void;
}) {
  const [drugsOpen, setDrugsOpen] = useState(false);
  const assessment =
    record.assessments[assessmentIndex] ?? record.assessments[0];
  const updateAssessment = (next: Assessment) => {
    const assessments = record.assessments.map((item, index) =>
      index === assessmentIndex ? next : item,
    );
    onRecord({ ...record, assessments });
  };
  const updateLab = (key: keyof Assessment["labs"], value: string) =>
    updateAssessment({
      ...assessment,
      labs: { ...assessment.labs, [key]: numberOrNull(value) },
    });
  const updateFinding = (key: keyof Assessment["findings"], value: unknown) =>
    updateAssessment({
      ...assessment,
      findings: { ...assessment.findings, [key]: value },
    });
  const updateLiverFailure = (
    key: keyof Assessment["liverFailure"],
    value: number | string | null,
  ) =>
    updateAssessment({
      ...assessment,
      liverFailure: { ...assessment.liverFailure, [key]: value },
    });
  const updateViralHepatitis = (
    key: keyof Assessment["viralHepatitis"],
    value: number | string | null,
  ) =>
    updateAssessment({
      ...assessment,
      viralHepatitis: { ...assessment.viralHepatitis, [key]: value },
    });
  const addAssessment = () => {
    const next = createAssessmentForCase(record, facility);
    onRecord({ ...record, assessments: [...record.assessments, next] });
    onAssessmentIndex(record.assessments.length);
  };
  const updateMedication = (index: number, next: MedicationExposure) => {
    onRecord({
      ...record,
      medications: record.medications.map((item, itemIndex) =>
        itemIndex === index ? next : item,
      ),
    });
  };

  return (
    <aside className={`input-pane ${collapsed ? "collapsed" : ""}`}>
      <div className="case-summary">
        <span>
          <strong>{record.caseCode || "新規症例"}</strong>
          <small>{assessment?.label || "評価時点なし"}</small>
        </span>
        <span className="summary-labs">
          AST {assessment?.labs.ast ?? "—"} / ALT {assessment?.labs.alt ?? "—"}{" "}
          / T-Bil {assessment?.labs.totalBilirubin ?? "—"}
        </span>
        <button
          type="button"
          onClick={() => onCollapsed(!collapsed)}
          aria-expanded={!collapsed}
        >
          {collapsed ? "入力を開く" : "入力を閉じる"}
        </button>
      </div>

      <div className="input-body">
        <InputSection title="症例基本情報">
          <Field
            label="症例整理番号（必須）"
            type="text"
            value={record.caseCode}
            onChange={(caseCode) => onRecord({ ...record, caseCode })}
          />
          <SelectField
            label="性別"
            value={record.demographics.sex}
            onChange={(sex) =>
              onRecord({
                ...record,
                demographics: {
                  ...record.demographics,
                  sex: sex as CaseRecord["demographics"]["sex"],
                },
              })
            }
          >
            <option value="unknown">未入力</option>
            <option value="female">女性</option>
            <option value="male">男性</option>
            <option value="other">その他・回答なし</option>
          </SelectField>
          <Field
            label="基準日時点年齢"
            value={record.demographics.ageAtBaseline}
            onChange={(value) =>
              onRecord({
                ...record,
                demographics: {
                  ...record.demographics,
                  ageAtBaseline: numberOrNull(value),
                },
              })
            }
          />
          <Field
            label="基準日（任意）"
            type="date"
            value={record.baselineDate}
            onChange={(value) =>
              onRecord({ ...record, baselineDate: value || null })
            }
          />
        </InputSection>

        <InputSection
          title="評価時点"
          action={
            <button
              type="button"
              className="small-button"
              onClick={addAssessment}
            >
              ＋追加
            </button>
          }
        >
          <SelectField
            label="選択中の評価時点"
            value={assessmentIndex}
            onChange={(value) => onAssessmentIndex(Number(value))}
          >
            {record.assessments.map((item, index) => (
              <option key={item.id} value={index}>
                {item.label}
              </option>
            ))}
          </SelectField>
          <Field
            label="評価名"
            type="text"
            value={assessment.label}
            onChange={(label) => updateAssessment({ ...assessment, label })}
          />
          <Field
            label="評価時点年齢"
            value={assessment.age}
            onChange={(value) =>
              updateAssessment({ ...assessment, age: numberOrNull(value) })
            }
          />
          <Field
            label="実日付"
            type="date"
            value={assessment.timing.absoluteDate}
            onChange={(value) =>
              updateAssessment(
                syncTiming(
                  {
                    ...assessment,
                    timing: {
                      ...assessment.timing,
                      absoluteDate: value || null,
                    },
                  },
                  record.baselineDate,
                  "absoluteDate",
                ),
              )
            }
          />
          <Field
            label="相対日"
            value={assessment.timing.relativeDay}
            onChange={(value) =>
              updateAssessment(
                syncTiming(
                  {
                    ...assessment,
                    timing: {
                      ...assessment.timing,
                      relativeDay: numberOrNull(value),
                    },
                  },
                  record.baselineDate,
                  "relativeDay",
                ),
              )
            }
          />
          <p className="snapshot-note">
            施設スナップショット：
            {assessment.facilitySnapshot?.name || "未設定"}
          </p>
          <button
            type="button"
            className="secondary full"
            onClick={() => {
              if (
                window.confirm("現在の施設設定をこの評価時点へ再適用しますか？")
              ) {
                updateAssessment({
                  ...assessment,
                  facilitySnapshot: snapshotFacility(facility),
                });
              }
            }}
          >
            現在の施設設定を再適用
          </button>
          {record.assessments.length > 1 && (
            <button
              type="button"
              className="danger-link"
              onClick={() => {
                if (
                  window.confirm(
                    `評価時点「${assessment.label}」を削除しますか？`,
                  )
                ) {
                  onRecord({
                    ...record,
                    assessments: record.assessments.filter(
                      (_, index) => index !== assessmentIndex,
                    ),
                  });
                  onAssessmentIndex(0);
                }
              }}
            >
              この評価時点を削除
            </button>
          )}
        </InputSection>

        <InputSection title="共通検査">
          <div className="field-grid">
            {(
              [
                ["ast", "AST (U/L)"],
                ["alt", "ALT (U/L)"],
                ["platelets", "血小板 (×10⁴/µL)"],
                ["totalBilirubin", "T-Bil (mg/dL)"],
                ["albumin", "Alb (g/dL)"],
                ["inr", "PT-INR"],
                ["creatinine", "Cr (mg/dL)"],
                ["sodium", "Na (mEq/L)"],
              ] as Array<[keyof Assessment["labs"], string]>
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={assessment.labs[key]}
                onChange={(value) => updateLab(key, value)}
              />
            ))}
          </div>
          <SelectField
            label="腹水"
            value={assessment.findings.ascites}
            onChange={(value) => updateFinding("ascites", value)}
          >
            <option value="unknown">未入力・不明</option>
            <option value="none">なし</option>
            <option value="controlled">管理可能</option>
            <option value="refractory">難治性</option>
          </SelectField>
          <SelectField
            label="肝性脳症"
            value={assessment.findings.encephalopathy}
            onChange={(value) => updateFinding("encephalopathy", value)}
          >
            <option value="unknown">未入力・不明</option>
            <option value="none">なし</option>
            <option value="grade1">Grade I</option>
            <option value="grade2">Grade II</option>
            <option value="grade12">Grade I–II（旧入力・再評価推奨）</option>
            <option value="grade34">Grade III–IV</option>
          </SelectField>
          <SelectField
            label="透析"
            value={assessment.findings.dialysis}
            onChange={(value) => updateFinding("dialysis", value)}
          >
            <TriOptions />
          </SelectField>
          <label className="check-field">
            <input
              type="checkbox"
              checked={assessment.findings.cholestaticChild}
              onChange={(event) =>
                updateFinding("cholestaticChild", event.target.checked)
              }
            />
            Child-Pughで胆汁うっ滞性疾患のT-Bil区分を使用
          </label>
        </InputSection>

        {module === "aih" && (
          <InputSection title="AIH入力">
            <div className="field-grid">
              <Field
                label="IgG (mg/dL)"
                value={assessment.labs.igg}
                onChange={(value) => updateLab("igg", value)}
              />
              <Field
                label="体重 (kg)"
                value={assessment.labs.weight}
                onChange={(value) => updateLab("weight", value)}
              />
              <Field
                label="ANA（例 1:80 / positive）"
                type="text"
                value={assessment.findings.ana}
                onChange={(value) => updateFinding("ana", value)}
              />
              <Field
                label="ASMA（例 1:40 / positive）"
                type="text"
                value={assessment.findings.asma}
                onChange={(value) => updateFinding("asma", value)}
              />
            </div>
            {(
              [
                ["lkm1", "anti-LKM1"],
                ["sla", "anti-SLA/LP"],
                ["viralExcluded", "ウイルス性肝炎の除外"],
                ["otherCausesExcluded", "他原因肝障害の除外"],
                ["liverAtrophy", "肝萎縮"],
              ] as Array<[keyof Assessment["findings"], string]>
            ).map(([key, label]) => (
              <SelectField
                key={key}
                label={label}
                value={String(assessment.findings[key])}
                onChange={(value) => updateFinding(key, value)}
              >
                <TriOptions />
              </SelectField>
            ))}
            <SelectField
              label="肝組織"
              value={assessment.findings.histology}
              onChange={(value) => updateFinding("histology", value)}
            >
              <option value="unknown">未実施・未入力</option>
              <option value="typical">typical</option>
              <option value="compatible">compatible</option>
              <option value="atypical">非典型</option>
            </SelectField>
            <SelectField
              label="副腎皮質ステロイド反応"
              value={assessment.treatments.pslResponse}
              onChange={(value) =>
                updateAssessment({
                  ...assessment,
                  treatments: {
                    ...assessment.treatments,
                    pslResponse:
                      value as Assessment["treatments"]["pslResponse"],
                  },
                })
              }
            >
              <option value="unknown">未入力・未投与</option>
              <option value="marked">著効</option>
              <option value="present">反応あり</option>
              <option value="absent">反応なし</option>
            </SelectField>
            <SelectField
              label="臨床経過（使用者選択）"
              value={assessment.treatments.clinicalCourse}
              onChange={(value) =>
                updateAssessment({
                  ...assessment,
                  treatments: {
                    ...assessment.treatments,
                    clinicalCourse:
                      value as Assessment["treatments"]["clinicalCourse"],
                  },
                })
              }
            >
              <option value="unknown">未選択</option>
              <option value="improving">改善</option>
              <option value="worsening">増悪</option>
              <option value="intolerant">副作用で継続困難</option>
              <option value="relapse">寛解後再上昇</option>
            </SelectField>
          </InputSection>
        )}

        {module === "liverFailure" && (
          <InputSection title="急性肝不全・LOHF・ACLF入力">
            <div className="field-grid">
              <Field
                label="PT活性 (%)"
                value={assessment.labs.ptActivity}
                onChange={(value) => updateLab("ptActivity", value)}
              />
              <Field
                label="初発症状から脳症II度以上まで (日)"
                value={assessment.liverFailure.onsetToEncephalopathyDays}
                onChange={(value) =>
                  updateLiverFailure(
                    "onsetToEncephalopathyDays",
                    numberOrNull(value),
                  )
                }
              />
              <Field
                label="増悪要因から現在まで (日)"
                value={assessment.liverFailure.acuteExacerbationDays}
                onChange={(value) =>
                  updateLiverFailure(
                    "acuteExacerbationDays",
                    numberOrNull(value),
                  )
                }
              />
              <Field
                label="P/F比"
                value={assessment.liverFailure.pao2Fio2}
                onChange={(value) =>
                  updateLiverFailure("pao2Fio2", numberOrNull(value))
                }
              />
              <Field
                label="S/F比"
                value={assessment.liverFailure.spo2Fio2}
                onChange={(value) =>
                  updateLiverFailure("spo2Fio2", numberOrNull(value))
                }
              />
            </div>
            <SelectField
              label="ドパミンまたはドブタミン投与"
              value={assessment.liverFailure.vasopressor}
              onChange={(value) => updateLiverFailure("vasopressor", value)}
            >
              <TriOptions />
            </SelectField>
            <SelectField
              label="肝萎縮"
              value={assessment.findings.liverAtrophy}
              onChange={(value) => updateFinding("liverAtrophy", value)}
            >
              <TriOptions />
            </SelectField>
            <p className="snapshot-note">
              病態の選択は右側の結果画面で行います。入力値だけから急性肝不全、LOHF、ACLFを自動診断しません。
            </p>
          </InputSection>
        )}

        {module === "ald" && (
          <InputSection title="ALD入力">
            <div className="field-grid">
              <Field
                label="WBC (/µL)"
                value={assessment.labs.wbc}
                onChange={(value) => updateLab("wbc", value)}
              />
              <Field
                label="PT活性 (%)"
                value={assessment.labs.ptActivity}
                onChange={(value) => updateLab("ptActivity", value)}
              />
              <Field
                label="患者PT (秒)"
                value={assessment.labs.ptSeconds}
                onChange={(value) => updateLab("ptSeconds", value)}
              />
              <Field
                label="対照PT (秒)"
                value={assessment.labs.controlPtSeconds}
                onChange={(value) => updateLab("controlPtSeconds", value)}
              />
            </div>
            {(
              [
                ["renalInsufficiency", "腎機能障害"],
                ["bacterialInfection", "細菌感染症"],
                ["dic", "DIC"],
                ["gastrointestinalBleeding", "消化管出血"],
              ] as Array<[keyof Assessment["findings"], string]>
            ).map(([key, label]) => (
              <SelectField
                key={key}
                label={label}
                value={String(assessment.findings[key])}
                onChange={(value) => updateFinding(key, value)}
              >
                <TriOptions />
              </SelectField>
            ))}
          </InputSection>
        )}

        {module === "hbv" && (
          <InputSection title="HBV入力">
            <div className="field-grid">
              <Field
                label="HBV DNA (Log IU/mL)"
                value={assessment.viralHepatitis.hbvDnaLogIU}
                onChange={(value) =>
                  updateViralHepatitis("hbvDnaLogIU", numberOrNull(value))
                }
              />
              <Field
                label="IgM-HBc抗体 index"
                value={assessment.viralHepatitis.igmHbcAbIndex}
                onChange={(value) =>
                  updateViralHepatitis("igmHbcAbIndex", numberOrNull(value))
                }
              />
              <Field
                label="HBcrAg (Log U/mL)"
                value={assessment.viralHepatitis.hbcrAgLogU}
                onChange={(value) =>
                  updateViralHepatitis("hbcrAgLogU", numberOrNull(value))
                }
              />
              <Field
                label="eGFR (mL/min/1.73m²)"
                value={assessment.labs.egfr}
                onChange={(value) => updateLab("egfr", value)}
              />
            </div>
            {(
              [
                ["hbvDnaDetected", "HBV DNA検出"],
                ["hbeAg", "HBe抗原"],
                ["hbsAg", "HBs抗原"],
                ["hbsAb", "HBs抗体"],
                ["hbcAb", "HBc抗体"],
                ["fibrosisF2Plus", "肝線維化 F2以上"],
                ["hccFamilyHistory", "肝細胞癌の家族歴"],
                ["renalBoneRisk", "腎機能障害・低P血症・骨減少症/骨粗鬆症"],
              ] as Array<[keyof Assessment["viralHepatitis"], string]>
            ).map(([key, label]) => (
              <SelectField
                key={key}
                label={label}
                value={String(assessment.viralHepatitis[key])}
                onChange={(value) => updateViralHepatitis(key, value)}
              >
                <TriOptions />
              </SelectField>
            ))}
          </InputSection>
        )}

        {module === "hcv" && (
          <InputSection title="HCV入力">
            <div className="field-grid">
              <Field
                label="eGFR (mL/min/1.73m²)"
                value={assessment.labs.egfr}
                onChange={(value) => updateLab("egfr", value)}
              />
            </div>
            <SelectField
              label="HCV RNA"
              value={assessment.viralHepatitis.hcvRnaDetected}
              onChange={(value) =>
                updateViralHepatitis("hcvRnaDetected", value)
              }
            >
              <TriOptions />
            </SelectField>
            <SelectField
              label="HCVゲノタイプ"
              value={assessment.viralHepatitis.hcvGenotype}
              onChange={(value) => updateViralHepatitis("hcvGenotype", value)}
            >
              <option value="unknown">未入力</option>
              <option value="1">1型</option>
              <option value="2">2型</option>
              <option value="mixed12">1型・2型混合</option>
              <option value="other">その他</option>
            </SelectField>
            <SelectField
              label="HCV治療歴"
              value={assessment.viralHepatitis.hcvTreatmentHistory}
              onChange={(value) =>
                updateViralHepatitis("hcvTreatmentHistory", value)
              }
            >
              <option value="unknown">未入力</option>
              <option value="none">DAA治療歴なし</option>
              <option value="ifnProteaseFailure">
                プロテアーゼ阻害薬＋Peg-IFN＋RBV不成功
              </option>
              <option value="ifnFreeDaaFailure">IFNフリーDAA不成功</option>
            </SelectField>
            {assessment.viralHepatitis.hcvTreatmentHistory ===
              "ifnFreeDaaFailure" && (
              <SelectField
                label="NS5A P32欠失"
                value={assessment.viralHepatitis.p32Deletion}
                onChange={(value) => updateViralHepatitis("p32Deletion", value)}
              >
                <TriOptions />
              </SelectField>
            )}
          </InputSection>
        )}

        <section className="input-section compact">
          <button
            className="section-toggle"
            type="button"
            onClick={() => setDrugsOpen(!drugsOpen)}
            aria-expanded={drugsOpen}
          >
            <span>DILI薬剤歴（点数化なし）</span>
            <span>{drugsOpen ? "−" : "＋"}</span>
          </button>
          {drugsOpen && (
            <div className="section-content">
              <button
                type="button"
                className="small-button"
                onClick={() =>
                  onRecord({
                    ...record,
                    medications: [...record.medications, emptyMedication()],
                  })
                }
              >
                薬剤を追加
              </button>
              {record.medications.length === 0 && (
                <p className="muted">薬剤歴はまだありません。</p>
              )}
              {record.medications.map((medication, index) => (
                <div className="drug-card" key={medication.id}>
                  <Field
                    label={`薬剤名 ${index + 1}`}
                    type="text"
                    value={medication.name}
                    onChange={(name) =>
                      updateMedication(index, { ...medication, name })
                    }
                  />
                  <div className="field-grid">
                    <Field
                      label="開始実日付"
                      type="date"
                      value={medication.start.absoluteDate}
                      onChange={(value) =>
                        updateMedication(
                          index,
                          syncMedicationTiming(
                            {
                              ...medication,
                              start: {
                                ...medication.start,
                                absoluteDate: value || null,
                              },
                            },
                            record.baselineDate,
                            "start",
                            "absoluteDate",
                          ),
                        )
                      }
                    />
                    <Field
                      label="開始相対日"
                      value={medication.start.relativeDay}
                      onChange={(value) =>
                        updateMedication(
                          index,
                          syncMedicationTiming(
                            {
                              ...medication,
                              start: {
                                ...medication.start,
                                relativeDay: numberOrNull(value),
                              },
                            },
                            record.baselineDate,
                            "start",
                            "relativeDay",
                          ),
                        )
                      }
                    />
                    <Field
                      label="中止実日付"
                      type="date"
                      value={medication.stop.absoluteDate}
                      onChange={(value) =>
                        updateMedication(
                          index,
                          syncMedicationTiming(
                            {
                              ...medication,
                              stop: {
                                ...medication.stop,
                                absoluteDate: value || null,
                              },
                            },
                            record.baselineDate,
                            "stop",
                            "absoluteDate",
                          ),
                        )
                      }
                    />
                    <Field
                      label="中止相対日"
                      value={medication.stop.relativeDay}
                      onChange={(value) =>
                        updateMedication(
                          index,
                          syncMedicationTiming(
                            {
                              ...medication,
                              stop: {
                                ...medication.stop,
                                relativeDay: numberOrNull(value),
                              },
                            },
                            record.baselineDate,
                            "stop",
                            "relativeDay",
                          ),
                        )
                      }
                    />
                  </div>
                  <SelectField
                    label="再投与"
                    value={medication.reexposure}
                    onChange={(value) =>
                      updateMedication(index, {
                        ...medication,
                        reexposure: value as MedicationExposure["reexposure"],
                      })
                    }
                  >
                    <TriOptions />
                  </SelectField>
                  <SelectField
                    label="疑わしさ"
                    value={medication.suspicion}
                    onChange={(value) =>
                      updateMedication(index, {
                        ...medication,
                        suspicion: value as MedicationExposure["suspicion"],
                      })
                    }
                  >
                    <option value="unknown">不明</option>
                    <option value="high">高い</option>
                    <option value="possible">あり得る</option>
                    <option value="low">低い</option>
                  </SelectField>
                  <label className="field">
                    <span>薬剤メモ</span>
                    <textarea
                      value={medication.note}
                      onChange={(event) =>
                        updateMedication(index, {
                          ...medication,
                          note: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="danger-link"
                    onClick={() =>
                      window.confirm(
                        `薬剤「${medication.name || "未入力"}」を削除しますか？`,
                      ) &&
                      onRecord({
                        ...record,
                        medications: record.medications.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      })
                    }
                  >
                    この薬剤を削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <InputSection title="評価時点メモ">
          <label className="field">
            <span>自由メモ</span>
            <textarea
              value={assessment.note}
              onChange={(event) =>
                updateAssessment({ ...assessment, note: event.target.value })
              }
            />
          </label>
        </InputSection>
        <div className="input-actions">
          <button type="button" className="primary full" onClick={onSave}>
            症例を保存
          </button>
        </div>
      </div>
    </aside>
  );
}

function InputSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="input-section">
      <div className="section-heading">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="section-content">{children}</div>
    </section>
  );
}
