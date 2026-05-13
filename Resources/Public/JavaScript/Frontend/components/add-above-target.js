/**
 * @param {HTMLElement & {pid?: number}} element
 * @returns {number}
 */
export function getAddAboveUidPid(element) {
  let previousElement = element.previousElementSibling;
  while (previousElement) {
    if (previousElement.tagName.toLowerCase() === 've-content-element') {
      return -previousElement.uid;
    }
    previousElement = previousElement.previousElementSibling;
  }

  return element.pid;
}
