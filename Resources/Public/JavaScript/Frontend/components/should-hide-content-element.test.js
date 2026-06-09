import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldHideContentElement} from './should-hide-content-element.js';

test('hides a hidden element when "Show hidden" is off', () => {
  assert.equal(shouldHideContentElement({showHidden: false, isHidden: true, hasUnsavedHiddenChange: false}), true);
});

test('shows a hidden element when "Show hidden" is on', () => {
  assert.equal(shouldHideContentElement({showHidden: true, isHidden: true, hasUnsavedHiddenChange: false}), false);
});

test('never hides a visible element', () => {
  assert.equal(shouldHideContentElement({showHidden: false, isHidden: false, hasUnsavedHiddenChange: false}), false);
  assert.equal(shouldHideContentElement({showHidden: true, isHidden: false, hasUnsavedHiddenChange: false}), false);
});

test('keeps a hidden element visible while it has an unsaved hidden-field change', () => {
  assert.equal(shouldHideContentElement({showHidden: false, isHidden: true, hasUnsavedHiddenChange: true}), false);
});
