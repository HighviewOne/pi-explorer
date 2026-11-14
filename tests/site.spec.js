// Browser tests for Pi Explorer. Run with `npm test` (see playwright.config.js).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* ── helpers ── */

/* First n digits of π after the decimal point, computed independently with
   Machin's formula (π = 16·arctan(1/5) − 4·arctan(1/239)) */
function machinDigits(n) {
  const unity = 10n ** BigInt(n + 20);
  const arccot = (x) => {
    let sum = unity / x, term = sum, k = 3n, sign = -1n;
    const x2 = x * x;
    while (term) { term /= x2; sum += sign * (term / k); sign = -sign; k += 2n; }
    return sum;
  };
  const pi = 4n * (4n * arccot(5n) - arccot(239n));
  return pi.toString().slice(1, n + 1);
}
const DIGITS = machinDigits(1000);
const wrongDigit = (d) => String((Number(d) + 1) % 10);

/* Fail the test on any uncaught page error */
function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/* Scroll the game into view and wait for the page to notice (digit keys are
   only captured while the game is on screen) */
async function toGame(page) {
  await page.locator('#piDisplayArea').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
}

async function type(page, digits) {
  for (const d of digits) await page.keyboard.press(d);
}

/* ── content and deploy ── */

test('the game uses the true first 1,000 digits of π', async ({ page }) => {
  await page.goto('./');
  const siteDigits = await page.evaluate(() => PI_DIGITS);
  expect(siteDigits).toHaveLength(1000);
  expect(siteDigits).toBe(DIGITS);
  expect(siteDigits.indexOf('999999')).toBe(761);  /* Feynman Point: digits 762–767 */
});

test('the deploy workflow publishes every file the site needs', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/static.yml'), 'utf8');
  const cpLine = workflow.match(/cp ([\s\S]*?) _site\//);
  expect(cpLine, 'cp ... _site/ line in static.yml').not.toBeNull();
  const published = new Set(cpLine[1].replace(/\\\n/g, ' ').split(/\s+/).filter(Boolean));

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));

  const needed = new Set();
  for (const [, ref] of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
    if (!/^(https?:|mailto:|data:)/.test(ref)) needed.add(ref);
  }
  for (const [, f] of sw.match(/SITE_FILES = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)) {
    if (f !== './') needed.add(f);
  }
  for (const icon of manifest.icons) needed.add(icon.src);
  needed.add('sw.js');

  for (const f of needed) {
    expect(published.has(f), `${f} is missing from the cp line in static.yml`).toBe(true);
    expect(fs.existsSync(path.join(ROOT, f)), `${f} does not exist`).toBe(true);
  }
});

test('page loads cleanly: skip link, headings, no errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await expect(page.locator('main#main')).toHaveCount(1);
  await expect(page.locator('.egypt-card h4')).toHaveText([
    'The Rope Stretchers', 'The Great Pyramid of Giza', 'The Rhind Mathematical Papyrus',
  ]);
  await expect(page.locator('.ref-group')).toHaveCount(200);
  expect(errors).toEqual([]);
});

test('no sideways scrolling on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.click('#modePractice');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

/* ── Challenge ── */

test('challenge: a wrong digit ends the run and saves the personal best', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./');
  await toGame(page);
  await type(page, DIGITS.slice(0, 20));
  await expect(page.locator('#currentScore')).toHaveText('20');
  await page.keyboard.press(wrongDigit(DIGITS[20]));
  await expect(page.locator('#gameStatus')).toHaveText('Game Over');
  await expect(page.locator('#gameMsg')).toContainText('You reached digit 20');
  await expect(page.locator('#gameMsg .wrong-digit-reveal')).toHaveText(DIGITS[20]);
  await expect(page.locator('#gameMsg')).toContainText('new personal best');

  await page.reload();
  await expect(page.locator('#personalBest')).toHaveText('20');
  await expect(page.locator('#bestDate')).toContainText('set ');
  await expect(page.locator('#peekBtn')).toBeHidden();
  expect(errors).toEqual([]);
});

test('challenge: the Feynman Point milestone appears at digit 767', async ({ page }) => {
  await page.goto('./');
  await toGame(page);
  await type(page, DIGITS.slice(0, 767));
  await expect(page.locator('#milestoneMsg')).toContainText('Feynman Point');
});

/* ── Practice, red groups and drill ── */

test('practice: slips continue the run and red groups survive a reload', async ({ page }) => {
  await page.goto('./');
  await toGame(page);
  await page.click('#modePractice');
  await expect(page.locator('#drillBtn')).toBeHidden();

  const seq = DIGITS.slice(0, 20).split('');
  seq[2] = wrongDigit(seq[2]);   /* slip in group 1 (digits 1–5) */
  seq[13] = wrongDigit(seq[13]); /* slip in group 3 (digits 11–15) */
  await type(page, seq);
  await expect(page.locator('#gameStatus')).toHaveText('Practising');
  await expect(page.locator('#currentScore')).toHaveText('18');
  await expect(page.locator('#personalBest')).toHaveText('2');
  await expect(page.locator('#drillBtn')).toHaveText('Drill my red groups (2)');

  await page.reload();
  await page.click('#modePractice');
  await expect(page.locator('.ref-group.missed')).toHaveText([DIGITS.slice(0, 5), DIGITS.slice(10, 15)]);
});

test('practice: can start part-way through', async ({ page }) => {
  await page.goto('./');
  await toGame(page);
  await page.click('#modePractice');
  await page.selectOption('#startSelect', '750');
  await page.click('#startBtn');
  await type(page, DIGITS.slice(750, 770));
  await expect(page.locator('#currentScore')).toHaveText('20');
  await expect(page.locator('#milestoneMsg')).toContainText('Feynman Point');
});

test('drill: repeats a group until it is perfect, then clears it', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('piExplorerMissed', '[0,2]'));
  await page.reload();
  await toGame(page);
  await page.click('#modePractice');
  await page.click('#drillBtn');
  await expect(page.locator('#scoreLabel')).toHaveText(/groups left/i);
  await expect(page.locator('#currentScore')).toHaveText('2');
  await expect(page.locator('#digitHint')).toContainText('digits 1–5');

  const g = DIGITS.slice(0, 5).split('');
  g[1] = wrongDigit(g[1]);
  await type(page, g);
  await expect(page.locator('#digitHint')).toContainText('come round again');
  await page.keyboard.press('5'); /* during the pause: ignored */
  await expect(page.locator('#digitHint')).toContainText('digits 11–15');

  await type(page, DIGITS.slice(10, 15));
  await expect(page.locator('#digitHint')).toContainText('cleared');
  await expect(page.locator('#digitHint')).toContainText('digits 1–5');
  await type(page, DIGITS.slice(0, 5));

  await expect(page.locator('#gameMsg')).toContainText('All red groups cleared');
  await expect(page.locator('#drillBtn')).toBeHidden();
  await expect(page.locator('.ref-group.missed')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('piExplorerMissed'))).toBe('[]');
});

test('drill: Stop Drill returns to practice', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('piExplorerMissed', '[4]'));
  await page.reload();
  await toGame(page);
  await page.click('#modePractice');
  await page.click('#drillBtn');
  await page.click('#startBtn');
  await expect(page.locator('#gameStatus')).toHaveText('Ready');
  await expect(page.locator('#scoreLabel')).toHaveText(/correct/i);
  await expect(page.locator('#drillBtn')).toBeVisible();
});

/* ── Peek ── */

test('peek: reveals the next digit, which then counts as help', async ({ page }) => {
  await page.goto('./');
  await toGame(page);
  await page.click('#modePractice');
  await page.click('#startBtn');
  await expect(page.locator('#peekBtn')).toBeVisible();

  await type(page, DIGITS.slice(0, 6));
  await page.keyboard.press('p');
  await expect(page.locator('#peekDigit')).toHaveText(DIGITS[6]);
  await expect(page.locator('#bestDate')).toHaveText('1 peek');
  await page.keyboard.press(DIGITS[6]);
  await expect(page.locator('#peekDigit')).toHaveText('');
  await expect(page.locator('#typedDigits .digit-peeked')).toHaveText(DIGITS[6]);
  await expect(page.locator('#currentScore')).toHaveText('6'); /* the peeked digit isn't counted */

  await page.click('#peekBtn');                                  /* button works too */
  await expect(page.locator('#peekDigit')).toHaveText(DIGITS[7]);
  await expect(page.locator('#bestDate')).toHaveText('2 peeks');
  await page.keyboard.press(DIGITS[7]);

  await expect(page.locator('.ref-group').nth(1)).toHaveClass(/missed/);
  await expect(page.locator('#drillBtn')).toHaveText('Drill my red groups (1)');
});

test('peek: a peeked drill group comes round again', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('piExplorerMissed', '[0]'));
  await page.reload();
  await toGame(page);
  await page.click('#modePractice');
  await page.click('#drillBtn');
  await type(page, DIGITS.slice(0, 2));
  await page.keyboard.press('p');
  await type(page, DIGITS.slice(2, 5));
  await expect(page.locator('#digitHint')).toContainText('come round again');
  await expect(page.locator('#digitHint')).toContainText('digits 1–5');
});

/* ── Streak ── */

test('streak: starts at day 1, extends from yesterday, resets after a gap', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#streak')).toBeHidden();
  await toGame(page);
  await page.keyboard.press(DIGITS[0]);
  await expect(page.locator('#streak')).toContainText('Day 1');

  const iso = (offset) => page.evaluate((o) => localISO(o), offset);

  /* played yesterday, 4 days in a row → nudge, then 5 after playing today */
  const yesterday = await iso(-1);
  await page.evaluate((y) => localStorage.setItem('piExplorerStreak', JSON.stringify({ last: y, count: 4 })), yesterday);
  await page.reload();
  await expect(page.locator('#streak')).toHaveText('🔥 4-day streak — play today to keep it going!');
  await toGame(page);
  await page.keyboard.press(DIGITS[0]);
  await expect(page.locator('#streak')).toHaveText('🔥 5-day streak');
  await expect(page.locator('#milestoneMsg')).toContainText('5 days in a row');

  /* last played three days ago → streak starts over */
  const old = await iso(-3);
  await page.evaluate((d) => localStorage.setItem('piExplorerStreak', JSON.stringify({ last: d, count: 9 })), old);
  await page.reload();
  await expect(page.locator('#streak')).toBeHidden();
  await toGame(page);
  await page.keyboard.press(DIGITS[0]);
  await expect(page.locator('#streak')).toContainText('Day 1');
});

/* ── Archimedes ── */

test('Archimedes slider traps π between the polygons', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#archLower')).toHaveText('3.00000');
  await expect(page.locator('#archUpper')).toHaveText('3.46410');
  await page.click('.arch-steps button[data-sides="96"]');
  await expect(page.locator('#archSidesOut')).toHaveText('96');
  await expect(page.locator('#archLower')).toHaveText('3.14103');
  await expect(page.locator('#archUpper')).toHaveText('3.14271');
  await expect(page.locator('#archInner')).toHaveAttribute('points', /^(\S+ ){95}\S+$/);
});

/* ── Navigation ── */

test('mobile menu ignores small scrolls but closes on a real one', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.evaluate(() => window.scrollTo(0, 1000));
  const nav = page.locator('#navbar');
  await page.click('#hamburgerBtn');
  await expect(nav).toHaveClass(/open/);
  await page.evaluate(() => window.scrollBy(0, 30));
  await page.waitForTimeout(100);
  await expect(nav).toHaveClass(/open/);
  await page.evaluate(() => window.scrollBy(0, 80));
  await expect(nav).not.toHaveClass(/open/);
  await expect(page.locator('#hamburgerBtn')).toHaveAttribute('aria-expanded', 'false');
});

/* ── Motion and offline ── */

test('confetti is skipped when reduced motion is on', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await toGame(page);
  await type(page, DIGITS.slice(0, 10));
  await expect(page.locator('#milestoneMsg')).toContainText('10 digits');
  await expect(page.locator('.confetti-canvas')).toHaveCount(0);
});

test('works offline after one visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();               /* now controlled by the service worker */
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle(/Pi Explorer/);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(9, 4, 1)');
  await toGame(page);
  await type(page, DIGITS.slice(0, 5));
  await expect(page.locator('#currentScore')).toHaveText('5');
});
