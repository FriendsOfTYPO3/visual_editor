import test, {after, before} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

/**
 * Renders ve-editable-text in a real browser, because the custom element lifecycle
 * (attributeChangedCallback before connectedCallback) can not be reproduced without a DOM.
 */

const javaScriptRoot = fileURLToPath(new URL('../../', import.meta.url));
const nodeModulesRoot = fileURLToPath(new URL('../../../../../node_modules/', import.meta.url));

const importMap = {
  imports: {
    'lit': '/node_modules/lit/index.js',
    'lit/': '/node_modules/lit/',
    'lit-html': '/node_modules/lit-html/lit-html.js',
    'lit-html/': '/node_modules/lit-html/',
    'lit-element/': '/node_modules/lit-element/',
    '@lit/reactive-element': '/node_modules/@lit/reactive-element/reactive-element.js',
    '@lit/reactive-element/': '/node_modules/@lit/reactive-element/',
    '@typo3/core/lit-helper.js': '/lit-helper.js',
    '@typo3/visual-editor/': '/visual-editor/',
  },
};

const pageHtml = `<!doctype html>
<html lang="en">
<head>
  <script>window.veInfo = {languageId: 0, allowedOrigins: []};</script>
  <script type="importmap">${JSON.stringify(importMap)}</script>
</head>
<body></body>
</html>`;

// the labels are not part of the test, so lll() returns the label key
const litHelperSource = 'export const lll = (key) => key;';

let server;
let browser;
let baseUrl;

/**
 * @param {string} root
 * @param {string} path
 * @returns {Promise<string|null>}
 */
async function readFileBelow(root, path) {
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) {
    return null;
  }

  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

/**
 * @param {string} url
 * @returns {Promise<{type: string, body: string}|null>}
 */
async function resolveRequest(url) {
  const path = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  if (path === '/') {
    return {type: 'text/html', body: pageHtml};
  }
  if (path === '/lit-helper.js') {
    return {type: 'text/javascript', body: litHelperSource};
  }
  if (path.startsWith('/visual-editor/')) {
    // modules of this extension are imported without file extension
    const modulePath = path.slice('/visual-editor/'.length);
    const body = await readFileBelow(javaScriptRoot, extname(modulePath) === '' ? modulePath + '.js' : modulePath);
    return body === null ? null : {type: 'text/javascript', body};
  }
  if (path.startsWith('/node_modules/')) {
    const body = await readFileBelow(nodeModulesRoot, path.slice('/node_modules/'.length));
    return body === null ? null : {type: 'text/javascript', body};
  }

  return null;
}

before(async () => {
  server = createServer(async (request, response) => {
    const resource = await resolveRequest(request.url);
    if (resource === null) {
      response.writeHead(404);
      response.end();
      return;
    }

    response.writeHead(200, {'Content-Type': resource.type});
    response.end(resource.body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
});

/**
 * @param {string} id
 * @param {string} value
 * @param {Record<string, any>} validation
 * @returns {string}
 */
function editableText(id, value, validation) {
  return `<p><ve-editable-text id="${id}" table="tt_content" uid="1" field="${id}" name="${id}" value="${value}"`
    + ` validation='${JSON.stringify(validation)}'>${value}</ve-editable-text></p>`;
}

const requiredAndEmpty = editableText('required', '', {required: true, allowNewlines: false});
const requiredAndFilled = editableText('filled', 'Header', {required: true, allowNewlines: false});

/**
 * @returns {Promise<{page: import('playwright').Page, pageErrors: Error[]}>}
 */
async function openPage() {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error));
  await page.goto(baseUrl);
  return {page, pageErrors};
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
async function defineEditableText(page) {
  await page.evaluate(() => import('@typo3/visual-editor/Frontend/components/ve-editable-text'));
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<Array<{id: string, validationType: string, invalid: boolean, validationErrors: string[]}>>}
 */
async function getEditableTextStates(page) {
  return page.evaluate(async () => {
    const elements = [...document.querySelectorAll('ve-editable-text')];
    await Promise.all(elements.map(element => element.updateComplete));
    return elements.map(element => ({
      id: element.id,
      validationType: typeof element.validation,
      invalid: element.invalid,
      validationErrors: element.validationErrors,
    }));
  });
}

const expectedStates = [
  {id: 'required', validationType: 'object', invalid: true, validationErrors: ['validation.required']},
  {id: 'filled', validationType: 'object', invalid: false, validationErrors: []},
];

test('ve-editable-text parses the validation attribute of upgraded elements', async () => {
  const {page, pageErrors} = await openPage();
  // the elements exist before the module is loaded, like in the frontend of TYPO3
  await page.evaluate(html => document.body.innerHTML = html, requiredAndEmpty + requiredAndFilled);
  await defineEditableText(page);

  assert.deepEqual(await getEditableTextStates(page), expectedStates);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('ve-editable-text parses the validation attribute of elements inserted after the definition', async () => {
  const {page, pageErrors} = await openPage();
  await defineEditableText(page);
  await page.evaluate(html => document.body.innerHTML = html, requiredAndEmpty + requiredAndFilled);

  assert.deepEqual(await getEditableTextStates(page), expectedStates);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('ve-editable-text parses the validation attribute of elements created with createElement', async () => {
  const {page, pageErrors} = await openPage();
  await defineEditableText(page);
  await page.evaluate(() => {
    for (const [id, value] of [['required', ''], ['filled', 'Header']]) {
      const element = document.createElement('ve-editable-text');
      element.id = id;
      element.setAttribute('table', 'tt_content');
      element.setAttribute('uid', '1');
      element.setAttribute('field', id);
      element.setAttribute('value', value);
      element.setAttribute('validation', JSON.stringify({required: true, allowNewlines: false}));
      const paragraph = document.createElement('p');
      paragraph.append(element);
      document.body.append(paragraph);
    }
  });

  assert.deepEqual(await getEditableTextStates(page), expectedStates);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<Record<string, any>>}
 */
async function getStoredData(page) {
  return page.evaluate(async () => {
    const {dataHandlerStore} = await import('@typo3/visual-editor/Frontend/stores/data-handler-store');
    return dataHandlerStore.data;
  });
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<Record<string, string>>}
 */
async function getSlotTexts(page) {
  return page.evaluate(() => Object.fromEntries(
    [...document.querySelectorAll('ve-editable-text')].map(element => [element.id, element.shadowRoot.querySelector('.slot').innerText]),
  ));
}

// values which violate the TCA, e.g. because the TCA became stricter after they were saved
const legacyValues = editableText('trim', ' Foo ', {eval: ['trim']})
  + editableText('min', 'ab', {min: 3})
  + editableText('upper', 'abc', {eval: ['upper']})
  + editableText('max', 'abcdefgh', {max: 5});

test('ve-editable-text keeps untouched values when the field loses focus', async () => {
  const {page, pageErrors} = await openPage();
  await page.evaluate(html => document.body.innerHTML = html, legacyValues);
  await defineEditableText(page);
  await getEditableTextStates(page);

  for (const id of ['trim', 'min', 'upper', 'max']) {
    await page.locator(`#${id} .slot`).focus();
    await page.locator(`#${id} .slot`).blur();
  }

  assert.deepEqual(await getStoredData(page), {});
  assert.deepEqual(await getSlotTexts(page), {trim: ' Foo ', min: 'ab', upper: 'abc', max: 'abcdefgh'});
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('ve-editable-text normalizes changed values when the field loses focus', async () => {
  const {page, pageErrors} = await openPage();
  await page.evaluate(html => document.body.innerHTML = html, legacyValues);
  await defineEditableText(page);
  await getEditableTextStates(page);

  await page.locator('#upper .slot').selectText();
  await page.keyboard.type('new');
  await page.locator('#upper .slot').blur();

  assert.deepEqual(await getStoredData(page), {tt_content: {1: {upper: 'NEW'}}});
  assert.equal((await getSlotTexts(page)).upper, 'NEW');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
async function renderMovableLegacyValues(page) {
  await page.evaluate(html => document.body.innerHTML = `<div id="source">${html}</div><div id="target"></div>`, legacyValues);
  await defineEditableText(page);
  await getEditableTextStates(page);
}

/**
 * Moving a content element (drag and drop) disconnects and reconnects the editable texts inside.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
async function moveEditableTexts(page) {
  await page.evaluate(() => {
    const target = document.getElementById('target');
    for (const paragraph of [...document.getElementById('source').children]) {
      target.insertBefore(paragraph, null);
    }
  });
}

test('ve-editable-text keeps untouched values when the element is moved in the DOM', async () => {
  const {page, pageErrors} = await openPage();
  await renderMovableLegacyValues(page);

  await moveEditableTexts(page);
  const states = await getEditableTextStates(page);

  assert.deepEqual(await getStoredData(page), {});
  assert.deepEqual(await getSlotTexts(page), {trim: ' Foo ', min: 'ab', upper: 'abc', max: 'abcdefgh'});
  assert.deepEqual(states.map(state => state.validationType), ['object', 'object', 'object', 'object']);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('ve-editable-text keeps unsaved changes when the element is moved in the DOM', async () => {
  const {page, pageErrors} = await openPage();
  await renderMovableLegacyValues(page);

  await page.locator('#upper .slot').selectText();
  await page.keyboard.type('new');
  await page.locator('#upper .slot').blur();
  await moveEditableTexts(page);
  await getEditableTextStates(page);

  assert.deepEqual(await getStoredData(page), {tt_content: {1: {upper: 'NEW'}}});
  assert.deepEqual(await getSlotTexts(page), {trim: ' Foo ', min: 'ab', upper: 'NEW', max: 'abcdefgh'});
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('ve-editable-text resets to the initial value after the element is moved in the DOM', async () => {
  const {page, pageErrors} = await openPage();
  await renderMovableLegacyValues(page);

  await page.locator('#upper .slot').selectText();
  await page.keyboard.type('new');
  await page.locator('#upper .slot').blur();
  await moveEditableTexts(page);
  await getEditableTextStates(page);
  // ve-reset-button is not defined on this page, so it has no size to click on
  await page.evaluate(() => document.getElementById('upper').shadowRoot.querySelector('ve-reset-button').click());
  await getEditableTextStates(page);

  assert.deepEqual(await getStoredData(page), {});
  assert.deepEqual(await getSlotTexts(page), {trim: ' Foo ', min: 'ab', upper: 'abc', max: 'abcdefgh'});
  assert.deepEqual(pageErrors, []);
  await page.close();
});
