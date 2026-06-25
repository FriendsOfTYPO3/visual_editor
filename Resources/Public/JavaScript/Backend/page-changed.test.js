import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@typo3/visual-editor/Backend/reload-all-child-frames') {
      return {
        shortCircuit: true,
        url: `data:text/javascript,${encodeURIComponent('export function reloadAllChildFrames() {}')}`,
      };
    }
    return nextResolve(specifier, context);
  },
});

const {pageChanged, updateUrlOfWindow} = await import('./page-changed.js');

function createWindow(url) {
  const pushedStates = [];

  return {
    location: {
      href: url,
    },
    history: {
      pushState(state, title, url) {
        pushedStates.push({state, title, url: url.toString()});
      },
    },
    pushedStates,
  };
}

function installDocument(languageIds) {
  const refreshAction = {
    parentNode: {
      href: '',
    },
  };

  globalThis.document = {
    querySelector(selector) {
      if (selector === '[data-identifier="actions-refresh"]') {
        return refreshAction;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (['.js-visual-editor-language', 'iframe'].includes(selector)) {
        return languageIds.map(languageId => ({
          dataset: {
            languageId: languageId.toString(),
          },
        }));
      }
      return [];
    },
  };

  return refreshAction;
}

function installModuleStateStorage() {
  const updates = [];

  globalThis.ModuleStateStorage = {
    update(moduleName, pageId) {
      updates.push({moduleName, pageId});
    },
  };

  return updates;
}

test('replaces a single existing language with the passed language id', () => {
  installDocument([1]);
  const windowObject = createWindow('https://example.test/typo3/module/web/edit?id=12&languages[0]=1');

  const newUrl = updateUrlOfWindow(windowObject, 34, 2, {});

  assert.equal(newUrl.searchParams.get('id'), '34');
  assert.equal(newUrl.searchParams.get('viewMode'), null);
  assert.equal(newUrl.searchParams.get('languages[0]'), '2');
  assert.equal(windowObject.pushedStates[0].url, newUrl.toString());
});

test('keeps existing languages and adds the passed language when the current url has multiple languages', () => {
  installDocument([0, 2]);
  const windowObject = createWindow('https://example.test/typo3/module/web/edit?id=12&languages[0]=0&languages[1]=2');

  const newUrl = updateUrlOfWindow(windowObject, 34, 1, {});

  assert.equal(newUrl.searchParams.get('id'), '34');
  assert.equal(newUrl.searchParams.get('viewMode'), '2');
  assert.equal(newUrl.searchParams.get('languages[0]'), '0');
  assert.equal(newUrl.searchParams.get('languages[1]'), '1');
  assert.equal(newUrl.searchParams.get('languages[2]'), '2');
});

test('keeps existing languages unchanged when the passed language is already selected', () => {
  installDocument([0, 1]);
  const windowObject = createWindow('https://example.test/typo3/module/web/edit?id=12&languages[0]=0&languages[1]=1');

  const newUrl = updateUrlOfWindow(windowObject, 34, 1, {});

  assert.equal(newUrl.searchParams.get('id'), '34');
  assert.equal(newUrl.searchParams.get('viewMode'), '2');
  assert.equal(newUrl.searchParams.get('languages[0]'), '0');
  assert.equal(newUrl.searchParams.get('languages[1]'), '1');
  assert.equal(newUrl.searchParams.get('languages[2]'), null);
});

test('adds the default language when it is missing from multiple current languages', () => {
  installDocument([1, 2]);
  const windowObject = createWindow('https://example.test/typo3/module/web/edit?id=12&languages[0]=1&languages[1]=2');

  const newUrl = updateUrlOfWindow(windowObject, 34, 0, {});

  assert.equal(newUrl.searchParams.get('id'), '34');
  assert.equal(newUrl.searchParams.get('viewMode'), '2');
  assert.equal(newUrl.searchParams.get('languages[0]'), '0');
  assert.equal(newUrl.searchParams.get('languages[1]'), '1');
  assert.equal(newUrl.searchParams.get('languages[2]'), '2');
});

test('replaces existing params with route argument params', () => {
  installDocument([0]);
  const windowObject = createWindow('https://example.test/typo3/module/web/edit?id=12&params[old]=removed');

  const newUrl = updateUrlOfWindow(windowObject, 34, 0, {
    'params[new]': 'kept',
    'ignored': 'ignored',
  });

  assert.equal(newUrl.searchParams.get('id'), '34');
  assert.equal(newUrl.searchParams.get('params[old]'), null);
  assert.equal(newUrl.searchParams.get('params[new]'), 'kept');
  assert.equal(newUrl.searchParams.get('ignored'), null);
});

test('keeps unrelated query parameters', () => {
  installDocument([0]);
  const windowObject = createWindow('https://example.test/typo3/module/web/edit?token=abc&id=12&returnUrl=/backend');

  const newUrl = updateUrlOfWindow(windowObject, 34, 0, {});

  assert.equal(newUrl.searchParams.get('id'), '34');
  assert.equal(newUrl.searchParams.get('token'), 'abc');
  assert.equal(newUrl.searchParams.get('returnUrl'), '/backend');
});

test('does not update the module state when url and language did not change', () => {
  installDocument([1]);
  const moduleStateUpdates = installModuleStateStorage();
  const refreshAction = document.querySelector('[data-identifier="actions-refresh"]');
  const url = 'https://example.test/typo3/module/web/edit?id=34&languages%5B0%5D=1';
  globalThis.window = createWindow(url);
  window.top = createWindow(url);

  pageChanged(34, 1, {}, 1);

  assert.equal(refreshAction.parentNode.href, '');
  assert.deepEqual(moduleStateUpdates, []);
  assert.equal(window.top.pushedStates.length, 0);
});

test('updates the module state when url did not change but language changed', () => {
  installDocument([1]);
  const moduleStateUpdates = installModuleStateStorage();
  const refreshAction = document.querySelector('[data-identifier="actions-refresh"]');
  const url = 'https://example.test/typo3/module/web/edit?id=34&languages%5B0%5D=1';
  globalThis.window = createWindow(url);
  window.top = createWindow(url);
  globalThis.fetch = () => new Promise(() => {});

  pageChanged(34, 1, {}, 0);

  assert.equal(refreshAction.parentNode.href, url);
  assert.deepEqual(moduleStateUpdates, [{moduleName: 'web', pageId: 34}]);
  assert.equal(window.top.pushedStates[0].url, url);
});
