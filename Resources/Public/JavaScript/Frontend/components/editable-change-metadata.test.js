import test from 'node:test';
import assert from 'node:assert/strict';
import {getEditableChangeMetadata, refreshEditableChangeMetadataOrders} from './editable-change-metadata.js';

test('derives human record and field labels outside content elements', () => {
  globalThis.document = {querySelectorAll: () => []};
  const metadata = getEditableChangeMetadata({
    table: 'pages',
    uid: 12,
    field: 'title',
    fieldPositionId: 'pages:12:title',
    name: 'Example page: SEO: Title',
    closest: () => null,
  });

  assert.deepEqual(metadata, {
    recordKey: 'pages:12',
    recordLabel: 'Example page',
    recordType: 'pages',
    fieldLabel: 'SEO: Title',
    fieldPositionId: 'pages:12:title',
    kind: 'text',
    hidden: false,
  });
});

test('uses content element identity and rich-text kind', () => {
  globalThis.document = {querySelectorAll: () => []};
  const metadata = getEditableChangeMetadata({
    table: 'tt_content',
    uid: 42,
    field: 'bodytext',
    fieldPositionId: 'tt_content:42:bodytext',
    name: 'Text: Body text',
    closest: () => ({
      changeMetadata: {
        recordKey: 'tt_content:42',
        recordLabel: 'Text',
        recordType: 'text',
        scrollPositionId: 'tt_content:42',
        order: 3,
      },
    }),
  }, 'richText');

  assert.deepEqual(metadata, {
    recordKey: 'tt_content:42',
    recordLabel: 'Text',
    recordType: 'text',
    scrollPositionId: 'tt_content:42',
    order: 3,
    fieldLabel: 'Body text',
    fieldPositionId: 'tt_content:42:bodytext',
    kind: 'richText',
    hidden: false,
  });
});

test('refreshes every stored record and field position after a DOM move', () => {
  const calls = [];
  const elements = [
    {tagName: 'VE-CONTENT-ELEMENT', changeMetadata: {recordKey: 'tt_content:8'}},
    {tagName: 'VE-EDITABLE-TEXT', table: 'tt_content', uid: 18, field: 'header'},
    {tagName: 'VE-CONTENT-ELEMENT', changeMetadata: {recordKey: 'tt_content:7'}},
    {tagName: 'VE-EDITABLE-RICH-TEXT', table: 'tt_content', uid: 17, field: 'bodytext'},
  ];
  globalThis.document = {querySelectorAll: () => elements};

  refreshEditableChangeMetadataOrders({
    updateFieldMetadataOrder: (...arguments_) => calls.push(['record', ...arguments_]),
    setFieldMetadata: (...arguments_) => calls.push(['field', ...arguments_]),
  });

  assert.deepEqual(calls, [
    ['record', 'tt_content:8', 0, false],
    ['field', 'tt_content', 18, 'header', {order: 1}, false],
    ['record', 'tt_content:7', 2, false],
    ['field', 'tt_content', 17, 'bodytext', {order: 3}, false],
  ]);
});
