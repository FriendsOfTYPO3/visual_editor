/**
 * Checks whether a value is a plain object.
 *
 * Plain objects are recursively merged. Arrays, dates, functions, and other
 * object types are treated as regular values and overwritten.
 *
 * @param {*} value
 *   The value to check.
 *
 * @returns {boolean}
 *   Whether the value is a plain object.
 */
function isPlainObject(value) {
  return (
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Recursively merges two objects.
 *
 * Values from the higher priority object overwrite values from the lower
 * priority object. If both values are plain objects, they are merged
 * recursively.
 *
 * This function does not mutate the given objects.
 *
 * @template T
 * @template U
 *
 * @param {T} lowerPriority
 *   The base object whose values are used by default.
 *
 * @param {U} higherPriority
 *   The object whose values take precedence.
 *
 * @returns {T & U}
 *   A new object containing the recursively merged values.
 */
function deepMerge(lowerPriority, higherPriority) {
  const result = {...lowerPriority};

  for (const key of Object.keys(higherPriority)) {
    const lowerValue = result[key];
    const higherValue = higherPriority[key];

    if (isPlainObject(lowerValue) && isPlainObject(higherValue)) {
      result[key] = deepMerge(lowerValue, higherValue);
    } else {
      result[key] = higherValue;
    }
  }

  return result;
}

/**
 *
 * @param editorStates {Map<number, {data: Object, cmdArray: Object[], invalidFields: Object, count: number, invalidCount: number}>}
 * @return {{data: Object, cmdArray: Object[], invalidFields: Object, count: number, invalidCount: number}}
 */
export function aggregateEditorStates(editorStates) {
  const valuesOnlySortedByKey = [...editorStates.keys()].sort((a, b) => a - b).map(key => editorStates.get(key));
  return valuesOnlySortedByKey.reduce((aggregatedState, {data = {}, cmdArray = [], invalidFields = {}, count = 0, invalidCount = 0}) => ({
    data: deepMerge(aggregatedState.data, data),
    cmdArray: [...aggregatedState.cmdArray, ...cmdArray],
    invalidFields: deepMerge(aggregatedState.invalidFields, invalidFields),
    count: aggregatedState.count + count,
    invalidCount: aggregatedState.invalidCount + invalidCount,
  }), {data: {}, cmdArray: [], invalidFields: {}, count: 0, invalidCount: 0});
}
