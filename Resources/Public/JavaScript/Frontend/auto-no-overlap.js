import {sortTheNodesThroughTheShadowRootsAndSlots} from '@typo3/visual-editor/Frontend/sort-the-nodes-through-the-shadow-roots-and-slots';

/**
 * @type {Record<'ve-drag-handle'|'ve-drop-zone', HTMLElement[]>}
 */
let globalLists = {};

/**
 * @param element {HTMLElement}
 * @param group {'ve-drag-handle'|'ve-drop-zone'}
 */
export function autoNoOverlap(element, group) {
  if (!element) {
    throw new Error('Element must be specified for autoNoOverlap');
  }
  if (!group) {
    throw new Error('Group must be specified for autoNoOverlap');
  }
  globalLists[group] = globalLists[group] || [];
  globalLists[group].push(element);
  calculateAllDebounced();
}

/**
 * @param element {HTMLElement}
 * @param htmlElements {HTMLElement[]}
 */
function findConcealedElements(element, htmlElements) {
  if (htmlElements.length === 0) {
    return [];
  }
  const concealedElements = [];
  const elementRect = element.getBoundingClientRect();
  for (const htmlElement of htmlElements) {
    const htmlElementRect = htmlElement.getBoundingClientRect();
    const isConcealed = !(
      elementRect.right < htmlElementRect.left ||
      elementRect.left > htmlElementRect.right ||
      elementRect.bottom < htmlElementRect.top ||
      elementRect.top > htmlElementRect.bottom
    );
    if (isConcealed) {
      concealedElements.push(htmlElement);
    }
  }
  return concealedElements;
}

/**
 * @param list {HTMLElement[]}
 * @param group {'ve-drag-handle'|'ve-drop-zone'}
 */
function calculate(list, group) {
  const orderedList = sortTheNodesThroughTheShadowRootsAndSlots(list).reverse();
  if (orderedList.length === 0) {
    return;
  }
  // let index = orderedList.length;
  for (const htmlElement of orderedList) {
    // if (group === 've-drop-zone') {
    //   htmlElement.innerHTML = '' + (index--); // only for debugging
    // }
    htmlElement.style.setProperty('--auto-no-overlap-padding', '0px');
  }
  for (const htmlElementIndex in orderedList) {
    const htmlElement = orderedList[htmlElementIndex];
    const candidates = orderedList.slice(Number(htmlElementIndex) + 1, orderedList.length);
    const listOfConcealedElements = findConcealedElements(htmlElement, candidates);
    // if (listOfConcealedElements.length >= 2) {
    //   debugger;
    // }
    for (const concealedElement of listOfConcealedElements) {
      const requiredPadding = concealedElement.getBoundingClientRect().top - htmlElement.getBoundingClientRect().top + concealedElement.getBoundingClientRect().height;

      const currentPadding = parseFloat(concealedElement.style.getPropertyValue('--auto-no-overlap-padding')) || 0;

      if (group === 've-drop-zone') {
        // if it is transform, we need to add the current padding as well
        if (requiredPadding <= 0) {
          continue; // do not lower the padding again
        }
        const newPadding = (currentPadding + requiredPadding) + 'px';
        concealedElement.style.setProperty('--auto-no-overlap-padding', newPadding);
      } else {
        // if it is padding-bottom, we can just set it (if larger than current)
        if (currentPadding >= requiredPadding) {
          // already enough padding
          continue;
        }
        concealedElement.style.setProperty('--auto-no-overlap-padding', requiredPadding + 'px');
        // concealedElement.style.paddingBottom = requiredPadding + 'px';
      }
    }
  }
}

export const calculateAllDebounced = () => {
  clearTimeout(calculateAllDebounced._timeout);
  calculateAllDebounced._timeout = setTimeout(() => {
    // really calculate all groups
    for (const group in globalLists) {
      globalLists[group] = globalLists[group].filter(element => element.isConnected);
      calculate(globalLists[group], group);
    }
  }, 50);
}

// on window resize, recalculate
window.addEventListener('resize', calculateAllDebounced);

// on DOM changes and visibility toggles, recalculate
const observer = new MutationObserver(() => {
  // immediate
  calculateAllDebounced();
  // after animations are done:
  setTimeout(calculateAllDebounced, 310);
});
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-hidden'],
});
