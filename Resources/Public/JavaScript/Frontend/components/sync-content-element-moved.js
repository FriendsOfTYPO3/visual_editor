import {flipInsertBefore} from '@typo3/visual-editor/Frontend/flip-insert-before';

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
 * @param {string} table
 * @param {string} scrollPositionId
 * @return {HTMLElement|null}
 */
function findContentElement(table, scrollPositionId) {
  const element = document.querySelector(`ve-content-element[scrollPositionId="${escapeCssAttributeValue(scrollPositionId)}"]`);
  if (element?.table !== table) {
    return null;
  }

  return element;
}

/**
 * @param {HTMLElement} element
 * @return {HTMLElement|null}
 */
function findParentContentElement(element) {
  const parentElement = element.parentNode;
  if (!parentElement) {
    return null;
  }
  if (parentElement instanceof ShadowRoot) {
    return findParentContentElement(parentElement.host);
  }
  if (parentElement.tagName?.toLowerCase() === 've-content-element') {
    return parentElement;
  }
  return findParentContentElement(parentElement);
}

/**
 * @param {{table: string, colPos: number, containerScrollPositionId: string|null}} detail
 * @return {HTMLElement|null}
 */
function findTargetContentArea(detail) {
  const contentAreas = document.querySelectorAll('ve-content-area');
  for (const contentArea of contentAreas) {
    if (contentArea.table && contentArea.table !== detail.table) {
      continue;
    }
    if (contentArea.colPos !== detail.colPos) {
      continue;
    }

    const containerElement = findParentContentElement(contentArea);
    const containerScrollPositionId = containerElement?.scrollPositionId ?? null;
    if (containerScrollPositionId === detail.containerScrollPositionId) {
      return contentArea;
    }
  }

  return null;
}

/**
 * @param {{languageId: number, table: string, scrollPositionId: string, mode: 'after', targetScrollPositionId: string}|{languageId: number, table: string, scrollPositionId: string, mode: 'area-start', colPos: number, containerScrollPositionId: string|null}} detail
 * @return {void}
 */
export function syncContentElementMoved(detail) {
  if (detail.languageId !== 0) {
    return;
  }

  const sourceElement = findContentElement(detail.table, detail.scrollPositionId);
  if (!sourceElement) {
    return;
  }

  if (detail.mode === 'after') {
    const targetElement = findContentElement(detail.table, detail.targetScrollPositionId);
    if (!targetElement || targetElement === sourceElement) {
      return;
    }
    flipInsertBefore(targetElement.parentNode, sourceElement, targetElement.nextSibling);
    return;
  }

  const targetArea = findTargetContentArea(detail);
  if (!targetArea) {
    return;
  }
  flipInsertBefore(targetArea, sourceElement, targetArea.firstChild);
}
