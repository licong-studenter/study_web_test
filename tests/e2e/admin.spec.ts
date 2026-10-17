import { test, expect, type Page } from '@playwright/test';

const LESSON_PATH = 'src/content/lessons/foundations/1-from-ai-to-embodied.mdx';
const QUIZ_PATH = 'src/content/quizzes/foundations/1-from-ai-to-embodied.json';

const lessonContent = `---
chapter: foundations
order: 1
title: 从人工智能到具身智能
summary: 测试摘要
duration: 12 分钟
objectives:
  - 目标一
  - 目标二
keywords:
  - 具身智能
  - POMDP
draft: false
---

## 测试正文

这是后台测试正文。
`;

const quizContent = JSON.stringify({
  lesson: 'foundations/1-from-ai-to-embodied',
  questions: [
    { id: 'q1', stem: '题目一', options: ['A', 'B', 'C', 'D'], answer: 1, explanation: '解析一' },
    { id: 'q2', stem: '题目二', options: ['A', 'B', 'C', 'D'], answer: 0, explanation: '解析二' },
    { id: 'q3', stem: '题目三', options: ['A', 'B', 'C', 'D'], answer: 2, explanation: '解析三' },
  ],
});

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,PUT,DELETE,OPTIONS',
};

async function setupAdminMocks(page: Page, options: { conflict?: boolean } = {}) {
  let published = '';
  let publishCalls = 0;

  await page.route('https://api.github.com/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = decodeURIComponent(url.pathname);

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

    if (path === '/repos/demo/embodied-ai-lab' && method === 'GET') {
      await json({
        full_name: 'demo/embodied-ai-lab',
        default_branch: 'main',
        private: false,
        html_url: 'https://github.com/demo/embodied-ai-lab',
        permissions: { push: true },
      });
      return;
    }

    if (path.endsWith('/git/trees/main') && method === 'GET') {
      await json({
        truncated: false,
        tree: [
          { path: LESSON_PATH, mode: '100644', type: 'blob', sha: 'lesson-sha', url: '' },
          { path: QUIZ_PATH, mode: '100644', type: 'blob', sha: 'quiz-sha', url: '' },
        ],
      });
      return;
    }

    if (path.endsWith('/actions/runs') && method === 'GET') {
      await json({ workflow_runs: [] });
      return;
    }

    if (path.includes('/commits') && method === 'GET') {
      await json([]);
      return;
    }

    if (path.endsWith(`/contents/${LESSON_PATH}`) && method === 'GET') {
      await json({
        path: LESSON_PATH,
        sha: 'lesson-sha',
        encoding: 'base64',
        size: lessonContent.length,
        content: Buffer.from(lessonContent, 'utf8').toString('base64'),
      });
      return;
    }

    if (path.endsWith(`/contents/${QUIZ_PATH}`) && method === 'GET') {
      await json({
        path: QUIZ_PATH,
        sha: 'quiz-sha',
        encoding: 'base64',
        size: quizContent.length,
        content: Buffer.from(quizContent, 'utf8').toString('base64'),
      });
      return;
    }

    if (path.endsWith(`/contents/${LESSON_PATH}`) && method === 'PUT') {
      publishCalls += 1;
      if (options.conflict) {
        await json({ message: 'sha does not match' }, 409);
        return;
      }
      const body = JSON.parse(request.postData() || '{}');
      published = Buffer.from(body.content, 'base64').toString('utf8');
      await json({
        commit: { sha: 'new-commit', html_url: 'https://github.com/demo/embodied-ai-lab/commit/new-commit' },
        content: { path: LESSON_PATH, sha: 'new-sha', html_url: 'https://github.com/demo/embodied-ai-lab/blob/main/x' },
      });
      return;
    }

    await json({ message: `unmocked ${method} ${path}` }, 404);
  });

  return {
    get published() {
      return published;
    },
    get publishCalls() {
      return publishCalls;
    },
  };
}

async function login(page: Page) {
  await page.goto('/admin/');
  await page.getByLabel('Owner').fill('demo');
  await page.getByLabel('Repository').fill('embodied-ai-lab');
  await page.getByLabel('Fine-grained token').fill('github_pat_test');
  await page.getByRole('button', { name: '连接仓库' }).click();
  await expect(page.getByRole('heading', { name: '内容管理' })).toBeVisible();
}

test('admin publishes an edited lesson through the GitHub API', async ({ page }) => {
  const mock = await setupAdminMocks(page);
  await login(page);
  await page.getByRole('button', { name: /lessons\/foundations\/1-from-ai-to-embodied/ }).click();
  await expect(page.locator('.admin-editor textarea')).toBeVisible();
  await page.locator('.admin-editor textarea').fill(`${lessonContent}\n新增测试段落。\n`);
  await page.getByRole('button', { name: '提交并发布' }).click();
  await expect(page.getByText('已提交到 GitHub')).toBeVisible();
  expect(mock.publishCalls).toBe(1);
  expect(mock.published).toContain('新增测试段落');
  expect(mock.published).toContain('title: 从人工智能到具身智能');
});

test('admin reports a 409 conflict without losing the editor', async ({ page }) => {
  await setupAdminMocks(page, { conflict: true });
  await login(page);
  await page.getByRole('button', { name: /lessons\/foundations\/1-from-ai-to-embodied/ }).click();
  await expect(page.locator('.admin-editor textarea')).toBeVisible();
  await page.getByRole('button', { name: '提交并发布' }).click();
  await expect(page.getByText(/409 冲突/)).toBeVisible();
  await expect(page.locator('.admin-editor textarea')).toBeVisible();
});
