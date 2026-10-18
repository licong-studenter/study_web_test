import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.addInitScript(() => sessionStorage.setItem('xiaoju:intro', '1'));
await page.goto('http://localhost:4321/courses/foundations/foundations/1-from-ai-to-embodied/');
await page.locator('.lesson-nav a.next').click();
await page.waitForTimeout(280);
await page.screenshot({ path: 'screenshots/page-turn-forward.png' });
await page.waitForURL(/2-definition-and-features/);
await page.waitForTimeout(900);
await page.locator('.lesson-nav a').first().click();
await page.waitForTimeout(280);
await page.screenshot({ path: 'screenshots/page-turn-back.png' });
await page.waitForURL(/1-from-ai-to-embodied/);
console.log('Captured forward and back page turns.');
await browser.close();
