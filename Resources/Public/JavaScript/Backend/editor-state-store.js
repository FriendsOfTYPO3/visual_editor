import {onMessage} from '@typo3/visual-editor/Shared/iframe-messaging';

export class EditorStateStore extends EventTarget {
  #states = new Map();

  get states() {
    return new Map([...this.#states].map(([languageId, state]) => [languageId, structuredClone(state)]));
  }

  set(languageId, state) {
    this.#states.set(languageId, structuredClone(state));
    this.dispatchEvent(new Event('change'));
  }

  clear() {
    if (this.#states.size === 0) {
      return;
    }
    this.#states.clear();
    this.dispatchEvent(new Event('change'));
  }
}

export const editorStateStore = new EditorStateStore();

onMessage('updateEditorState', (state, fromLanguageId) => {
  editorStateStore.set(fromLanguageId, state);
});
