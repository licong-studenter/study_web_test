import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(`PAGE ${error.message}`));

await page.goto('http://localhost:4321/?intro=1', { waitUntil: 'commit' });
await page.locator('.intro-root').waitFor({ state: 'visible', timeout: 6000 });
await page.waitForTimeout(1550);
await page.screenshot({ path: 'screenshots/bright-intro.png' });
await page.locator('.intro-skip').click();
await page.waitForTimeout(1000);
await page.screenshot({ path: 'screenshots/bright-home.png' });

await page.goto('http://localhost:4321/courses/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/bright-courses.png', fullPage: true });

await page.goto('http://localhost:4321/courses/automatic-control/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/bright-course-detail.png', fullPage: true });

await page.goto('http://localhost:4321/algorithms/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/bright-algorithms.png', fullPage: true });
await page.locator('#lab-5').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator('#lab-5').screenshot({ path: 'screenshots/bright-mpc-lab.png' });
await page.locator('#lab-6').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator('#lab-6').screenshot({ path: 'screenshots/bright-astar-lab.png' });

await page.goto('http://localhost:4321/404.html', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'screenshots/bright-404.png' });

await page.goto('http://localhost:4321/courses/automatic-control/control-theory/2-pid-and-state-space/', {
  waitUntil: 'networkidle',
});
await page.locator('.prose h2').nth(1).scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/bright-lesson.png' });

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto('http://localhost:4321/?intro=1', { waitUntil: 'commit' });
await mobile.locator('.intro-root').waitFor({ state: 'visible', timeout: 6000 });
await mobile.waitForTimeout(1550);
await mobile.screenshot({ path: 'screenshots/bright-mobile-intro.png' });
await mobile.locator('.intro-skip').click();
await mobile.waitForTimeout(1000);
await mobile.screenshot({ path: 'screenshots/bright-mobile.png' });

await mobile.goto('http://localhost:4321/courses/', { waitUntil: 'networkidle' });
await mobile.waitForTimeout(400);
await mobile.screenshot({ path: 'screenshots/bright-mobile-courses.png', fullPage: true });

console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
