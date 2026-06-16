import {sortTheNodesThroughTheShadowRootsAndSlots} from '@typo3/visual-editor/Frontend/sort-the-nodes-through-the-shadow-roots-and-slots';

/**
 * @return {void}
 */
export function initSaveScrollPosition() {
  if (!getPositions()) {
    // no position to restore

    document.addEventListener('scrollend', saveScrollPosition);
    window.addEventListener('resize', saveScrollPosition);
    return;
  }
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  document.addEventListener('readystatechange', () => {
    setTimeout(() => {
      scrollToPosition();

      setTimeout(() => {
        // init save listeners:
        document.addEventListener('scrollend', saveScrollPosition);
        window.addEventListener('resize', saveScrollPosition);
      }, 100);
    }, 50);
  });
}

/**
 * @param positions {Array<{id: string, innerOffsetY: number}>}
 * @return {void}
 */
function setPositions(positions) {
  const item = {
    positions,
    url: window.location.href,
    time: Date.now().toFixed(),
  };

  sessionStorage.setItem('t3-ve-scroll-position', JSON.stringify(item));
}

/**
 * @return {Array<{id: string, innerOffsetY: number}>}
 */
function getPositions() {
  const item = JSON.parse(sessionStorage.getItem('t3-ve-scroll-position') || '{}');
  if (!item || !item.url || item.url !== window.location.href) {
    return null;
  }
  // only if it was saved in the last 1h:
  if (Date.now() - parseInt(item.time, 10) > 3600 * 1000) {
    return null;
  }
  return Array.isArray(item.positions) ? item.positions : null;
}

/**
 * @return {void}
 */
function scrollToPosition() {
  const positions = getPositions();
  if (!positions) {
    return;
  }

  let element = null;
  let position = null;
  for (const pos of positions) {
    element = document.getElementById(pos.id);
    if (element) {
      position = pos;
      break;
    }
  }
  if (!element || !position) {
    return;
  }

  const elementRect = element.getBoundingClientRect();
  const scrollToY = elementRect.top + position.innerOffsetY;
  window.scrollTo({
    top: scrollToY,
    behavior: 'instant',
  });
}

/**
 * @return {void}
 */
function saveScrollPosition() {
  const possibleSaveTargets = document.querySelectorAll('ve-content-element[id]:not([id=""])');
  // we want to find the nearest element to the top of the viewport that is still above or at the top:

  // We need to order the elements from bottom to top
  const list = sortTheNodesThroughTheShadowRootsAndSlots([...possibleSaveTargets]);

  const positions = [];
  // so we iterate in reverse order:
  for (const element of list.toReversed()) {
    const elementRect = element.getBoundingClientRect();
    if (elementRect.top < 0) {
      const innerOffsetY = Math.min(window.innerHeight, -elementRect.top);
      positions.push({
        id: element.id,
        innerOffsetY: innerOffsetY,
      });
    }
  }
  // take only first 10 positions:
  positions.splice(10);
  setPositions(positions);
}
