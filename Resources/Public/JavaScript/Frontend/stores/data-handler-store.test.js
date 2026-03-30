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

  dataHandlerStore.addEventListener('change', (event) => {
    events.push(event.detail);
  });

  dataHandlerStore.setInitialData('tt_content', 123, 'header', 'Initial');
  dataHandlerStore.setInitialData('tt_content', 123, 'header', 'Initial');
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

  assert.deepEqual(events, [
    {scope: 'field', kind: 'initial', table: 'tt_content', uid: 123, field: 'header'},
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
