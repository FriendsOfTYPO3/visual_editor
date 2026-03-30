import test from 'node:test';
import assert from 'node:assert/strict';
import {getValidationIssues, normalizeValue} from './validation.js';

test('normalizeValue trims before later validation checks are applied', () => {
  const result = normalizeValue(' ab ', {eval: ['trim']});

  assert.equal(result.text, 'ab');
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
