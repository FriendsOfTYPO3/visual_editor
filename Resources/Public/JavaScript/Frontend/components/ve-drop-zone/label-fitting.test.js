import test from 'node:test';
import assert from 'node:assert/strict';
import {fitDropZoneLabel} from './label-fitting.js';

const variants = [
  {
    name: 'full',
    parts: [
      {type: 'label', text: 'after'},
      {type: 'value', text: 'Hero'},
      {type: 'label', text: 'in'},
      {type: 'value', text: 'Container'},
      {type: 'label', text: 'in column'},
      {type: 'value', text: 'Main'},
    ],
  },
  {
    name: 'without-container',
    parts: [
      {type: 'label', text: 'after'},
      {type: 'value', text: 'Hero'},
      {type: 'label', text: 'in column'},
      {type: 'value', text: 'Main'},
    ],
  },
  {
    name: 'column',
    parts: [
      {type: 'label', text: 'in column'},
      {type: 'value', text: 'Main'},
    ],
  },
];

function fit(availableWidth, availableHeight = 30, sourceVariants = variants) {
  return fitDropZoneLabel(sourceVariants, {
    availableWidth,
    availableHeight,
    measureText: (text, fontSize) => text.length * fontSize,
  });
}

test('fitDropZoneLabel keeps the full label at the default font size when it fits on one line', () => {
  assert.deepEqual(fit(600), {
    variant: 'full',
    fontSize: 14,
    lineCount: 1,
    hidden: false,
  });
});

test('fitDropZoneLabel shrinks text to keep it on one line', () => {
  assert.deepEqual(fit(500), {
    variant: 'full',
    fontSize: 13,
    lineCount: 1,
    hidden: false,
  });
});

test('fitDropZoneLabel switches to two lines when the smaller font size allows it', () => {
  assert.deepEqual(fit(240), {
    variant: 'full',
    fontSize: 12.5,
    lineCount: 2,
    hidden: false,
  });
});

test('fitDropZoneLabel removes container detail before after-element detail', () => {
  assert.deepEqual(fit(130), {
    variant: 'without-container',
    fontSize: 10.25,
    lineCount: 2,
    hidden: false,
  });
});

test('fitDropZoneLabel keeps the column detail after lower-priority details are removed', () => {
  assert.deepEqual(fit(80), {
    variant: 'column',
    fontSize: 11.25,
    lineCount: 2,
    hidden: false,
  });
});

test('fitDropZoneLabel hides text when the column-only label cannot fit at 9px', () => {
  assert.deepEqual(fit(20), {
    variant: null,
    fontSize: 9,
    lineCount: 1,
    hidden: true,
  });
});
