# Liver Workbench 1.0

肝疾患の入力値と、国内ガイドライン等の記載・スコアとの対応を整理する、医療者向けのオフライン参照Webアプリです。

診断、病態選択、治療適用または肝移植適応をアプリが自動決定するものではありません。表示は「入力値がどの計算結果・記載条件に対応するか」までとし、最終判断は使用者が行います。

## 公開版

mainへマージ後、GitHub Pagesへ自動公開されます。

- <https://orap-3.github.io/liver-workbench/>
- 初回読込後はアプリシェルと保存済み症例をオフラインで開けます。
- ランタイムで外部API、解析、広告、外部ログ送信を利用しません。

## v1.0の機能

- 非識別の症例整理番号による症例保存・一覧・再読込・削除
- 一症例内の複数評価時点、実日付と相対日の双方向計算
- 複数施設と評価時点ごとの施設設定スナップショット
- SWE単位（kPa／m/s）と施設カットオフ値の保存
- DILI薬剤歴の保存（点数化なし）
- JSONバックアップのエクスポート／検証付きインポート
- 共通スコア: FIB-4、FIB-3、Child-Pugh、MELD、MELD-Na
- AIH診療ガイドライン2021: 診断基準、重症度、治療記載、治療反応、急性・重症例の参照
- 急性肝不全・LOHF・ACLF: 使用者選択病態の国内定義、数値条件との対応、ACLFの6臓器機能不全、非移植施設での移植評価情報
- ALD診療ガイド2022: JAS、MDF、Lille、使用者選択病態に応じた出典階層付き記載
- PC 2ペイン、スマートフォン1列・入力全体の折り畳み
- 架空デモ症例（自動保存なし）

HCV、HBV、RECAM-J、ICI肝障害の臨床ロジック、DILI因果関係スコア、肝移植適応スコアの自動計算・適応の自動判定は現段階の対象外です。

## データの扱い

症例、評価時点、施設、薬剤歴は同じブラウザのIndexedDBにだけ保存します。氏名、生年月日、カルテ番号、住所、連絡先の入力欄はありません。

現版は保存データを暗号化しません。ブラウザデータの削除、端末故障、端末変更で消失するため、バックアップ画面からJSONを定期的に保存してください。JSONファイル自体には入力した症例データが含まれます。

## ローカル起動

Node.js 22を使用します。

```sh
npm ci
npm run dev
```

表示されたローカルURLをChromeまたはEdgeで開きます。production buildの確認は次のとおりです。

```sh
npm run build
npm run preview
```

## CodespacesでPRを確認する

1. PRの `Code` → `Codespaces` から、そのPRブランチのCodespaceを作成または開きます。
2. Terminalで `npm run dev` を実行します。
3. `Ports` の5173から `Open in Browser` を選びます。
4. Port visibilityが `Private` であることを確認します。

対話確認では架空デモ症例だけを使用してください。Codespace停止後のブラウザ保存データ維持は保証しません。

## 品質確認

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

ブラウザテストはChromiumを導入後に実行します。

```sh
npx playwright install --with-deps chromium
npm run test:e2e
```

CIは既存Nodeテスト22件、新規unit/componentテスト、lint、typecheck、production build、production依存関係監査、PC幅1280px／スマートフォン幅375pxのブラウザ・オフラインテストを実行します。PRではbuild、スクリーンショット、Playwright reportを14日保持のartifactとして保存します。

## 臨床情報の版

- 自己免疫性肝炎（AIH）診療ガイドライン2021
- 急性肝不全診療ガイドライン2021、急性肝不全・LOHF国内診断基準
- わが国におけるACLF診断基準・重症度分類2022
- 日本肝臓学会「肝移植の適応」（脳死肝移植レシピエント適応基準2026年3月変更を参照）
- アルコール性肝障害（アルコール関連肝疾患）診療ガイド2022
- ガイドライン確認日: 2026-08-14

オフライン版は最新情報へ自動追随しません。FIB-3は研究指標として表示し、ガイドライン推奨またはカットオフ判定を表示しません。Lilleは計算値だけを表示し、治療継続・中止を自動判定しません。

ALDの確認済み記載と出典階層は `src/clinical-sources.json` および `src/ald.js` に保持しています。臨床計算はUIから分離し、既存の `src/scores.js` と追加の純粋関数をテストしています。
