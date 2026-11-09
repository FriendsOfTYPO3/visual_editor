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

  if (validation?.number) {
    return normalizeNumberValue(text, validation.number, preserveLeadingAndTrailingWhitespace);
  }

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

  if (validation?.number && !isEmpty && reasons.length === 0) {
    errors.push(...getNumberValidationIssues(value.trim(), validation.number));
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

/**
 * Removes characters which are not allowed in a TCA type=number field.
 *
 * @param {string} input
 * @param {{format?: string}} number
 * @param {boolean} preserveLeadingAndTrailingWhitespace
 * @returns {{text: string, reasons: ValidationMessage[]}}
 */
function normalizeNumberValue(input, number, preserveLeadingAndTrailingWhitespace) {
  const reasons = [];
  let text = preserveLeadingAndTrailingWhitespace ? input : input.trim();
  const isDecimal = number.format === 'decimal';
  const disallowed = isDecimal ? /[^0-9.,-]/g : /[^0-9-]/g;

  if (text.match(disallowed)) {
    text = text.replaceAll(disallowed, '');
    reasons.push({key: isDecimal ? 'inputDenial.decimal' : 'inputDenial.integer'});
  }

  return {text, reasons};
}

/**
 * @param {string} value
 * @param {{format?: string, lower?: number, upper?: number}} number
 * @returns {ValidationMessage[]}
 */
function getNumberValidationIssues(value, number) {
  const isDecimal = number.format === 'decimal';
  const pattern = isDecimal ? /^-?(\d+([.,]\d*)?|[.,]\d+)$/ : /^-?\d+$/;
  if (!pattern.test(value)) {
    return [{key: isDecimal ? 'validation.decimal' : 'validation.integer'}];
  }

  const errors = [];
  const numericValue = Number(value.replace(',', '.'));
  if (typeof number.lower === 'number' && numericValue < number.lower) {
    errors.push({key: 'validation.lower', args: [number.lower]});
  }
  if (typeof number.upper === 'number' && numericValue > number.upper) {
    errors.push({key: 'validation.upper', args: [number.upper]});
  }

  return errors;
}

/**
 * Converts the edited text into the value sent to the DataHandler.
 * Empty values of nullable number fields are stored as null, as the DataHandler would store 0 otherwise.
 *
 * @param {string} value
 * @param {Record<string, any>} validation
 * @returns {string|null}
 */
export function toStoredValue(value, validation) {
  if (validation?.number && validation.nullable && value === '') {
    return null;
  }

  return value;
}
