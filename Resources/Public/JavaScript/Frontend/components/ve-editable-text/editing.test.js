import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {getEditValue, getSelectionOffsets, insertTextAtSelection} from './editing.js';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
});

function setSelection({start, selectedText = '', inside = true}) {
  const startContainer = {};
  const endContainer = {};
  const beforeRange = {
    selectNodeContents() {},
    setEnd(container, offset) {
      assert.equal(container, startContainer);
      assert.equal(offset, 0);
    },
    toString() {
      return 'x'.repeat(start);
    },
  };
  const range = {
    startContainer,
    endContainer,
    startOffset: 0,
    endOffset: 0,
    cloneRange() {
      return beforeRange;
    },
    toString() {
      return selectedText;
    },
    deleteContents() {},
    insertNode() {},
    setStart() {},
    collapse() {},
  };

  globalThis.window = {
    getSelection() {
      return {
        rangeCount: 1,
        getRangeAt() {
          return range;
        },
      };
    },
  };

  return {
    contains(node) {
      return inside && (node === startContainer || node === endContainer);
    },
  };
}

test('getSelectionOffsets falls back to the end when there is no selection', () => {
  globalThis.window = {
    getSelection() {
      return null;
    },
  };

  const offsets = getSelectionOffsets({innerText: 'abcd'});

  assert.deepEqual(offsets, {start: 4, end: 4});
});

test('getSelectionOffsets falls back when the selection is outside the element', () => {
  const element = {
    innerText: 'abcd',
    contains() {
      return false;
    },
  };
  setSelection({start: 1, selectedText: 'b', inside: false});

  const offsets = getSelectionOffsets(element);

  assert.deepEqual(offsets, {start: 4, end: 4});
});

test('getEditValue returns insert data for text and paste events', () => {
  globalThis.window = {
    getSelection() {
      return null;
    },
  };
  const element = {innerText: 'abc'};

  assert.deepEqual(getEditValue(element, {
    inputType: 'insertText',
    data: 'x',
  }), {
    type: 'insert',
    currentValue: 'abc',
    insertedText: 'x',
    start: 3,
    end: 3,
  });

  assert.deepEqual(getEditValue(element, {
    inputType: 'insertFromPaste',
    data: null,
    dataTransfer: {
      getData(type) {
        assert.equal(type, 'text/plain');
        return 'pasted';
      },
    },
  }), {
    type: 'insert',
    currentValue: 'abc',
    insertedText: 'pasted',
    start: 3,
    end: 3,
  });
});

test('getEditValue returns line breaks for paragraph insertion', () => {
  globalThis.window = {
    getSelection() {
      return null;
    },
  };

  const value = getEditValue({innerText: 'abc'}, {inputType: 'insertParagraph'});

  assert.deepEqual(value, {
    type: 'insertBreak',
    currentValue: 'abc',
    insertedText: '\n',
    start: 3,
    end: 3,
  });
});

test('getEditValue handles delete branches', () => {
  const element = Object.assign({innerText: 'abcd'}, setSelection({start: 1, selectedText: 'bc'}));

  assert.deepEqual(getEditValue(element, {inputType: 'deleteContent'}), {
    type: 'delete',
    nextValue: 'ad',
  });

  Object.assign(element, setSelection({start: 0}));
  assert.deepEqual(getEditValue(element, {inputType: 'deleteContentBackward'}), {
    type: 'delete',
    nextValue: 'abcd',
  });

  Object.assign(element, setSelection({start: 2}));
  assert.deepEqual(getEditValue(element, {inputType: 'deleteContentBackward'}), {
    type: 'delete',
    nextValue: 'acd',
  });

  Object.assign(element, setSelection({start: 4}));
  assert.deepEqual(getEditValue(element, {inputType: 'deleteContentForward'}), {
    type: 'delete',
    nextValue: 'abcd',
  });

  Object.assign(element, setSelection({start: 1}));
  assert.deepEqual(getEditValue(element, {inputType: 'deleteContentForward'}), {
    type: 'delete',
    nextValue: 'acd',
  });
});

test('getEditValue returns null for unsupported input types', () => {
  globalThis.window = {
    getSelection() {
      return null;
    },
  };

  assert.equal(getEditValue({innerText: 'abc'}, {inputType: 'formatBold'}), null);
});

test('insertTextAtSelection appends when there is no usable selection', () => {
  globalThis.window = {
    getSelection() {
      return null;
    },
  };

  const element = {innerText: 'abc'};
  insertTextAtSelection(element, 'x');

  assert.equal(element.innerText, 'abcx');
});
