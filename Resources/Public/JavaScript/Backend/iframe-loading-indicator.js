import Backend from '@typo3/backend/viewport.js';

const defaultShowDelay = 150;
const defaultTimeout = 30000;
const loadingIframes = new Set();
const watchedIframes = new WeakSet();
let showTimer = null;
let timeoutTimer = null;
let isStarted = false;

export function initializeIframeLoadingIndicator() {
  for (const iframe of document.querySelectorAll('iframe')) {
    watchIframe(iframe);

    if (!isIframeLoaded(iframe)) {
      markLoading(iframe);
    }
  }
}

/**
 * @param {HTMLIFrameElement|null} iframe
 */
export function markLoading(iframe) {
  if (!iframe) {
    return;
  }
  watchIframe(iframe);
  loadingIframes.add(iframe);
  scheduleStart();
  scheduleTimeout();
}

/**
 * @param {HTMLIFrameElement} iframe
 */
function watchIframe(iframe) {
  if (watchedIframes.has(iframe)) {
    return;
  }
  watchedIframes.add(iframe);
  iframe.addEventListener('load', () => {
    loadingIframes.delete(iframe);
    if (loadingIframes.size === 0) {
      finish();
    }
  });
}

/**
 * @param {HTMLIFrameElement} iframe
 * @return {boolean}
 */
function isIframeLoaded(iframe) {
  try {
    return iframe.contentDocument?.readyState === 'complete'
      || iframe.contentWindow?.document?.readyState === 'complete';
  } catch {
    return false;
  }
}

function scheduleStart() {
  if (isStarted || showTimer !== null) {
    return;
  }
  showTimer = setTimeout(() => {
    showTimer = null;
    if (loadingIframes.size === 0) {
      return;
    }
    isStarted = true;
    Backend.Loader.start();
  }, defaultShowDelay);
}

function scheduleTimeout() {
  if (timeoutTimer !== null) {
    return;
  }
  timeoutTimer = setTimeout(() => {
    timeoutTimer = null;
    if (loadingIframes.size === 0) {
      return;
    }
    console.warn('Visual Editor iframe loading indicator timed out.');
    loadingIframes.clear();
    finish();
  }, defaultTimeout);
}

function finish() {
  if (showTimer !== null) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (timeoutTimer !== null) {
    clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }
  if (!isStarted) {
    return;
  }
  isStarted = false;
  Backend.Loader.finish();
}
