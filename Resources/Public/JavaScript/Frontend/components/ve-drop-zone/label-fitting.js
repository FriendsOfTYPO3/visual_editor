export const DROP_ZONE_LABEL_FIT_DEFAULTS = {
  maxFontSize: 14,
  minFontSize: 9,
  lineHeight: 1.2,
};

/**
 * @typedef {Object} DropZoneLabelPart
 * @property {'label'|'value'} type
 * @property {string} text
 */

/**
 * @typedef {Object} DropZoneLabelVariant
 * @property {string} name
 * @property {DropZoneLabelPart[]} parts
 */

/**
 * @typedef {Object} DropZoneLabelFit
 * @property {string|null} variant
 * @property {number} fontSize
 * @property {number} lineCount
 * @property {boolean} hidden
 */

/**
 * @param {DropZoneLabelVariant[]} variants
 * @param {Object} options
 * @param {number} options.availableWidth
 * @param {number} options.availableHeight
 * @param {(text: string, fontSize: number) => number} options.measureText
 * @param {number} [options.maxFontSize]
 * @param {number} [options.minFontSize]
 * @param {number} [options.lineHeight]
 * @returns {DropZoneLabelFit}
 */
export function fitDropZoneLabel(variants, options) {
  const {
    availableWidth,
    availableHeight,
    measureText,
    maxFontSize = DROP_ZONE_LABEL_FIT_DEFAULTS.maxFontSize,
    minFontSize = DROP_ZONE_LABEL_FIT_DEFAULTS.minFontSize,
    lineHeight = DROP_ZONE_LABEL_FIT_DEFAULTS.lineHeight,
  } = options;

  if (availableWidth <= 0 || availableHeight <= 0) {
    return hiddenFit(minFontSize);
  }

  for (const variant of variants) {
    const text = getVariantText(variant);
    if (text === '') {
      continue;
    }

    if (fitsInLines(text, availableWidth, measureText, maxFontSize, 1)) {
      return {
        variant: variant.name,
        fontSize: maxFontSize,
        lineCount: 1,
        hidden: false,
      };
    }

    const twoLineMaxFontSize = Math.min(maxFontSize, availableHeight / (2 * lineHeight));
    const oneLineFontSize = largestFittingFontSize({
      text,
      availableWidth,
      availableHeight,
      measureText,
      maxFontSize,
      minFontSize,
      lineHeight,
      lineCount: 1,
    });
    if (oneLineFontSize !== null && (twoLineMaxFontSize < minFontSize || oneLineFontSize > twoLineMaxFontSize)) {
      return {
        variant: variant.name,
        fontSize: oneLineFontSize,
        lineCount: 1,
        hidden: false,
      };
    }

    const twoLineFontSize = largestFittingFontSize({
      text,
      availableWidth,
      availableHeight,
      measureText,
      maxFontSize: twoLineMaxFontSize,
      minFontSize,
      lineHeight,
      lineCount: 2,
    });
    if (twoLineFontSize !== null) {
      return {
        variant: variant.name,
        fontSize: twoLineFontSize,
        lineCount: 2,
        hidden: false,
      };
    }
  }

  return hiddenFit(minFontSize);
}

/**
 * @param {DropZoneLabelVariant} variant
 * @returns {string}
 */
export function getVariantText(variant) {
  return variant.parts.map(part => part.text).filter(Boolean).join(' ').trim();
}

/**
 * @param {Object} options
 * @param {string} options.text
 * @param {number} options.availableWidth
 * @param {number} options.availableHeight
 * @param {(text: string, fontSize: number) => number} options.measureText
 * @param {number} options.maxFontSize
 * @param {number} options.minFontSize
 * @param {number} options.lineHeight
 * @param {number} options.lineCount
 * @returns {number|null}
 */
function largestFittingFontSize(options) {
  const {
    text,
    availableWidth,
    availableHeight,
    measureText,
    maxFontSize,
    minFontSize,
    lineHeight,
    lineCount,
  } = options;

  const upperFontSize = Math.min(maxFontSize, availableHeight / (lineCount * lineHeight));
  if (upperFontSize < minFontSize) {
    return null;
  }

  for (let fontSize = upperFontSize; fontSize >= minFontSize; fontSize -= 0.25) {
    const roundedFontSize = Math.round(fontSize * 100) / 100;
    if (fitsInLines(text, availableWidth, measureText, roundedFontSize, lineCount)) {
      return roundedFontSize;
    }
  }

  return null;
}

/**
 * @param {string} text
 * @param {number} availableWidth
 * @param {(text: string, fontSize: number) => number} measureText
 * @param {number} fontSize
 * @param {number} lineCount
 * @returns {boolean}
 */
function fitsInLines(text, availableWidth, measureText, fontSize, lineCount) {
  return measureText(text, fontSize) <= availableWidth * lineCount;
}

/**
 * @param {number} fontSize
 * @returns {DropZoneLabelFit}
 */
function hiddenFit(fontSize) {
  return {
    variant: null,
    fontSize,
    lineCount: 1,
    hidden: true,
  };
}
