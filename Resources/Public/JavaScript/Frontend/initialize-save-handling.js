import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';
import {InterceptUserActionsGuard} from '@typo3/visual-editor/Frontend/intercept-user-actions-guard';

export function syncEditorState() {
  sendMessage('updateEditorState', {
    data: dataHandlerStore.data,
    initialData: dataHandlerStore.initialData,
    cmdArray: dataHandlerStore.cmdArray,
    cmdMetadata: dataHandlerStore.cmdMetadata,
    fieldMetadata: dataHandlerStore.fieldMetadata,
    invalidFields: dataHandlerStore.invalidFields,
    count: dataHandlerStore.changesCount,
    invalidCount: dataHandlerStore.invalidCount,
  });
}

export function focusFirstInvalidField() {
  document.querySelector('ve-editable-text[invalid]')?.focusEditable?.();
}

/**
 * @param {{languageId: number|string, fieldPositionId?: string, scrollPositionId?: string}} detail
 */
export function revealChange({languageId, fieldPositionId, scrollPositionId} = {}) {
  if (String(languageId) !== String(window.veInfo.languageId)) {
    return;
  }

  const editable = fieldPositionId ?
    [...document.querySelectorAll('ve-editable-text, ve-editable-rich-text')]
      .find(element => element.fieldPositionId === fieldPositionId)
    : null;
  if (editable) {
    editable.focusEditable?.();
    return;
  }

  if (scrollPositionId) {
    [...document.querySelectorAll('ve-content-element')]
      .find(element => element.scrollPositionId === scrollPositionId)
      ?.reveal?.();
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
    syncEditorState();
    sendMessage('doSave');
  });

  new InterceptUserActionsGuard(dataHandlerStore);
}

onMessage('focusFirstInvalidField', ({languageId}) => {
  if (String(languageId) === String(window.veInfo.languageId)) {
    focusFirstInvalidField();
  }
});

onMessage('saveEnded', () => {
  dataHandlerStore.markSaved();
});

onMessage('discardChanges', (detail = {}) => {
  const {languageId, languageIds} = detail || {};
  const currentLanguageId = String(window.veInfo.languageId);
  if (Array.isArray(languageIds) && !languageIds.some(id => String(id) === currentLanguageId)) {
    return;
  }
  if (!Array.isArray(languageIds) && languageId !== undefined && String(languageId) !== currentLanguageId) {
    return;
  }
  dataHandlerStore.reset();
  sendMessage('changesDiscarded', null, 'parent');
});

onMessage('revealChange', revealChange);
