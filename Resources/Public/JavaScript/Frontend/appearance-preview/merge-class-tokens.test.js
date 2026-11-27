import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeClassTokens} from './merge-class-tokens.js';

test('replaces the classes with the new ones', () => {
  assert.equal(mergeClassTokens('text column-body', 'text column-page'), 'text column-page');
});

test('keeps the classes of the editor', () => {
  assert.equal(mergeClassTokens('text column-body ve-hidden', 'text column-page'), 'text column-page ve-hidden');
});

test('does not duplicate a kept class', () => {
  assert.equal(mergeClassTokens('text ve-hidden', 'text ve-hidden column-page'), 'text ve-hidden column-page');
});

test('handles empty and irregular whitespace', () => {
  assert.equal(mergeClassTokens('', '  text   column-page '), 'text column-page');
  assert.equal(mergeClassTokens('text ve-hidden', ''), 've-hidden');
});

test('keeps the classes with a custom prefix', () => {
  assert.equal(mergeClassTokens('a keep-me', 'b', 'keep-'), 'b keep-me');
});
