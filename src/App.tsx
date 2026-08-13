import { useState } from 'react';

export function App() {
  const [inputOpen, setInputOpen] = useState(true);

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/liver-workbench/" aria-label="Liver Workbench ホーム">
            <span className="brand-mark" aria-hidden="true">LW</span>
            <span><strong>Liver Workbench</strong><small>肝疾患診療ワークベンチ</small></span>
          </a>
          <span className="offline-badge">オフライン対応</span>
        </div>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">Clinical workspace</p>
          <h1 id="page-title">診療情報を、ひとつの見通しのよい画面に。</h1>
          <p>肝疾患診療に必要な情報を整理し、評価を支援するためのワークベンチです。現在はアプリ基盤を準備しています。</p>
          <div className="notice" role="note">本ツールは医療従事者の判断を補助するもので、診断や治療方針を代替しません。</div>
        </section>

        <div className="workspace">
          <section className={`panel input-panel ${inputOpen ? '' : 'collapsed'}`} aria-labelledby="input-title">
            <button className="panel-heading input-toggle" type="button" onClick={() => setInputOpen((open) => !open)} aria-expanded={inputOpen} aria-controls="input-content">
              <span><span className="step">01</span><h2 id="input-title">入力</h2><small>症例情報と評価項目</small></span>
              <span className="chevron" aria-hidden="true">⌄</span>
            </button>
            <div id="input-content" className="panel-content" hidden={!inputOpen}>
              <div className="placeholder-icon" aria-hidden="true">＋</div>
              <h2>入力モジュール準備中</h2>
              <p>今後、臨床モジュールを段階的に追加します。</p>
            </div>
          </section>

          <section className="panel result-panel" aria-labelledby="result-title">
            <div className="panel-heading">
              <span><span className="step">02</span><h2 id="result-title">結果</h2><small>評価結果と参考情報</small></span>
            </div>
            <div className="panel-content">
              <div className="placeholder-icon result" aria-hidden="true">✓</div>
              <h2>結果表示エリア</h2>
              <p>入力内容に応じた結果がここに表示されます。</p>
            </div>
          </section>
        </div>
      </main>

      <footer><span>Liver Workbench</span><span>Foundation preview</span></footer>
    </div>
  );
}
