import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMOS } from "./demos";
import { emptyCase, emptyFacility } from "./model";
import {
  collisionCodes,
  createBackup,
  loadCases,
  loadFacilities,
  loadLastExportedAt,
  mergeBackup,
  noteExport,
  saveAll,
  saveFacilities,
  validateBackup,
} from "./storage";
import type { Backup, CaseRecord, Facility, ModuleId } from "./types";
import { Field, SelectField, TriOptions } from "./components/Fields";
import { InputPane } from "./components/InputPane";
import { Modal } from "./components/Modal";
import { ResultsPane } from "./components/ResultsPane";

type ModalId = "cases" | "facilities" | "backup" | null;

export function App() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [record, setRecord] = useState<CaseRecord>(() => emptyCase());
  const [assessmentIndex, setAssessmentIndex] = useState(0);
  const [module, setModule] = useState<ModuleId>("common");
  const [dirty, setDirty] = useState(false);
  const [demo, setDemo] = useState(false);
  const [modal, setModal] = useState<ModalId>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("lw-input-collapsed") === "true",
  );
  const resultsRef = useRef<HTMLElement>(null);
  const selectedFacility =
    facilities.find((facility) => facility.id === selectedFacilityId) ?? null;

  useEffect(() => {
    Promise.all([loadCases(), loadFacilities()])
      .then(([storedCases, storedFacilities]) => {
        setCases(storedCases);
        setFacilities(storedFacilities);
        if (storedFacilities[0]) setSelectedFacilityId(storedFacilities[0].id);
        if (storedCases[0]) setRecord(structuredClone(storedCases[0]));
      })
      .catch((error: unknown) =>
        setNotice(
          error instanceof Error
            ? error.message
            : "保存データを読み取れませんでした。",
        ),
      )
      .finally(() => setLoading(false));
    const update = () => setUpdateAvailable(true);
    window.addEventListener("lw-update", update);
    return () => window.removeEventListener("lw-update", update);
  }, []);

  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);

  const changeRecord = useCallback((next: CaseRecord) => {
    setRecord(next);
    setDirty(true);
  }, []);

  const save = async () => {
    const caseCode = record.caseCode.trim();
    if (!caseCode) return setNotice("症例整理番号は必須です。");
    if (
      cases.some((item) => item.caseCode === caseCode && item.id !== record.id)
    ) {
      return setNotice("同じ症例整理番号が保存済みです。");
    }
    const next = { ...record, caseCode, updatedAt: new Date().toISOString() };
    const updated = [...cases.filter((item) => item.id !== next.id), next].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    );
    try {
      await saveAll(updated, facilities);
      setCases(updated);
      setRecord(next);
      setDirty(false);
      setDemo(false);
      setNotice("症例をこのブラウザ内に保存しました。");
    } catch {
      setNotice(
        "保存できませんでした。ブラウザの空き容量と設定を確認してください。",
      );
    }
  };

  const switchCase = (next: CaseRecord) => {
    if (
      dirty &&
      !window.confirm("未保存の編集があります。症例を切り替えますか？")
    )
      return;
    setRecord(structuredClone(next));
    setAssessmentIndex(0);
    setDirty(false);
    setDemo(false);
    setModal(null);
  };

  const newCase = () => {
    if (
      dirty &&
      !window.confirm("未保存の編集があります。新規症例へ移動しますか？")
    )
      return;
    setRecord(emptyCase(selectedFacility));
    setAssessmentIndex(0);
    setDirty(false);
    setDemo(false);
    setModal(null);
  };

  const selectAssessment = (index: number) => {
    if (
      dirty &&
      index !== assessmentIndex &&
      !window.confirm("未保存の編集があります。評価時点を切り替えますか？")
    )
      return;
    setAssessmentIndex(index);
  };

  const selectModule = (next: ModuleId) => {
    setModule(next);
    if (window.innerWidth <= 980) {
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  };

  const setInputCollapsed = (value: boolean) => {
    setCollapsed(value);
    localStorage.setItem("lw-input-collapsed", String(value));
  };

  const sexLabel = {
    female: "女性",
    male: "男性",
    other: "その他",
    unknown: "未入力",
  }[record.demographics.sex];

  if (loading)
    return <div className="loading">Liver Workbenchを読み込んでいます…</div>;

  return (
    <div className="app">
      <header className="appbar">
        <div className="brand">
          <span className="brand-mark">LW</span>
          <span>
            <strong>Liver Workbench</strong>
            <small>
              {
                {
                  common: "共通スコア",
                  aih: "AIH 2021",
                  liverFailure: "肝不全・ACLF",
                  ald: "ALD 2022",
                }[module]
              }
            </small>
          </span>
        </div>
        <nav aria-label="主要操作">
          <button type="button" onClick={() => setModal("cases")}>
            症例一覧
          </button>
          <button type="button" onClick={() => setModal("backup")}>
            バックアップ
          </button>
          <button type="button" className="primary header-save" onClick={save}>
            保存
          </button>
          <button type="button" onClick={() => setModal("facilities")}>
            {selectedFacility?.name || "施設未設定"}
          </button>
        </nav>
      </header>
      <p className="purpose">
        入力値と国内ガイドライン等の記載・スコアとの対応を整理する参照ツールです。診断、病態選択、治療適用は使用者が判断します。症例データはこのブラウザ内に保存されます。
      </p>
      {dirty && (
        <div className="status-banner warning">未保存の編集があります。</div>
      )}
      {demo && <div className="status-banner demo">架空症例・未保存</div>}
      {updateAvailable && (
        <div className="status-banner update">
          新しい版があります。症例を保存後に再読み込みしてください。
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            type="button"
            aria-label="通知を閉じる"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      <main className="workspace">
        <InputPane
          record={record}
          assessmentIndex={assessmentIndex}
          module={module}
          facility={selectedFacility}
          collapsed={collapsed}
          onCollapsed={setInputCollapsed}
          onRecord={changeRecord}
          onAssessmentIndex={selectAssessment}
          onSave={save}
        />
        <section ref={resultsRef} className="results-wrapper">
          <ResultsPane
            record={record}
            assessmentIndex={assessmentIndex}
            module={module}
            onModule={selectModule}
            onRecord={changeRecord}
          />
        </section>
      </main>

      <footer className="app-footer">
        <span>ver {__APP_VERSION__}</span>
        <span>commit {__COMMIT_SHA__}</span>
        <span>ガイドライン確認日 2026-08-14</span>
      </footer>

      {modal === "cases" && (
        <Modal title="症例一覧" onClose={() => setModal(null)} wide>
          <p className="modal-warning">
            ブラウザデータを削除すると症例も消失します。定期的にJSONバックアップを保存してください。
          </p>
          <div className="modal-actions">
            <button type="button" className="primary" onClick={newCase}>
              新規症例
            </button>
          </div>
          <h3>保存済み症例</h3>
          {cases.length === 0 ? (
            <p className="empty-state">保存済み症例はありません。</p>
          ) : (
            <div className="case-list">
              {cases.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.caseCode}</strong>
                    <p>
                      {item.demographics.ageAtBaseline ?? "年齢未入力"}歳・
                      {
                        {
                          female: "女性",
                          male: "男性",
                          other: "その他",
                          unknown: "性別未入力",
                        }[item.demographics.sex]
                      }{" "}
                      ／ {item.assessments.at(-1)?.label ?? "評価なし"}
                    </p>
                    <small>
                      {item.assessments.at(-1)?.facilitySnapshot?.name ??
                        "施設未設定"}{" "}
                      ／ 更新 {new Date(item.updatedAt).toLocaleString("ja-JP")}
                    </small>
                  </div>
                  <div>
                    <button type="button" onClick={() => switchCase(item)}>
                      開く
                    </button>
                    <button
                      type="button"
                      className="danger-link"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `症例整理番号「${item.caseCode}」を削除しますか？`,
                          )
                        )
                          return;
                        const updated = cases.filter(
                          (saved) => saved.id !== item.id,
                        );
                        await saveAll(updated, facilities);
                        setCases(updated);
                        if (record.id === item.id) newCase();
                      }}
                    >
                      削除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <h3>架空デモ症例</h3>
          <div className="demo-grid">
            {Object.entries(DEMOS).map(([name, make]) => (
              <button
                type="button"
                key={name}
                onClick={() => {
                  if (
                    dirty &&
                    !window.confirm(
                      "未保存の編集があります。デモ症例へ移動しますか？",
                    )
                  )
                    return;
                  setRecord(make());
                  setAssessmentIndex(0);
                  setDirty(true);
                  setDemo(true);
                  setModal(null);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal === "facilities" && (
        <FacilityModal
          facilities={facilities}
          selectedId={selectedFacilityId}
          onClose={() => setModal(null)}
          onSaved={(updated, selectedId) => {
            setFacilities(updated);
            setSelectedFacilityId(selectedId);
            setModal(null);
            setNotice(
              "施設設定を保存しました。過去の評価時点スナップショットは変更していません。",
            );
          }}
        />
      )}

      {modal === "backup" && (
        <BackupModal
          cases={cases}
          facilities={facilities}
          onClose={() => setModal(null)}
          onImported={async (updatedCases, updatedFacilities) => {
            await saveAll(updatedCases, updatedFacilities);
            setCases(updatedCases);
            setFacilities(updatedFacilities);
            setNotice("バックアップをインポートしました。");
            setModal(null);
          }}
        />
      )}
      <span className="sr-only">
        現在の症例：{record.caseCode || "新規"}、{sexLabel}
      </span>
    </div>
  );
}

function FacilityModal({
  facilities,
  selectedId,
  onClose,
  onSaved,
}: {
  facilities: Facility[];
  selectedId: string;
  onClose: () => void;
  onSaved: (facilities: Facility[], selectedId: string) => void;
}) {
  const [draft, setDraft] = useState<Facility>(() =>
    structuredClone(
      facilities.find((item) => item.id === selectedId) ?? emptyFacility(),
    ),
  );
  const number = (value: string) => (value === "" ? null : Number(value));
  const save = async () => {
    if (!draft.name.trim()) return window.alert("施設名は必須です。");
    const updated = [
      ...facilities.filter((item) => item.id !== draft.id),
      { ...draft, name: draft.name.trim() },
    ];
    await saveFacilities(updated);
    onSaved(updated, draft.id);
  };
  return (
    <Modal title="施設設定" onClose={onClose}>
      <p className="modal-warning">
        施設名だけで保存できます。SWEは単位と施設カットオフ値の記録のみで、換算やステージ判定は行いません。
      </p>
      <SelectField
        label="保存済み施設"
        value={draft.id}
        onChange={(id) =>
          setDraft(
            structuredClone(
              facilities.find((item) => item.id === id) ?? emptyFacility(),
            ),
          )
        }
      >
        <option value={draft.id}>{draft.name || "新規施設"}</option>
        {facilities
          .filter((item) => item.id !== draft.id)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
      </SelectField>
      <button
        type="button"
        className="small-button"
        onClick={() => setDraft(emptyFacility())}
      >
        ＋新しい施設
      </button>
      <div className="field-grid">
        <Field
          label="施設名（必須）"
          type="text"
          value={draft.name}
          onChange={(name) => setDraft({ ...draft, name })}
        />
        <Field
          label="AST ULN"
          value={draft.astUln}
          onChange={(value) => setDraft({ ...draft, astUln: number(value) })}
        />
        <Field
          label="ALT ULN"
          value={draft.altUln}
          onChange={(value) => setDraft({ ...draft, altUln: number(value) })}
        />
        <Field
          label="ALP ULN"
          value={draft.alpUln}
          onChange={(value) => setDraft({ ...draft, alpUln: number(value) })}
        />
        <Field
          label="IgG ULN"
          value={draft.iggUln}
          onChange={(value) => setDraft({ ...draft, iggUln: number(value) })}
        />
        <SelectField
          label="SWE単位"
          value={draft.sweUnit ?? ""}
          onChange={(value) =>
            setDraft({
              ...draft,
              sweUnit: value ? (value as Facility["sweUnit"]) : null,
            })
          }
        >
          <option value="">未設定</option>
          <option value="kPa">kPa</option>
          <option value="m/s">m/s</option>
        </SelectField>
        <Field
          label="SWE施設カットオフ値"
          value={draft.sweCutoff}
          onChange={(value) => setDraft({ ...draft, sweCutoff: number(value) })}
        />
        <SelectField
          label="自施設で肝移植を実施"
          value={draft.performsTransplant}
          onChange={(value) =>
            setDraft({
              ...draft,
              performsTransplant: value as Facility["performsTransplant"],
            })
          }
        >
          <TriOptions />
        </SelectField>
      </div>
      <div className="modal-actions">
        <button type="button" className="primary" onClick={save}>
          施設を保存
        </button>
        {facilities.some((item) => item.id === draft.id) && (
          <button
            type="button"
            className="danger-link"
            onClick={async () => {
              if (!window.confirm(`施設「${draft.name}」を削除しますか？`))
                return;
              const updated = facilities.filter((item) => item.id !== draft.id);
              await saveFacilities(updated);
              onSaved(updated, updated[0]?.id ?? "");
            }}
          >
            施設を削除
          </button>
        )}
      </div>
    </Modal>
  );
}

function BackupModal({
  cases,
  facilities,
  onClose,
  onImported,
}: {
  cases: CaseRecord[];
  facilities: Facility[];
  onClose: () => void;
  onImported: (cases: CaseRecord[], facilities: Facility[]) => void;
}) {
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<Backup | null>(null);
  const [error, setError] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  useEffect(() => {
    loadLastExportedAt()
      .then(setLastExport)
      .catch(() => setLastExport(null));
  }, []);
  const collisions = useMemo(
    () => (incoming ? collisionCodes(incoming.cases, cases) : []),
    [incoming, cases],
  );
  const exportJson = async () => {
    const backup = createBackup(cases, facilities);
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `liver-workbench-${backup.exportedAt.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    await noteExport(backup.exportedAt);
    setLastExport(backup.exportedAt);
  };
  const importNow = () => {
    if (!incoming) return;
    if (overwrite && collisions.length > 0 && !confirmOverwrite)
      return setError("上書きの明示確認が必要です。");
    const mergedFacilities = [
      ...facilities,
      ...incoming.facilities.filter(
        (item) => !facilities.some((saved) => saved.id === item.id),
      ),
    ];
    onImported(mergeBackup(incoming.cases, cases, overwrite), mergedFacilities);
  };
  return (
    <Modal title="バックアップ" onClose={onClose} wide>
      <p className="modal-warning">
        ブラウザデータの削除や端末故障に備え、JSONを端末外にも保管してください。ファイルに症例データが含まれます。
      </p>
      <section className="backup-section">
        <h3>エクスポート</h3>
        <p>
          症例 {cases.length}件 ／ 施設 {facilities.length}件
        </p>
        <p>
          最終エクスポート：
          {lastExport
            ? new Date(lastExport).toLocaleString("ja-JP")
            : "記録なし"}
        </p>
        <button type="button" className="primary" onClick={exportJson}>
          JSONを保存
        </button>
      </section>
      <section className="backup-section">
        <h3>インポート</h3>
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            setError("");
            setIncoming(null);
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              setIncoming(validateBackup(await file.text()));
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "読み取れませんでした。",
              );
            }
          }}
        />
        {error && <p className="missing">{error}</p>}
        {incoming && (
          <div className="import-preview">
            <p>
              読込予定：症例 {incoming.cases.length}件 ／ 施設{" "}
              {incoming.facilities.length}件 ／ schema {incoming.schemaVersion}
            </p>
            <p>
              衝突する症例整理番号：
              {collisions.length ? collisions.join("、") : "なし"}
            </p>
            {collisions.length > 0 && (
              <>
                <label className="explicit-choice">
                  <input
                    type="radio"
                    checked={!overwrite}
                    onChange={() => setOverwrite(false)}
                  />
                  既存を保持して衝突症例をスキップ
                </label>
                <label className="explicit-choice">
                  <input
                    type="radio"
                    checked={overwrite}
                    onChange={() => setOverwrite(true)}
                  />
                  衝突症例を上書き
                </label>
                {overwrite && (
                  <label className="explicit-choice danger">
                    <input
                      type="checkbox"
                      checked={confirmOverwrite}
                      onChange={(event) =>
                        setConfirmOverwrite(event.target.checked)
                      }
                    />
                    上記の症例整理番号を上書きすることを確認
                  </label>
                )}
              </>
            )}
            <button type="button" className="primary" onClick={importNow}>
              インポートを実行
            </button>
          </div>
        )}
      </section>
    </Modal>
  );
}
