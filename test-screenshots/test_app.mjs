import { chromium } from 'playwright';
import path from 'path';

const SCREENSHOT_DIR = '/home/clawd/projects/x-growth-engine/test-screenshots';
const BASE_URL = 'https://koiopenclaw-max.github.io/x-growth-engine/';

const consoleMessages = [];
const jsErrors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', exc => jsErrors.push(exc.message || String(exc)));

// Step 1 & 2: Navigate to main page
console.log('=== Step 1: Navigating to main page ===');
const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
console.log(`Status: ${response?.status()}`);
await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-main-page.png'), fullPage: true });
console.log(`Title: ${await page.title()}`);
console.log(`URL: ${page.url()}`);

const bodyText = await page.innerText('body').catch(() => '(could not get body text)');
console.log(`\n=== Page text (first 500 chars) ===\n${bodyText.slice(0, 500)}`);

// Step 3: Console errors
console.log(`\n=== Console messages after main page ===`);
for (const msg of consoleMessages) {
  console.log(`  [${msg.type}] ${msg.text}`);
}
if (jsErrors.length) {
  console.log(`\n=== JS Errors ===`);
  for (const err of jsErrors) console.log(`  ERROR: ${err}`);
} else {
  console.log('  No JS errors detected.');
}

// Step 4: Navigate to /articles/new
console.log('\n=== Step 4: Navigating to /x-growth-engine/articles/new ===');
const beforeConsole = consoleMessages.length;
const beforeErrors = jsErrors.length;

const response2 = await page.goto(BASE_URL + 'articles/new', { waitUntil: 'networkidle', timeout: 30000 });
console.log(`Status: ${response2?.status()}`);
await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-articles-new.png'), fullPage: true });
console.log(`Title: ${await page.title()}`);
console.log(`URL: ${page.url()}`);

const bodyText2 = await page.innerText('body').catch(() => '(could not get body text)');
console.log(`\n=== Page text (first 500 chars) ===\n${bodyText2.slice(0, 500)}`);

// Step 5: New errors
console.log(`\n=== New console messages after /articles/new ===`);
for (const msg of consoleMessages.slice(beforeConsole)) {
  console.log(`  [${msg.type}] ${msg.text}`);
}
const newErrors = jsErrors.slice(beforeErrors);
if (newErrors.length) {
  console.log(`\n=== New JS Errors ===`);
  for (const err of newErrors) console.log(`  ERROR: ${err}`);
} else {
  console.log('  No new JS errors detected.');
}

// Final summary
console.log('\n' + '='.repeat(60));
console.log('FINAL SUMMARY');
console.log('='.repeat(60));
console.log(`Total console messages: ${consoleMessages.length}`);
console.log(`Total JS errors: ${jsErrors.length}`);
const errorMsgs = consoleMessages.filter(m => m.type === 'error');
const warningMsgs = consoleMessages.filter(m => m.type === 'warning');
console.log(`Console errors: ${errorMsgs.length}`);
console.log(`Console warnings: ${warningMsgs.length}`);
if (errorMsgs.length) {
  console.log('\nAll console errors:');
  for (const m of errorMsgs) console.log(`  ${m.text}`);
}
if (jsErrors.length) {
  console.log('\nAll JS exceptions:');
  for (const e of jsErrors) console.log(`  ${e}`);
}

console.log(`\nScreenshots saved to: ${SCREENSHOT_DIR}`);
await browser.close();
