/**
 * @param {Node} element
 * @return {null|Selection}
 */
function getSelection(element) {
  const root = element.getRootNode();

  // in chromium, you need to use the shadowRoot instead of window ＞︿＜
  return typeof root.getSelection === "function"
    ? root.getSelection()
    : window.getSelection();
}

/**
 * @param {Node} element
 * @return {number}
 */
export function getCaretOffset(element) {
  const selection = getSelection(element);

  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();

  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
}

/**
 * @param {Node} element
 * @param {number} newCaretPosition
 */
export function setCaretPosition(element, newCaretPosition) {
  const selection = getSelection(element);
  const range = document.createRange();
  range.setStart(element.firstChild || element, newCaretPosition);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}
