/**
 * @typedef {{key: string, args?: Array<string|number>}} ValidationMessage
 */

/**
 * @param {string} input
 * @param {Record<string, any>} validation
 * @param {{preserveLeadingAndTrailingWhitespace?: boolean}} [options]
 * @returns {{text: string, reasons: ValidationMessage[]}}
 */
export function normalizeValue(input, validation, options = {}) {
  let text = input;
  const reasons = [];
  const preserveLeadingAndTrailingWhitespace = options.preserveLeadingAndTrailingWhitespace === true;

  const evalList = Array.isArray(validation?.eval) ? validation.eval : [];
  for (const evalName of evalList) {
    switch (evalName) {
      case 'trim':
        if (!preserveLeadingAndTrailingWhitespace) {
          text = text.trim();
        }
        break;
      case 'upper':
        text = text.toLocaleUpperCase();
        break;
      case 'lower':
        text = text.toLocaleLowerCase();
        break;
      case 'nospace':
        if (text.includes(' ')) {
          text = text.replaceAll(' ', '');
          reasons.push({key: 'inputDenial.nospace'});
        }
        break;
      case 'alpha':
        if (text.match(/[^a-zA-Z]/g)) {
          text = text.replaceAll(/[^a-zA-Z]/g, '');
          reasons.push({key: 'inputDenial.alpha'});
        }
        break;
      case 'num':
        if (text.match(/[^0-9]/g)) {
          text = text.replaceAll(/[^0-9]/g, '');
          reasons.push({key: 'inputDenial.num'});
        }
        break;
      case 'alphanum':
        if (text.match(/[^a-zA-Z0-9]/g)) {
          text = text.replaceAll(/[^a-zA-Z0-9]/g, '');
          reasons.push({key: 'inputDenial.alphanum'});
        }
        break;
      case 'alphanum_x':
        if (text.match(/[^a-zA-Z0-9_-]/g)) {
          text = text.replaceAll(/[^a-zA-Z0-9_-]/g, '');
          reasons.push({key: 'inputDenial.alphanum_x'});
        }
        break;
    }
  }

  return {text, reasons};
}

/**
 * @param {string} value
 * @param {Record<string, any>} validation
 * @returns {ValidationMessage[]}
 */
export function getValidationIssues(value, validation) {
  const {reasons} = normalizeValue(value, validation);
  const errors = [...reasons];
  const isEmpty = value === '';

  if (validation?.required && isEmpty) {
    errors.push({key: 'validation.required'});
  }

  const min = Number(validation?.min || 0);
  if (!isEmpty && min > 0 && value.length < min) {
    errors.push({key: 'validation.min', args: [min]});
  }

  const max = Number(validation?.max || 0);
  if (max > 0 && value.length > max) {
    errors.push({key: 'validation.max', args: [max]});
  }

  return errors;
}
