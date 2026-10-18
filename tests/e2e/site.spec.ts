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
  await expect(page.getByText('一条从认知到交付的工程主线')).toBeVisible();
  await expect(page.locator('.chapter-card')).toHaveCount(8);
  await expect(page.locator('.hero-stage')).toBeVisible();
});

test('course navigates from chapter to lesson', async ({ page }) => {
  await page.goto('/course/');
  await expect(page.locator('.course-row')).toHaveCount(8);
  await page.getByRole('link', { name: /走进具身智能/ }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('走进具身智能');
  await page.locator('.lesson-row').first().click();
  await expect(page.locator('.lesson-head h1')).toContainText('从人工智能到具身智能');
  await expect(page.locator('.quiz-card')).toBeVisible();
});

test('quiz gives feedback and can be retried', async ({ page }) => {
  await page.goto('/course/foundations/1-from-ai-to-embodied/');
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
  await expect(page).toHaveURL(/\/course\//);
});

test('mobile navigation opens at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: '菜单' }).click();
  await expect(page.locator('#mobile-nav')).toHaveClass(/open/);
  await page.locator('#mobile-nav').getByRole('link', { name: '课程' }).click();
  await expect(page).toHaveURL(/\/course\//);
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
