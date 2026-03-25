import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {useDataHandler} from '@typo3/visual-editor/Frontend/use-data-handler';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';

export function initializeSaveHandling() {
  let saving = false;
  let count = dataHandlerStore.changesCount;

  const syncCount = () => {
    sendMessage('change', dataHandlerStore.changesCount);
    if (dataHandlerStore.changesCount === count) {
      return;
    }
    count = dataHandlerStore.changesCount;
    sendMessage('updateChangesCount', count);
  };

  const trySave = async () => {
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
  };

  sendMessage('updateChangesCount', count);
  dataHandlerStore.addEventListener('change', syncCount);
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
