import test from 'node:test';
import assert from 'node:assert/strict';
import {getAddAboveUidPid} from './add-above-target.js';

function createElement({tagName = 've-content-element', uid = 0, pid = 1} = {}) {
  return {
    tagName,
    uid,
    pid,
    previousElementSibling: null,
  };
}

function linkSiblings(elements) {
  for (let index = 1; index < elements.length; index++) {
    elements[index].previousElementSibling = elements[index - 1];
  }
}

test('getAddAboveUidPid returns the negative uid of the previous content element', () => {
  const previous = createElement({uid: 42});
  const current = createElement({uid: 43, pid: 123});
  linkSiblings([previous, current]);

  assert.equal(getAddAboveUidPid(current), -42);
});

test('getAddAboveUidPid returns the positive page uid for the top content element', () => {
  const current = createElement({uid: 43, pid: 123});

  assert.equal(getAddAboveUidPid(current), 123);
});

test('getAddAboveUidPid skips non-content siblings when looking for the element above', () => {
  const previous = createElement({uid: 42});
  const unrelated = createElement({tagName: 'div'});
  const current = createElement({uid: 43, pid: 123});
  linkSiblings([previous, unrelated, current]);

  assert.equal(getAddAboveUidPid(current), -42);
});
