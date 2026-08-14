import test from 'node:test';
import assert from 'node:assert/strict';

async function loadFreshStore() {
  globalThis.window = {
    addEventListener() {},
  };
  const moduleUrl = new URL(`./data-handler-store.js?test=${Math.random()}`, import.meta.url);
  return import(moduleUrl.href);
}

test('data handler store emits scoped field details and skips no-op mutations', async () => {
  const {dataHandlerStore} = await loadFreshStore();
  const events = [];
  const metadata = {
    recordKey: 'tt_content:123',
    recordLabel: 'Text',
    fieldLabel: 'Header',
    fieldPositionId: 'tt_content:123:header',
    kind: 'text',
    order: 0,
  };
  const validationErrors = ['This field is required'];

  dataHandlerStore.addEventListener('change', (event) => {
    events.push(event.detail);
  });

  dataHandlerStore.setInitialData('tt_content', 123, 'header', 'Initial', metadata);
  dataHandlerStore.setInitialData('tt_content', 123, 'header', 'Initial');
  dataHandlerStore.setFieldMetadata('tt_content', 123, 'header', {validationErrors});
  dataHandlerStore.setFieldMetadata('tt_content', 123, 'header', {validationErrors: ['This field is required']});
  dataHandlerStore.setData('tt_content', 123, 'header', 'Initial');
  dataHandlerStore.setData('tt_content', 123, 'header', 'Changed');
  dataHandlerStore.setData('tt_content', 123, 'header', 'Changed');
  dataHandlerStore.setInvalid('tt_content', 123, 'header', true);
  dataHandlerStore.setInvalid('tt_content', 123, 'header', true);
  assert.equal(dataHandlerStore.invalidCount, 1);
  assert.deepEqual(dataHandlerStore.invalidFields, {
    tt_content: {
      123: {
        header: true,
      },
    },
  });

  dataHandlerStore.setInvalid('tt_content', 123, 'header', false);
  dataHandlerStore.setInvalid('tt_content', 123, 'header', false);

  assert.equal(dataHandlerStore.invalidCount, 0);
  assert.deepEqual(dataHandlerStore.invalidFields, {});
  metadata.fieldLabel = 'Mutated outside the store';
  validationErrors[0] = 'Mutated outside the store';
  assert.deepEqual(dataHandlerStore.initialData, {
    tt_content: {
      123: {
        header: 'Initial',
      },
    },
  });
  assert.deepEqual(dataHandlerStore.fieldMetadata, {
    tt_content: {
      123: {
        header: {
          recordKey: 'tt_content:123',
          recordLabel: 'Text',
          fieldLabel: 'Header',
          fieldPositionId: 'tt_content:123:header',
          kind: 'text',
          order: 0,
          validationErrors: ['This field is required'],
        },
      },
    },
  });

  assert.deepEqual(events, [
    {scope: 'field', kind: 'initial', table: 'tt_content', uid: 123, field: 'header'},
    {scope: 'field', kind: 'metadata', table: 'tt_content', uid: 123, field: 'header'},
    {scope: 'field', kind: 'data', table: 'tt_content', uid: 123, field: 'header'},
    {scope: 'field', kind: 'invalid', table: 'tt_content', uid: 123, field: 'header'},
    {scope: 'field', kind: 'invalid', table: 'tt_content', uid: 123, field: 'header'},
  ]);
});

test('data handler store emits table and global events for commands and save', async () => {
  const {dataHandlerStore} = await loadFreshStore();
  const events = [];

  dataHandlerStore.addEventListener('change', (event) => {
    events.push(event.detail);
  });

  dataHandlerStore.setInitialData('tt_content', 456, 'bodytext', '<p>Initial</p>');
  dataHandlerStore.setData('tt_content', 456, 'bodytext', '<p>Changed</p>');
  dataHandlerStore.addCmd('tt_content', 456, 'delete', 1);

  assert.equal(dataHandlerStore.changesCount, 2);

  dataHandlerStore.markSaved();

  assert.equal(dataHandlerStore.changesCount, 0);
  assert.deepEqual(events.at(-2), {
    scope: 'table',
    kind: 'cmd',
    table: 'tt_content',
    uid: 456,
  });
  assert.deepEqual(events.at(-1), {
    scope: 'global',
    kind: 'saved',
  });
});

test('command metadata stays aligned without changing data handler commands', async () => {
  const {dataHandlerStore} = await loadFreshStore();
  const deleteMetadata = {
    recordKey: 'tt_content:456',
    recordLabel: 'Text',
    scrollPositionId: 'tt_content:456',
    order: 2,
  };
  const moveCommand = {
    action: 'paste',
    target: -123,
    update: {colPos: 1},
  };

  dataHandlerStore.addCmd('tt_content', 456, 'delete', 1, deleteMetadata);
  dataHandlerStore.addCmd('tt_content', 789, 'move', moveCommand);
  deleteMetadata.recordLabel = 'Mutated outside the store';

  assert.deepEqual(dataHandlerStore.cmdArray, [
    {tt_content: {456: {delete: 1}}},
    {tt_content: {789: {move: {action: 'paste', target: -123, update: {colPos: 1}}}}},
  ]);
  assert.deepEqual(dataHandlerStore.cmdMetadata, [
    {
      recordKey: 'tt_content:456',
      recordLabel: 'Text',
      scrollPositionId: 'tt_content:456',
      order: 2,
      action: 'delete',
    },
    {action: 'move'},
  ]);

  dataHandlerStore.reset();

  assert.deepEqual(dataHandlerStore.cmdArray, []);
  assert.deepEqual(dataHandlerStore.cmdMetadata, []);
});

test('updates the persisted order of every field belonging to a moved record', async () => {
  const {dataHandlerStore} = await loadFreshStore();
  const events = [];

  dataHandlerStore.setInitialData('tt_content', 12, 'header', 'Header', {recordKey: 'tt_content:7', order: 2});
  dataHandlerStore.setInitialData('tt_content', 12, 'bodytext', 'Body', {recordKey: 'tt_content:7', order: 3});
  dataHandlerStore.setInitialData('tt_content', 13, 'header', 'Other', {recordKey: 'tt_content:8', order: 4});
  dataHandlerStore.addEventListener('change', event => events.push(event.detail));

  dataHandlerStore.updateFieldMetadataOrder('tt_content:7', 9);
  dataHandlerStore.updateFieldMetadataOrder('tt_content:7', 9);
  dataHandlerStore.updateFieldMetadataOrder('tt_content:missing', 10);

  const expectedFieldMetadata = {
    tt_content: {
      12: {
        header: {recordKey: 'tt_content:7', order: 9},
        bodytext: {recordKey: 'tt_content:7', order: 9},
      },
      13: {
        header: {recordKey: 'tt_content:8', order: 4},
      },
    },
  };
  assert.deepEqual(dataHandlerStore.fieldMetadata, expectedFieldMetadata);
  assert.deepEqual(events, [{scope: 'global', kind: 'metadata'}]);

  dataHandlerStore.reset();

  assert.deepEqual(dataHandlerStore.fieldMetadata, expectedFieldMetadata);
});
