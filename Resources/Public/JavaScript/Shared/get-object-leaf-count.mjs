/**
 * @param object {Object}
 * @returns {number}
 */
export function getObjectLeafCount(object) {
    let count = 0;
    for (const key in object) {
        if (object.hasOwnProperty(key)) {
            const value = object[key];
            if (value !== null && typeof value === 'object') {
                count += getObjectLeafCount(value);
            } else {
                count += 1;
            }
        }
    }
    return count;
}
