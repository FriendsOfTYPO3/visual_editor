/**
 * Replaces the classes of an element with the classes of a freshly rendered one,
 * but keeps the classes the editor itself added at runtime (for example "ve-hidden").
 *
 * @param {string} currentClass the class attribute of the element in the page
 * @param {string} newClass the class attribute of the freshly rendered element
 * @param {string} keepPrefix classes of the current element that start with this prefix are kept
 * @return {string}
 */
export function mergeClassTokens(currentClass, newClass, keepPrefix = 've-') {
  const tokens = value => value.split(/\s+/).filter(Boolean);
  const kept = tokens(currentClass).filter(token => token.startsWith(keepPrefix));
  return [...new Set([...tokens(newClass), ...kept])].join(' ');
}
