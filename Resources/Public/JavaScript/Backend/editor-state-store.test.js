import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@typo3/visual-editor/Shared/iframe-messaging') {
      return {
        shortCircuit: true,
        url: `data:text/javascript,${encodeURIComponent(`
          export function onMessage(command, callback) {
            globalThis.editorStateMessageListener = {command, callback};
          }
        `)}`,
      };
    }
    return nextResolve(specifier, context);
  },
});

const {EditorStateStore, editorStateStore} = await import('./editor-state-store.js');

test('stores defensive state snapshots and announces meaningful changes', () => {
  const store = new EditorStateStore();
  const events = [];
  const state = {data: {tt_content: {12: {header: 'Changed'}}}};
  store.addEventListener('change', () => events.push('change'));

  store.set(1, state);
  state.data.tt_content[12].header = 'Mutated outside';
  const states = store.states;
  states.get(1).data.tt_content[12].header = 'Mutated snapshot';

  assert.equal(store.states.get(1).data.tt_content[12].header, 'Changed');
  assert.deepEqual(events, ['change']);

  store.clear();
  store.clear();

  assert.equal(store.states.size, 0);
  assert.deepEqual(events, ['change', 'change']);
});

test('shared store receives editor state messages by language', () => {
  assert.equal(globalThis.editorStateMessageListener.command, 'updateEditorState');

  globalThis.editorStateMessageListener.callback({count: 2}, 3);

  assert.deepEqual(editorStateStore.states.get(3), {count: 2});
});
