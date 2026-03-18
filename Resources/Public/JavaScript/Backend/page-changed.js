/**
 * @param pageId {number}
 * @param languageId {number}
 * @param routeArguments {Record<string, string>}
 */
export function pageChanged(pageId, languageId, routeArguments) {
  pageId = parseInt(pageId, 10);
  languageId = parseInt(languageId, 10);

  if (isNaN(pageId) || pageId <= 0) {
    console.error('pageChanged: invalid pageId', pageId);
    return;
  }

  if (isNaN(languageId) || languageId < 0) {
    languageId = 0;
  }

  const newUrl = updateUrlOfWindow(window, pageId, languageId, routeArguments);

  newUrl.searchParams.set('languages[0]', languageId);
  loadModuleDocHeader(newUrl);

  // set href of refresh button to new URL
  document.querySelector('[data-identifier="actions-refresh"]').parentNode.href = newUrl.toString();

  updateUrlOfWindow(window.top, pageId, languageId, routeArguments);

  ModuleStateStorage.update('web', pageId);
}

/**
 * @param windowObject {Window}
 * @param pageId {number}
 * @param languageId {number}
 * @param routeArguments {Record<string, string>}
 * @return {module:url.URL}
 */
function updateUrlOfWindow(windowObject, pageId, languageId, routeArguments) {
  const newUrl = new URL(windowObject.location.href);
  for (const param of newUrl.searchParams.keys()) {
    if (param.startsWith('id') || param.startsWith('languages[') || param.startsWith('params[')) {
      newUrl.searchParams.delete(param);
    }
  }
  newUrl.searchParams.set('id', pageId);
  if (languageId) {
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
async function loadModuleDocHeader(newUrl) {
  abortController.abort();
  abortController = new AbortController();
  let response;
  try {
    response = await fetch(newUrl, {
      signal: abortController.signal,
      headers: {
        'X-NoToken': '1',
      },
    });
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
  const doc = parser.parseFromString(html, 'text/html');
  const newDocHeaders = doc.querySelectorAll('.module-docheader');
  if (!newDocHeaders.length) {
    console.error('No doc header found. in: ', html);
    return;
  }

  const currentDocHeaderBars = document.querySelectorAll('.module-docheader');
  newDocHeaders.forEach((newBar, index) => {
    const currentBar = currentDocHeaderBars[index];
    if (currentBar) {
      currentBar.replaceWith(newBar);
    }
  });

  // force reinitialization the clear cache JS, as it only checks for the .t3js-clear-page-cache class once
  import('@typo3/backend/clear-cache.js#' + Date.now());
}
