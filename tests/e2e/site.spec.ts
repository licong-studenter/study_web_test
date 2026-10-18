import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('xiaoju:intro', '1');
    } catch {
      // Ignore storage restrictions.
    }
  });
});

test('home renders the course map and hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('让智能');
  await expect(page.getByText('一条从系统认知到真机交付的主线')).toBeVisible();
  await expect(page.locator('.home-course-card')).toHaveCount(4);
  await expect(page.locator('.xj-hero-orb')).toBeVisible();
});

test('course matrix navigates through course, module and lesson', async ({ page }) => {
  await page.goto('/courses/');
  await expect(page.locator('.course-card')).toHaveCount(4);
  await page.getByRole('link', { name: /具身智能基础/ }).first().click();
  await expect(page).toHaveURL(/\/courses\/foundations\//);
  await expect(page.locator('.module-row')).toHaveCount(8);
  await page.getByRole('link', { name: /走进具身智能/ }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('走进具身智能');
  await page.locator('.lesson-row').first().click();
  await expect(page.locator('.lesson-head h1')).toContainText('从人工智能到具身智能');
  await expect(page.locator('.quiz-card')).toBeVisible();
});

test('quiz gives feedback and can be retried', async ({ page }) => {
  await page.goto('/courses/foundations/foundations/1-from-ai-to-embodied/');
  const firstQuestion = page.locator('.quiz-question').first();
  await page.locator('.quiz-card').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.documentElement.dataset.quizReady === 'true');
  await firstQuestion.locator('.quiz-option').nth(1).click();
  await expect(firstQuestion.locator('.quiz-feedback')).toContainText('回答正确');
  await expect(firstQuestion.locator('.quiz-option').nth(1)).toHaveClass(/correct/);
});

test('search palette finds a lesson', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.searchReady === 'true');
  await page.getByRole('button', { name: '搜索课程' }).click();
  await expect(page.locator('.search-panel')).toBeVisible();
  await page.getByLabel('搜索关键词').fill('MPC');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/courses\//);
});

test('mobile navigation opens at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: '菜单' }).click();
  await expect(page.locator('#mobile-nav')).toHaveClass(/open/);
  await page.locator('#mobile-nav').getByRole('link', { name: '课程' }).click();
  await expect(page).toHaveURL(/\/courses\//);
});

test('algorithm lab renders interactive modules', async ({ page }) => {
  await page.goto('/algorithms/');
  await expect(page.locator('.lab-card')).toHaveCount(6);
  await expect(page.locator('.lab-card').first().locator('canvas')).toBeVisible();
  await expect(page.locator('input[type="range"]')).toHaveCount(12);
  await expect(page.getByRole('heading', { name: /把公式跑起来/ })).toBeVisible();
});

test('MPC and A* labs respond to interaction', async ({ page }) => {
  await page.goto('/algorithms/');
  const mpc = page.getByTestId('mpc-lab');
  await mpc.scrollIntoViewIfNeeded();
  const mpcSlider = mpc.locator('input[type="range"]').nth(1);
  await mpcSlider.fill('12');
  await expect(mpc).toContainText('位置误差');

  const astar = page.getByTestId('astar-lab');
  await astar.scrollIntoViewIfNeeded();
  const weight = astar.locator('input[type="range"]').first();
  await weight.fill('2.8');
  await expect(astar).toContainText('2.8');
  await expect(astar.locator('canvas')).toBeVisible();
});

test('internal navigation performs a page-turn transition', async ({ page }) => {
  await page.goto('/');
  await page.locator('.main-nav').getByRole('link', { name: '算法实验室' }).click();
  await expect(page).toHaveURL(/\/algorithms\//, { timeout: 5000 });
  await expect(page.locator('.lab-card').first()).toBeVisible();
});

test('page-turn direction follows next and previous links', async ({ page }) => {
  await page.goto('/courses/foundations/foundations/1-from-ai-to-embodied/');
  const overlay = page.locator('.page-transition');
  await page.locator('.lesson-nav a.next').click();
  await expect(overlay).toHaveClass(/is-forward/);
  await expect(page).toHaveURL(/2-definition-and-features/, { timeout: 5000 });
  await page.locator('.lesson-nav a').first().click();
  await expect(overlay).toHaveClass(/is-back/);
  await expect(page).toHaveURL(/1-from-ai-to-embodied/, { timeout: 5000 });
});

test('legacy course URLs redirect into the course matrix', async ({ page }) => {
  await page.goto('/course/');
  await expect(page).toHaveURL(/\/courses\/foundations\/$/, { timeout: 5000 });
  await page.goto('/course/control-theory/');
  await expect(page).toHaveURL(/\/courses\/automatic-control\/control-theory\/$/, { timeout: 5000 });
});

test('admin requires a token and shows permission errors', async ({ page }) => {
  await page.route('https://api.github.com/repos/**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          full_name: 'demo/embodied-ai-lab',
          default_branch: 'main',
          private: false,
          html_url: 'https://github.com/demo/embodied-ai-lab',
          permissions: { push: false },
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/admin/');
  await expect(page.getByRole('heading', { name: '登录内容管理' })).toBeVisible();
  await page.getByLabel('Owner').fill('demo');
  await page.getByLabel('Repository').fill('embodied-ai-lab');
  await page.getByLabel('Fine-grained token').fill('github_pat_test');
  await page.getByRole('button', { name: '连接仓库' }).click();
  await expect(page.getByText('没有写入权限')).toBeVisible();
});
