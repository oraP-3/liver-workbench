import { expect, test } from "@playwright/test";

test("架空ALD症例の主要画面を操作してスクリーンショットを保存できる", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  await expect(
    page.getByText("Liver Workbench", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "共通スコア" })).toBeVisible();
  await page.getByRole("button", { name: "症例一覧" }).click();
  await page.getByRole("button", { name: "JAS・MDF・Lille確認用ALD" }).click();
  await page.getByRole("tab", { name: "ALD 2022" }).click();
  await expect(page.getByRole("heading", { name: "JAS" })).toBeVisible();
  await expect(page.getByText("15点", { exact: true })).toBeVisible();
  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "入力を閉じる" }).click();
    await expect(
      page.getByRole("button", { name: "入力を開く" }),
    ).toBeVisible();
  }
  await page.screenshot({
    path: testInfo.outputPath(`v1-ald-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("急性肝不全の移植連携表示をスクリーンショットで確認できる", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  await page.getByRole("button", { name: "症例一覧" }).click();
  await page
    .getByRole("button", { name: "昏睡型急性肝不全・移植連携表示" })
    .click();
  await page.getByRole("tab", { name: "肝不全・ACLF" }).click();
  await expect(
    page.getByRole("heading", {
      name: "昏睡型急性肝不全・LOHFと移植評価",
    }),
  ).toBeVisible();
  await expect(page.getByText(/自施設で肝移植を実施しない/)).toBeVisible();
  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "入力を閉じる" }).click();
  }
  await page.screenshot({
    path: testInfo.outputPath(`v1-liver-failure-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("初回読込後にオフラインでアプリシェルを再表示できる", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText("Liver Workbench", { exact: true }),
  ).toBeVisible();
});
