import { test, expect, type Page } from '@playwright/test';

async function dismissIntro(page: Page) {
  const intro = page.locator('.intro-root');
  if ((await intro.count()) === 0) return;
  try {
    await page.locator('.intro-skip').click({ timeout: 1800 });
  } catch {
    // The intro may have finished on its own while the page was loading.
  }
  await expect(intro).toHaveCount(0, { timeout: 3000 });
}

test('first visit plays the cinematic intro and can be skipped', async ({ page }) => {
  await page.goto('/?intro=1', { waitUntil: 'commit' });
  await page.locator('.intro-root').waitFor({ state: 'visible', timeout: 5000 });
  await expect(page.locator('.intro-root')).toBeVisible();
  await expect(page.locator('.intro-title')).toContainText('小具正在醒来');
  await page.locator('.intro-skip').click();
  await expect(page.locator('.intro-root')).toHaveCount(0);
  await expect(page.locator('h1')).toContainText('让智能');
  expect(await page.evaluate(() => sessionStorage.getItem('xiaoju:intro'))).toBe('1');
});

test('intro is not repeated on reload in the same session', async ({ page }) => {
  await page.goto('/');
  await dismissIntro(page);
  await page.reload();
  await expect(page.locator('.intro-root')).toHaveCount(0);
});

test('intro can be replayed with the query flag', async ({ page }) => {
  await page.goto('/');
  await dismissIntro(page);
  await page.goto('/?intro=1', { waitUntil: 'commit' });
  await page.locator('.intro-root').waitFor({ state: 'visible', timeout: 5000 });
  await expect(page.locator('.intro-root')).toBeVisible();
});

test('reduced motion skips the intro', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.intro-root')).toHaveCount(0);
});

test('xiaoju pet opens tips, minimizes and persists its state', async ({ page }) => {
  await page.goto('/');
  await dismissIntro(page);
  const pet = page.locator('.xj-pet');
  await expect(pet).toBeVisible();
  await page.locator('.xj-pet-button').click();
  await expect(page.locator('#xj-pet-bubble')).toBeVisible();
  await expect(page.locator('[data-xj-pet-line]')).not.toHaveText('');
  await page.keyboard.press('Escape');
  await expect(page.locator('#xj-pet-bubble')).toBeHidden();
  await page.locator('.xj-pet-min').click();
  await expect(pet).toHaveClass(/is-min/);
  await page.reload();
  await expect(pet).toHaveClass(/is-min/);
});

test('admin hides the intro and the mascot', async ({ page }) => {
  await page.goto('/admin/');
  await expect(page.locator('.intro-root')).toHaveCount(0);
  await expect(page.locator('.xj-pet')).toHaveCount(0);
});

test('xiaoju responds to the published speak event', async ({ page }) => {
  await page.goto('/');
  await dismissIntro(page);
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('xiaoju:speak', { detail: { text: '测试鼓励语', mood: 'happy' } }),
    );
  });
  await expect(page.locator('#xj-pet-bubble')).toContainText('测试鼓励语');
});

test('the 3D hero reaches an interactive canvas', async ({ page }) => {
  await page.goto('/');
  await dismissIntro(page);
  await expect
    .poll(async () => page.locator('.hero-stage canvas').count(), { timeout: 20_000 })
    .toBeGreaterThan(0);
});
