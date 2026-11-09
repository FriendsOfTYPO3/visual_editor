import test from 'node:test';
import assert from 'node:assert/strict';
import {getValidationIssues, normalizeValue, toStoredValue} from './validation.js';

test('normalizeValue trims before later validation checks are applied', () => {
  const result = normalizeValue(' ab ', {eval: ['trim']});

  assert.equal(result.text, 'ab');
  assert.deepEqual(result.reasons, []);
});

test('normalizeValue keeps leading and trailing whitespace during live input', () => {
  const result = normalizeValue(' ab ', {eval: ['trim']}, {
    preserveLeadingAndTrailingWhitespace: true,
  });

  assert.equal(result.text, ' ab ');
  assert.deepEqual(result.reasons, []);
});

test('normalizeValue still applies non-trim eval rules during live input', () => {
  const result = normalizeValue(' a ', {eval: ['trim', 'upper']}, {
    preserveLeadingAndTrailingWhitespace: true,
  });

  assert.equal(result.text, ' A ');
  assert.deepEqual(result.reasons, []);
});

test('getValidationIssues uses original text for required validation', () => {
  const issues = getValidationIssues('   ', {eval: ['trim'], required: true});

  assert.deepEqual(issues, []);
});

test('getValidationIssues uses original text for min validation', () => {
  const issues = getValidationIssues(' a ', {eval: ['trim'], min: 2});

  assert.deepEqual(issues, []);
});

test('getValidationIssues allows empty values when min is set without required', () => {
  const issues = getValidationIssues('', {min: 3, required: false});

  assert.deepEqual(issues, []);
});

test('getValidationIssues uses original text for max validation', () => {
  const issues = getValidationIssues(' ab ', {eval: ['trim'], max: 2});

  assert.deepEqual(issues, [{key: 'validation.max', args: [2]}]);
});

test('getValidationIssues keeps the reported headline text valid with max length only', () => {
  const issues = getValidationIssues('A fresh foundation for every project', {
    required: false,
    allowNewlines: false,
    max: 255,
  });

  assert.deepEqual(issues, []);
});

test('getValidationIssues keeps denied reasons when normalization results in an allowed empty value', () => {
  const issues = getValidationIssues(' 1 ', {eval: ['trim', 'alpha'], min: 2});

  assert.deepEqual(issues, [{key: 'inputDenial.alpha'}]);
});

test('getValidationIssues prefers unchanged max validation over normalization denial reasons', () => {
  const issues = getValidationIssues('Visual Editing for TYPO3', {
    required: false,
    allowNewlines: false,
    min: 3,
    max: 10,
    eval: ['upper', 'num', 'alphanum', 'nospace'],
  });

  assert.deepEqual(issues, [
    {key: 'inputDenial.num'},
    {key: 'validation.max', args: [10]},
  ]);
});

test('getValidationIssues keeps eval validation for unchanged values when no higher-priority issue exists', () => {
  const issues = getValidationIssues(' 1 ', {
    eval: ['trim', 'alpha'],
  });

  assert.deepEqual(issues, [{key: 'inputDenial.alpha'}]);
});

test('getValidationIssues uses validatedText emptiness for unchanged required validation', () => {
  const issues = getValidationIssues('   ', {
    eval: ['trim', 'alpha'],
    required: true,
  });

  assert.deepEqual(issues, []);
});

test('getValidationIssues returns unchanged min and eval errors together', () => {
  const issues = getValidationIssues('1', {
    eval: ['alpha'],
    min: 2,
  });

  assert.deepEqual(issues, [
    {key: 'inputDenial.alpha'},
    {key: 'validation.min', args: [2]},
  ]);
});

test('normalizeValue removes characters which are not allowed in integer number fields', () => {
  const result = normalizeValue('1.2a3', {number: {format: 'integer'}});

  assert.equal(result.text, '123');
  assert.deepEqual(result.reasons, [{key: 'inputDenial.integer'}]);
});

test('normalizeValue keeps decimal separators in decimal number fields', () => {
  const result = normalizeValue('-1,5€', {number: {format: 'decimal'}});

  assert.equal(result.text, '-1,5');
  assert.deepEqual(result.reasons, [{key: 'inputDenial.decimal'}]);
});

test('normalizeValue trims number fields only outside of live input', () => {
  assert.equal(normalizeValue(' 42 ', {number: {format: 'integer'}}).text, '42');
  assert.equal(normalizeValue(' ', {number: {format: 'integer'}}, {
    preserveLeadingAndTrailingWhitespace: true,
  }).text, '');
});

test('getValidationIssues reports malformed number values', () => {
  assert.deepEqual(getValidationIssues('1-2', {number: {format: 'integer'}}), [{key: 'validation.integer'}]);
  assert.deepEqual(getValidationIssues('1.2.3', {number: {format: 'decimal'}}), [{key: 'validation.decimal'}]);
});

test('getValidationIssues accepts well-formed number values', () => {
  assert.deepEqual(getValidationIssues('-42', {number: {format: 'integer'}}), []);
  assert.deepEqual(getValidationIssues('3,14', {number: {format: 'decimal'}}), []);
  assert.deepEqual(getValidationIssues('.5', {number: {format: 'decimal'}}), []);
});

test('getValidationIssues checks the TCA range of number fields', () => {
  const validation = {number: {format: 'decimal', lower: 1, upper: 9.5}};

  assert.deepEqual(getValidationIssues('0,9', validation), [{key: 'validation.lower', args: [1]}]);
  assert.deepEqual(getValidationIssues('9.6', validation), [{key: 'validation.upper', args: [9.5]}]);
  assert.deepEqual(getValidationIssues('9.5', validation), []);
});

test('getValidationIssues reports empty required number fields', () => {
  assert.deepEqual(getValidationIssues('', {required: true, number: {format: 'integer'}}), [{key: 'validation.required'}]);
});

test('toStoredValue stores empty nullable number fields as null', () => {
  assert.equal(toStoredValue('', {nullable: true, number: {format: 'integer'}}), null);
  assert.equal(toStoredValue('', {nullable: false, number: {format: 'integer'}}), '');
  assert.equal(toStoredValue('', {nullable: true}), '');
  assert.equal(toStoredValue('5', {nullable: true, number: {format: 'integer'}}), '5');
});

test('getValidationIssues limits decimal number fields to two decimal places', () => {
  assert.deepEqual(getValidationIssues('1,239', {number: {format: 'decimal'}}), [{key: 'validation.decimalPlaces', args: [2]}]);
  assert.deepEqual(getValidationIssues('1,23', {number: {format: 'decimal'}}), []);
});

test('getValidationIssues ignores trailing zeros when counting decimal places', () => {
  assert.deepEqual(getValidationIssues('1,2300', {number: {format: 'decimal'}}), []);
});
