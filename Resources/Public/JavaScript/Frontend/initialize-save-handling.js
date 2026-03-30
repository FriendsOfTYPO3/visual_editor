import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {useDataHandler} from '@typo3/visual-editor/Frontend/use-data-handler';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';

let saving = false;

export function syncEditorState() {
  sendMessage('updateEditorState', {
    count: dataHandlerStore.changesCount,
    invalidCount: dataHandlerStore.invalidCount,
  });
}

export function focusFirstInvalidField() {
  document.querySelector('ve-editable-text[invalid]')?.focusEditable?.();
}

export async function trySave() {
  const count = dataHandlerStore.changesCount;
  const invalidCount = dataHandlerStore.invalidCount;
  if (invalidCount > 0) {
    syncEditorState();
    focusFirstInvalidField();
    return;
  }

  if (saving || count === 0) {
    return;
  }

  saving = true;
  sendMessage('onSave');

  try {
    const updatePageTree = dataHandlerStore.hasChangesIn('pages');
    await useDataHandler(dataHandlerStore.data, dataHandlerStore.cmdArray);
    dataHandlerStore.markSaved();
    sendMessage('saveEnded', {updatePageTree});
  } finally {
    saving = false;
  }
}

export function initializeSaveHandling() {
  syncEditorState();
  dataHandlerStore.addEventListener('change', syncEditorState);
  document.addEventListener('keydown', (event) => {
    if (!((event.ctrlKey || event.metaKey) && event.key === 's')) {
      return;
    }

    event.preventDefault();
    trySave();
  });
  onMessage('doSave', () => {
    trySave();
  });
}
