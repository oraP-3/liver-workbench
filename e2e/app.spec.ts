import { expect, test } from '@playwright/test';

test('app shell starts and captures its responsive layout', async ({ page }, testInfo) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /診療情報を/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '結果' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`app-${testInfo.project.name}.png`), fullPage: true });
});

test('production service worker starts the shell offline', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /診療情報を/ })).toBeVisible();
});
