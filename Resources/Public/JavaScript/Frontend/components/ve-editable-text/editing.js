/**
 * @param {HTMLElement} element
 * @returns {{start: number, end: number}}
 */
export function getSelectionOffsets(element) {
  const currentValue = element.innerText || '';
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return {start: currentValue.length, end: currentValue.length};
  }

  const range = selection.getRangeAt(0);
  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
    return {start: currentValue.length, end: currentValue.length};
  }

  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(element);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const start = beforeRange.toString().length;
  const end = start + range.toString().length;

  return {start, end};
}

/**
 * @param {HTMLElement} element
 * @param {InputEvent} event
 * @returns {object|null}
 */
export function getEditValue(element, event) {
  const currentValue = element.innerText || '';
  const {start, end} = getSelectionOffsets(element);

  switch (event.inputType) {
    case 'insertText':
    case 'insertCompositionText':
    case 'insertReplacementText':
    case 'insertFromPaste':
    case 'insertFromDrop':
    case 'insertFromYank': {
      const insertedText = event.dataTransfer?.getData('text/plain') ?? event.data ?? '';
      return {type: 'insert', currentValue, insertedText, start, end};
    }
    case 'insertLineBreak':
    case 'insertParagraph':
      return {type: 'insertBreak', currentValue, insertedText: '\n', start, end};
    case 'deleteContent':
    case 'deleteByCut':
    case 'deleteByDrag':
      return {type: 'delete', nextValue: currentValue.slice(0, start) + currentValue.slice(end)};
    case 'deleteContentBackward':
      if (start !== end) {
        return {type: 'delete', nextValue: currentValue.slice(0, start) + currentValue.slice(end)};
      }
      if (start === 0) {
        return {type: 'delete', nextValue: currentValue};
      }
      return {type: 'delete', nextValue: currentValue.slice(0, start - 1) + currentValue.slice(end)};
    case 'deleteContentForward':
      if (start !== end) {
        return {type: 'delete', nextValue: currentValue.slice(0, start) + currentValue.slice(end)};
      }
      if (start >= currentValue.length) {
        return {type: 'delete', nextValue: currentValue};
      }
      return {type: 'delete', nextValue: currentValue.slice(0, start) + currentValue.slice(start + 1)};
    default:
      return null;
  }
}

/**
 * @param {HTMLElement} element
 * @param {string} text
 */
export function insertTextAtSelection(element, text) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    element.innerText += text;
    return;
  }

  const range = selection.getRangeAt(0);
  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
    element.innerText += text;
    return;
  }

  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStart(textNode, text.length);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}
