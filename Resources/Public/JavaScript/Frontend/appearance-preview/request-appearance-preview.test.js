import test, {after, before} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

/**
 * Runs the preview in Chromium, because it parses the rendered page with the DOMParser.
 */

const importMap = {imports: {'@typo3/visual-editor/Frontend/appearance-preview/': '/appearance-preview/'}};

// the content element in the page took over the attributes of its only child, the response still has the child
const pageContentElement = id => `
  <ve-content-element id="${id}" scrollPositionId="tt_content:62" class="component component--bg-80"><p>text</p></ve-content-element>`;
const renderedContentElement = id => `
  <ve-content-element id="${id}" scrollPositionId="tt_content:62"><div class="component component--bg-10"><p>text</p></div></ve-content-element>`;

let browser;

before(async () => {
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

/**
 * @param {string} renderedId id of the content element in the response to the preview request
 * @returns {Promise<string>} the class of the content element in the page after the preview
 */
async function previewClassOf(renderedId) {
  const page = await browser.newPage();
  await page.route('http://preview.test/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/appearance-preview/')) {
      const name = url.pathname.replace('/appearance-preview/', './');
      const file = new URL(name.endsWith('.js') ? name : `${name}.js`, import.meta.url);
      return route.fulfill({contentType: 'text/javascript', body: await readFile(file, 'utf8')});
    }

    const html = route.request().method() === 'POST' ?
      renderedContentElement(renderedId)
      : `<script type="importmap">${JSON.stringify(importMap)}</script>${pageContentElement('tt_content:62')}`;
    return route.fulfill({contentType: 'text/html', body: html});
  });
  await page.goto('http://preview.test/');

  const className = await page.evaluate(async () => {
    const {requestAppearancePreview} = await import('@typo3/visual-editor/Frontend/appearance-preview/request-appearance-preview.js');
    const host = document.getElementById('tt_content:62');
    host.table = 'tt_content';
    host.uid = 62;
    requestAppearancePreview(host, {frame_class: 'bg-10'});
    await new Promise(resolve => setTimeout(resolve, 600));
    return host.className;
  });
  await page.close();
  return className;
}

test('preview takes over the classes of the content element with the same id', async () => {
  assert.equal(await previewClassOf('tt_content:62'), 'component component--bg-10');
});

test('preview finds the content element after a workspace version gave it a new id', async () => {
  assert.equal(await previewClassOf('tt_content:91'), 'component component--bg-10');
});
