import {mergeClassTokens} from '@typo3/visual-editor/Frontend/appearance-preview/merge-class-tokens';

/**
 * @param {Element} element
 * @return {boolean}
 */
const isPlainElement = element => !element.tagName.includes('-');

/**
 * @param {Element} element
 * @param {string} newClass
 */
function applyClass(element, newClass) {
  const merged = mergeClassTokens(element.getAttribute('class') ?? '', newClass);
  if (merged !== (element.getAttribute('class') ?? '')) {
    element.setAttribute('class', merged);
  }
}

/**
 * Takes over the classes of a freshly rendered content element.
 *
 * The content element took over the attributes of its only child element and holds the children
 * of that child, see ve-content-element. So the classes of the child go to the content element,
 * and the classes of the elements below the child go to the direct children of the content element.
 * Nothing else is touched, so unsaved changes of texts stay.
 *
 * @param {HTMLElement} host the content element in the page
 * @param {Element} renderedHost the content element of a freshly rendered page
 * @return {boolean} whether the classes were taken over
 */
export function patchClasses(host, renderedHost) {
  if (renderedHost.childElementCount !== 1) {
    return false;
  }

  const renderedWrapper = renderedHost.firstElementChild;
  applyClass(host, renderedWrapper.getAttribute('class') ?? '');

  const children = [...host.children].filter(isPlainElement);
  const renderedChildren = [...renderedWrapper.children].filter(isPlainElement);
  if (children.length !== renderedChildren.length) {
    return true;
  }

  for (const [index, child] of children.entries()) {
    if (child.tagName === renderedChildren[index].tagName) {
      applyClass(child, renderedChildren[index].getAttribute('class') ?? '');
    }
  }

  return true;
}
