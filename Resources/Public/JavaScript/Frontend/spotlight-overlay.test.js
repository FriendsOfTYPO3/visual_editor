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

// the target starts hidden below the visible area of the container, at the height of #below
const scrollContainerTargets = `
  <div id="container" style="height: 300px; overflow: auto;">
    <div style="height: 400px;"></div>
    <span class="target" id="inner">in a scroll container</span>
    <span id="other">not highlighted</span>
    <div style="height: 600px;"></div>
  </div>
  <div style="height: 100px;"></div>
  <span id="below">below the scroll container</span>
  <div style="height: 3000px;"></div>`;

const targetBelowTheFold = `
  <div style="height: 1000px;"></div>
  <span class="target" id="static">static</span>
  <span id="other">not highlighted</span>
  <div style="height: 3000px;"></div>`;

// html has no overflow, so the overflow of body applies to the viewport and the document scrolls
const bodyOverflowOfViewport = `
  <style>html, body {height: 100%;} body {overflow-x: hidden;}</style>
  ${targetBelowTheFold}`;

const bodyAsScrollContainer = `
  <style>html {overflow: hidden; height: 100%;} body {overflow: auto; height: 100%;}</style>
  ${targetBelowTheFold}`;

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
 * @param {string[]} ids
 * @returns {Promise<Record<string, string|null>>}
 */
async function getClickedElementIds(page, ids) {
  return page.evaluate(ids => Object.fromEntries(ids.map((id) => {
    const rect = document.getElementById(id).getBoundingClientRect();
    const element = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return [id, element?.id || null];
  })), ids);
}

test('spotlight keeps highlighted sticky and fixed elements clickable after scrolling', async () => {
  const page = await openPage(stickyAndFixedTargets);
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  await page.evaluate(() => window.scrollTo(0, 900));
  await waitForFrames(page);

  // the overlay blocks the element which is not highlighted
  assert.deepEqual(
    await getClickedElementIds(page, ['sticky', 'fixed', 'static', 'other']),
    {sticky: 'sticky', fixed: 'fixed', static: 'static', other: null},
  );
  await page.close();
});

test('spotlight keeps highlighted elements clickable after scrolling their scroll container', async () => {
  const page = await openPage(scrollContainerTargets);
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  await page.evaluate(() => document.getElementById('container').scrollTop = 300);
  await waitForFrames(page);

  assert.deepEqual(
    await getClickedElementIds(page, ['inner', 'other', 'below']),
    {inner: 'inner', other: null, below: null},
  );
  await page.close();
});

test('spotlight does not open holes outside the scroll container of a hidden target', async () => {
  const page = await openPage(scrollContainerTargets);
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  // #inner is scrolled out of its container, its hole would be over #below
  assert.deepEqual(await getClickedElementIds(page, ['below']), {below: null});
  await page.close();
});

test('spotlight keeps highlighted elements clickable when the overflow of body applies to the viewport', async () => {
  const page = await openPage(bodyOverflowOfViewport);
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  await page.evaluate(() => window.scrollTo(0, 900));
  await waitForFrames(page);

  assert.deepEqual(await getClickedElementIds(page, ['static', 'other']), {static: 'static', other: null});
  await page.close();
});

test('spotlight keeps highlighted elements clickable after scrolling body as scroll container', async () => {
  const page = await openPage(bodyAsScrollContainer);
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  await page.evaluate(() => document.body.scrollTop = 900);
  await waitForFrames(page);

  assert.deepEqual(await getClickedElementIds(page, ['static', 'other']), {static: 'static', other: null});
  await page.close();
});

test('spotlight does not measure the targets while scrolling static elements', async () => {
  const page = await openPage(staticTargets);
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  // the holes of static elements keep their document coordinates, so scrolling must not run any layout work
  await page.evaluate(() => {
    window.measurements = 0;
    const getBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      window.measurements++;
      return getBoundingClientRect.call(this);
    };
  });
  for (const y of [300, 600, 900]) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await waitForFrames(page);
  }

  assert.equal(await page.evaluate(() => window.measurements), 0);
  await page.close();
});

// the placeholder keeps the height of the header, so the document does not resize when the header becomes fixed
const headerFixedByScript = `
  <style>.is-fixed {position: fixed; top: 0; left: 0; right: 0;}</style>
  <div style="height: 60px;"><div id="header"><span class="target" id="sticky">in a header fixed by a script</span></div></div>
  <div style="height: 1000px;"></div>
  <span class="target" id="static">static</span>
  <span id="other">not highlighted</span>
  <div style="height: 3000px;"></div>`;

test('spotlight keeps a header clickable that a script makes fixed while scrolling', async () => {
  const page = await openPage(headerFixedByScript);
  await page.evaluate(() => {
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => header.classList.toggle('is-fixed', window.scrollY > 100));
  });
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  await page.evaluate(() => window.scrollTo(0, 900));
  await waitForFrames(page);

  assert.deepEqual(
    await getClickedElementIds(page, ['sticky', 'static', 'other']),
    {sticky: 'sticky', static: 'static', other: null},
  );
  await page.close();
});

// a script moves the section with the target while scrolling, e.g. for a parallax or reveal effect
const targetInMovedSection = `
  <style>.hidden-below {transform: translateY(150px);}</style>
  <div style="height: 1000px;"></div>
  <section id="section"><span class="target" id="moved">in a moved section</span><span id="other">not highlighted</span></section>
  <div style="height: 4000px;"></div>`;

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
async function scrollDownInSteps(page) {
  for (const y of [300, 600, 900]) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await waitForFrames(page);
  }
}

test('spotlight follows highlighted elements that a script moves by a style while scrolling', async () => {
  const page = await openPage(targetInMovedSection);
  await page.evaluate(() => {
    const section = document.getElementById('section');
    window.addEventListener('scroll', () => section.style.transform = `translateY(${window.scrollY / 4}px)`);
  });
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  await scrollDownInSteps(page);

  assert.deepEqual(await getClickedElementIds(page, ['moved', 'other']), {moved: 'moved', other: null});
  await page.close();
});

test('spotlight follows highlighted elements that a script moves by a class while scrolling', async () => {
  const page = await openPage(targetInMovedSection);
  await page.evaluate(() => {
    const section = document.getElementById('section');
    section.classList.add('hidden-below');
    window.addEventListener('scroll', () => section.classList.toggle('hidden-below', window.scrollY <= 300));
  });
  await page.evaluate(() => window.spotlight.highlight('.target'));
  await waitForFrames(page);

  await scrollDownInSteps(page);

  assert.deepEqual(await getClickedElementIds(page, ['moved', 'other']), {moved: 'moved', other: null});
  await page.close();
});
