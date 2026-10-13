import {patchClasses} from '@typo3/visual-editor/Frontend/appearance-preview/patch-classes';

const DEBOUNCE_DELAY = 150; // ms

/** @type {WeakMap<HTMLElement, {timer: number|undefined, controller: AbortController|undefined}>} */
const pending = new WeakMap();

/**
 * Renders the page again with the unsaved values of a content element and takes over the new classes.
 * The values are only sent to the server to render the preview, they are not saved.
 *
 * @param {HTMLElement} host the ve-content-element
 * @param {Record<string, string>} values field name to unsaved value
 */
export function requestAppearancePreview(host, values) {
  const state = pending.get(host) ?? {timer: undefined, controller: undefined};
  pending.set(host, state);

  clearTimeout(state.timer);
  state.controller?.abort();
  state.timer = setTimeout(() => {
    state.controller = new AbortController();
    renderPreview(host, values, state.controller.signal).catch((error) => {
      if (error.name !== 'AbortError') {
        console.warn('ve-content-element: the preview could not be rendered, it is shown after saving.', error);
      }
    });
  }, DEBOUNCE_DELAY);
}

/**
 * @param {HTMLElement} host
 * @param {Record<string, string>} values
 * @param {AbortSignal} signal
 */
async function renderPreview(host, values, signal) {
  const body = new URLSearchParams();
  for (const [field, value] of Object.entries(values)) {
    body.set(`veDraft[${host.table}][${host.uid}][${field}]`, value);
  }

  const response = await fetch(window.location.href, {method: 'POST', body, credentials: 'same-origin', signal});
  if (!response.ok) {
    return;
  }

  const renderedPage = new DOMParser().parseFromString(await response.text(), 'text/html');
  const renderedHost = renderedPage.getElementById(host.getAttribute('id'));
  if (renderedHost && host.isConnected) {
    patchClasses(host, renderedHost);
  }
}
