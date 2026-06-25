import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {
  collectNearestScrollPositions,
  createStoredScrollPosition,
  getScrollProgress,
  getScrollTargetY,
  getVisibleScrollTargetY,
  parseStoredScrollPosition,
} from '@typo3/visual-editor/Frontend/scroll-position-sync-helpers';

const scrollPositionSelector = 've-content-element[scrollPositionId]';
const scrollPositionStorageKey = 't3-ve-scroll-position';
let ignoreNextScrollEventsUntil = 0;
let queuedScrollMessage = false;

/**
 * @return {string}
 */
function getScrollPositionStoragePage() {
  return String(window.veInfo?.pageId ?? window.location.href);
}

/**
 * @return {{positions: Array<{scrollPositionId: string, innerOffsetY: number}>, scrollProgress: number}}
 */
function getCurrentScrollPosition() {
  const elements = [...document.querySelectorAll(scrollPositionSelector)];
  return {
    positions: collectNearestScrollPositions(elements),
    scrollProgress: getScrollProgress(window),
  };
}

/**
 * @param {{positions: Array<{scrollPositionId: string, innerOffsetY: number}>, scrollProgress: number}} scrollPosition
 * @return {void}
 */
function saveScrollPosition(scrollPosition) {
  sessionStorage.setItem(
    scrollPositionStorageKey,
    JSON.stringify(createStoredScrollPosition(scrollPosition, getScrollPositionStoragePage())),
  );
}

/**
 * @return {{positions: Array<{scrollPositionId: string, innerOffsetY: number}>, scrollProgress: number}|null}
 */
function getSavedScrollPosition() {
  return parseStoredScrollPosition(
    sessionStorage.getItem(scrollPositionStorageKey),
    getScrollPositionStoragePage(),
  );
}

/**
 * @return {void}
 */
function syncAndSaveCurrentScrollPosition() {
  const scrollPosition = getCurrentScrollPosition();
  saveScrollPosition(scrollPosition);
  if (scrollPosition.positions.length === 0) {
    return;
  }
  sendMessage('scrollPositionChanged', scrollPosition, 'parent');
}

/**
 * @return {void}
 */
function queueCurrentScrollPosition() {
  if (Date.now() < ignoreNextScrollEventsUntil || queuedScrollMessage) {
    return;
  }

  queuedScrollMessage = true;
  requestAnimationFrame(() => {
    queuedScrollMessage = false;
    if (Date.now() >= ignoreNextScrollEventsUntil) {
      syncAndSaveCurrentScrollPosition();
    }
  });
}

/**
 * @return {void}
 */
function restoreSavedScrollPosition() {
  const scrollPosition = getSavedScrollPosition();
  if (!scrollPosition) {
    return;
  }

  window.scrollTo({
    top: getScrollTargetY(document, window, scrollPosition),
    behavior: 'instant',
  });
}

/**
 * @return {void}
 */
export function initializeScrollPositionSyncAndSave() {
  if (getSavedScrollPosition() && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  document.addEventListener('readystatechange', () => {
    setTimeout(() => {
      restoreSavedScrollPosition();
    }, 50);
  });

  window.addEventListener('scroll', queueCurrentScrollPosition, {passive: true});
  onMessage('syncScrollPosition', (scrollPosition) => {
    if (String(scrollPosition.languageId) === String(window.veInfo.languageId)) {
      return;
    }

    const scrollTargetY = getVisibleScrollTargetY(document, window, scrollPosition);
    if (scrollTargetY === null) {
      return;
    }

    ignoreNextScrollEventsUntil = Date.now() + 250;
    window.scrollTo({
      top: scrollTargetY,
      behavior: 'instant',
    });
  });
}
