import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';
import {InterceptUserActionsGuard} from '@typo3/visual-editor/Frontend/intercept-user-actions-guard';

export function syncEditorState() {
  sendMessage('updateEditorState', {
    data: dataHandlerStore.data,
    cmdArray: dataHandlerStore.cmdArray,
    invalidFields: dataHandlerStore.invalidFields,
    count: dataHandlerStore.changesCount,
    invalidCount: dataHandlerStore.invalidCount,
  });
}

export function focusFirstInvalidField() {
  document.querySelector('ve-editable-text[invalid]')?.focusEditable?.();
}

export function initializeSaveHandling() {
  syncEditorState();
  dataHandlerStore.addEventListener('change', syncEditorState);
  document.addEventListener('keydown', (event) => {
    if (!((event.ctrlKey || event.metaKey) && event.key === 's')) {
      return;
    }

    event.preventDefault();
    syncEditorState();
    sendMessage('doSave');
  });

  new InterceptUserActionsGuard(dataHandlerStore);
}

onMessage('focusFirstInvalidField', ({languageId}) => {
  if (languageId === window.veInfo.langaugeId) {
    focusFirstInvalidField();
  }
});

onMessage('saveEnded', () => {
  dataHandlerStore.markSaved();
});
