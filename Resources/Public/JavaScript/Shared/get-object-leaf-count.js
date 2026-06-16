/**
 * @param object {Object}
 * @returns {number}
 */
export function getObjectLeafCount(object) {
  let count = 0;
  // Use Object.keys to iterate only own enumerable properties
  for (const key of Object.keys(object)) {
    const value = object[key];
    if (value !== null && typeof value === 'object') {
      count += getObjectLeafCount(value);
    } else {
      count++;
    }
  }
  return count;
}
