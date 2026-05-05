/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * @param {string} value
 * @return {string}
 */
function escapeCssAttributeValue(value) {
  if (globalThis.CSS?.escape) {
    return CSS.escape(value);
  }

  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/:/g, '\\:');
}

/**
 * @param {{scrollY: number, innerHeight: number, document: {scrollingElement: {scrollHeight: number}}}} windowObject
 * @return {number}
 */
export function getScrollProgress(windowObject) {
  const maxScrollTop = windowObject.document.scrollingElement.scrollHeight - windowObject.innerHeight;
  if (maxScrollTop <= 0) {
    return 0;
  }

  return clamp(windowObject.scrollY / maxScrollTop, 0, 1);
}

/**
 * @typedef {Object} ScrollPositionState
 * @property {Array<{scrollPositionId: string, innerOffsetY: number}>} positions
 * @property {number} scrollProgress
 */

/**
 * @param {Array<{getAttribute: (name: string) => string|null, getBoundingClientRect: () => {top: number, width: number, height: number}}>} elements
 * @param {number} limit
 * @return {Array<{scrollPositionId: string, innerOffsetY: number}>}
 */
export function collectNearestScrollPositions(elements, limit = 5) {
  return elements
    .filter(element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0)
    .map(element => ({
      scrollPositionId: element.getAttribute('scrollPositionId'),
      innerOffsetY: -element.getBoundingClientRect().top,
    }))
    .filter(({scrollPositionId}) => scrollPositionId)
    .sort((a, b) => Math.abs(a.innerOffsetY) - Math.abs(b.innerOffsetY))
    .slice(0, limit);
}

/**
 * @param {{querySelector: (selector: string) => {getBoundingClientRect: () => {top: number, width: number, height: number}}|null, scrollingElement: {scrollHeight: number}}} documentObject
 * @param {{scrollY: number, innerHeight: number}} windowObject
 * @param {ScrollPositionState} scrollPosition
 * @return {number|null}
 */
export function getVisibleScrollTargetY(documentObject, windowObject, scrollPosition) {
  for (const position of scrollPosition.positions) {
    const element = documentObject.querySelector(`ve-content-element[scrollPositionId="${escapeCssAttributeValue(position.scrollPositionId)}"]`);
    if (element) {
      // skip if element is hidden:
      if (element.getBoundingClientRect().width === 0 || element.getBoundingClientRect().height === 0) {
        continue;
      }
      return windowObject.scrollY + element.getBoundingClientRect().top + position.innerOffsetY;
    }
  }

  return null;
}

/**
 * @param {{querySelector: (selector: string) => {getBoundingClientRect: () => {top: number, width: number, height: number}}|null, scrollingElement: {scrollHeight: number}}} documentObject
 * @param {{scrollY: number, innerHeight: number}} windowObject
 * @param {ScrollPositionState} scrollPosition
 * @return {number}
 */
export function getScrollTargetY(documentObject, windowObject, scrollPosition) {
  const visibleScrollTargetY = getVisibleScrollTargetY(documentObject, windowObject, scrollPosition);
  if (visibleScrollTargetY !== null) {
    return visibleScrollTargetY;
  }

  const maxScrollTop = documentObject.scrollingElement.scrollHeight - windowObject.innerHeight;
  return clamp(scrollPosition.scrollProgress, 0, 1) * Math.max(maxScrollTop, 0);
}

/**
 * @param {unknown} value
 * @return {value is ScrollPositionState}
 */
function isScrollPositionState(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.positions) || typeof value.scrollProgress !== 'number') {
    return false;
  }

  return value.positions.every(position => (
    position
    && typeof position === 'object'
    && typeof position.scrollPositionId === 'string'
    && typeof position.innerOffsetY === 'number'
  ));
}

/**
 * @param {ScrollPositionState} scrollPosition
 * @param {string} page
 * @param {number} time
 * @return {{positions: Array<{scrollPositionId: string, innerOffsetY: number}>, scrollProgress: number, page: string, time: string}}
 */
export function createStoredScrollPosition(scrollPosition, page, time = Date.now()) {
  return {
    positions: scrollPosition.positions,
    scrollProgress: scrollPosition.scrollProgress,
    page,
    time: time.toFixed(),
  };
}

/**
 * @param {string|null} storedValue
 * @param {string} page
 * @param {number} now
 * @return {ScrollPositionState|null}
 */
export function parseStoredScrollPosition(storedValue, page, now = Date.now()) {
  if (!storedValue) {
    return null;
  }

  let item;
  try {
    item = JSON.parse(storedValue);
  } catch {
    return null;
  }

  if (!item || typeof item !== 'object' || item.page !== page || typeof item.time !== 'string') {
    return null;
  }

  const storedTime = parseInt(item.time, 10);
  if (Number.isNaN(storedTime) || now - storedTime > 3600 * 1000) {
    return null;
  }

  if (!isScrollPositionState(item)) {
    return null;
  }

  return {
    positions: item.positions,
    scrollProgress: item.scrollProgress,
  };
}
