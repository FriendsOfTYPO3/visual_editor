/**
 * @param pageId {number}
 * @param languageId {number}
 * @param routeArguments {Record<string, string>}
 * @param fromLanguageId {number}
 */
export function pageChanged(pageId, languageId, routeArguments, fromLanguageId) {
  pageId = parseInt(pageId, 10);
  languageId = parseInt(languageId, 10);
  fromLanguageId = parseInt(fromLanguageId, 10);
  if (isNaN(pageId) || pageId <= 0) {
    console.error('pageChanged: invalid pageId', pageId);
    return;
  }

  if (isNaN(languageId) || languageId < 0) {
    languageId = 0;
  }

  const oldUrl = window.location.href;
  const newUrl = updateUrlOfWindow(window, pageId, languageId, routeArguments);
  if (oldUrl === newUrl.href && languageId === fromLanguageId) {
    return;
  }

  // set href of refresh button to new URL
  document.querySelector('[data-identifier="actions-refresh"]').parentNode.href = newUrl.toString();

  updateUrlOfWindow(window.top, pageId, languageId, routeArguments);

  ModuleStateStorage.update('web', pageId);

  updateModuleState(newUrl);

  // reload all other iframes.
  // reloadAllChildFrames(fromLanguageId); // TODO prevent infinite reload loop
}

/**
 * @param windowObject {Window}
 * @param pageId {number}
 * @param languageId {number}
 * @param routeArguments {Record<string, string>}
 * @return {URL}
 */
export function updateUrlOfWindow(windowObject, pageId, languageId, routeArguments) {
  const newUrl = new URL(windowObject.location.href);
  const currentLanguages = [...document.querySelectorAll('.js-visual-editor-language')].map(languageElement => parseInt(languageElement.dataset.languageId, 10));
  for (const param of [...newUrl.searchParams.keys()]) {
    if (['id', 'viewMode'].includes(param) || param.startsWith('languages[') || param.startsWith('params[')) {
      newUrl.searchParams.delete(param);
    }
  }
  newUrl.searchParams.set('id', pageId);

  if (currentLanguages.length > 1) {
    newUrl.searchParams.set('viewMode', '2'); // force multilanguage
    if (!currentLanguages.includes(parseInt(languageId, 10))) {
      currentLanguages.push(parseInt(languageId, 10));
    }
    currentLanguages
      .sort()
      .forEach((value, index) => newUrl.searchParams.append(`languages[${index}]`, value));
  } else {
    newUrl.searchParams.set('languages[0]', languageId);
  }

  for (const [key, value] of Object.entries(routeArguments)) {
    if (key.startsWith('params[')) {
      newUrl.searchParams.append(key, value);
    }
  }

  windowObject.history.pushState(null, '', newUrl);
  return newUrl;
}

let abortController = new AbortController();

/**
 * @param newUrl {URL}
 */
async function updateModuleState(newUrl) {
  abortController.abort();
  abortController = new AbortController();
  let response;
  try {
    response = await fetch(newUrl, {signal: abortController.signal});
    if (!response.ok) {
      console.error('No doc header found.');
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      // this is expected when a new request is made before the previous one finished, so we can silently ignore it
      return;
    }
    console.error(e);
    return;
  }

  const html = await response.text();
  const parser = new DOMParser();
  const newStateDocument = parser.parseFromString(html, 'text/html');
  if (newStateDocument.querySelectorAll('iframe').length
    !== document.querySelectorAll('iframe').length
  ) {
    // iframe count mismatch, either we got a new langauge or some were removed.
    // force reload without cache (true only works in firefox):
    window.location.reload(true);
    return;
  }
  if (document.querySelectorAll('iframe').length > 1) {
    // only compare iframe language if in multilanguage mode, otherwise the iframe is always the same and we don't need to reload it
    newStateDocument.querySelectorAll('iframe').forEach((iframe) => {
      const newUrl = iframe.src;
      const languageId = iframe.dataset.languageId;
      /** @type {HTMLIFrameElement} */
      const currentIframe = document.querySelector(`iframe[data-language-id="${languageId}"]`);

      const currentUrl = currentIframe.contentWindow.location.href;
      if (newUrl !== currentUrl) {
        currentIframe.src = newUrl + (currentIframe.contentWindow.location.hash ? ('#' + currentIframe.contentWindow.location.hash) : '');
      }
    });
  }

  const replaceable = newStateDocument.querySelectorAll('.module-docheader, .js-replaceable');
  if (!replaceable.length) {
    console.error('No doc header found. in: ', html);
    return;
  }

  const currentReplaceable = document.querySelectorAll('.module-docheader, .js-replaceable');
  replaceable.forEach((newReplaceableElement, index) => {
    const currentReplaceableElement = currentReplaceable[index];
    if (currentReplaceableElement) {
      currentReplaceableElement.replaceWith(newReplaceableElement);
    }
  });

  // force reinitialization the clear cache JS, as it only checks for the .t3js-clear-page-cache class once
  import('@typo3/backend/clear-cache.js#' + Date.now());
}
