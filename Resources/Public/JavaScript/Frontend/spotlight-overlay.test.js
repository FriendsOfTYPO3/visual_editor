import test, {after, before} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

/**
 * Runs the spotlight overlay in Chromium, because its holes depend on layout and scrolling.
 */

const moduleSource = await readFile(new URL('./spotlight-overlay.js', import.meta.url), 'utf8');

const stickyAndFixedTargets = `
  <header><span class="target" id="sticky">in a sticky header</span></header>
  <span class="target" id="fixed" style="position: fixed; right: 0; bottom: 0;">fixed</span>
  <div style="height: 1000px;"></div>
  <span class="target" id="static">static</span>
  <span id="other">not highlighted</span>
  <div style="height: 3000px;"></div>`;

const staticTargets = `
  <span class="target">static</span>
  <div style="height: 1000px;"></div>
  <span class="target">static</span>
  <div style="height: 3000px;"></div>`;

/**
 * @param {string} body
 * @returns {string}
 */
function pageHtml(body) {
  return `<!doctype html>
<html lang="en">
<head>
  <style>
    body {margin: 0;}
    header {position: sticky; top: 0; height: 60px; background: #ddd;}
    span {display: inline-block; width: 200px; height: 40px;}
  </style>
</head>
<body>${body}</body>
</html>`;
}

let browser;

before(async () => {
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

/**
 * @param {string} body
 * @returns {Promise<import('playwright').Page>}
 */
async function openPage(body) {
  const page = await browser.newPage({viewport: {width: 800, height: 600}});
  await page.route('http://spotlight.test/**', (route) => {
    if (new URL(route.request().url()).pathname === '/spotlight-overlay.js') {
      return route.fulfill({contentType: 'text/javascript', body: moduleSource});
    }
    return route.fulfill({contentType: 'text/html', body: pageHtml(body)});
  });
  await page.goto('http://spotlight.test/');
  await page.evaluate(async () => {
    window.spotlight = await import('/spotlight-overlay.js');
  });
  return page;
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
async function waitForFrames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

/**
 * Returns the id of the element that receives a click in the center of each element.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<Record<string, string|null>>}
 */
async function getClickedElementIds(page) {
  return page.evaluate(() => Object.fromEntries(['sticky', 'fixed', 'static', 'other'].map((id) => {
    const rect = document.getElementById(id).getBoundingClientRect();
    const element = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return [id, element?.id || null];
  })));
}

test('spotlight keeps highlighted sticky and fixed elements clickable after scrolling', async () => {
  const page = await openPage(stickyAndFixedTargets);
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  await page.evaluate(() => window.scrollTo(0, 900));
  await waitForFrames(page);

  // the overlay blocks the element which is not highlighted
  assert.deepEqual(await getClickedElementIds(page), {sticky: 'sticky', fixed: 'fixed', static: 'static', other: null});
  await page.close();
});

test('spotlight does not rewrite the overlay while scrolling static elements', async () => {
  const page = await openPage(staticTargets);
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  await page.evaluate(() => {
    window.pathChanges = 0;
    new MutationObserver(records => window.pathChanges += records.length)
      .observe(document.querySelector('.spotlight-overlay-path'), {attributes: true, attributeFilter: ['d']});
  });
  for (const y of [300, 600, 900]) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await waitForFrames(page);
  }

  assert.equal(await page.evaluate(() => window.pathChanges), 0);
  await page.close();
});
