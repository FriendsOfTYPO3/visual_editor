import {lll} from "@typo3/core/lit-helper.js";
import Modal from '@typo3/backend/modal.js';
import Severity from '@typo3/backend/severity.js';
import {trySave} from '@typo3/visual-editor/Frontend/initialize-save-handling';


export class InterceptUserActionsGuard {
  constructor(dataHandlerStore) {
    this.dataHandlerStore = dataHandlerStore;

    window.addEventListener('beforeunload', (event) => {
      if (this.dataHandlerStore.changesCount) {
        event.preventDefault();
      }
    });

    top.TYPO3.Backend.consumerScope.attach(this);
    window.addEventListener('pagehide', () => top.TYPO3.Backend.consumerScope.detach(this), {once: true});
  }

  /**
   * @param interactionRequest  {{ concernsTypes(possible: string[]): any }}
   * @return {Promise<void>}
   */
  async consume(interactionRequest) {
    if (!interactionRequest.concernsTypes(['typo3.setUrl', 'typo3.beforeSetUrl', 'typo3.refresh'])) {
      return;
    }

    const hasChanges = this.dataHandlerStore.changesCount > 0;
    if (!hasChanges) {
      return;
    }

    return new Promise((resolve, reject) => {
      const buttons = [
        {
          text: lll('buttons.confirm.close_without_save.no'),
          btnClass: 'btn-default',
          trigger: (_e, modal) => {
            modal.hideModal();
            reject();
          },
        },
        {
          text: lll('buttons.confirm.close_without_save.yes'),
          btnClass: 'btn-warning',
          trigger: (_e, modal) => {
            modal.hideModal();
            this.dataHandlerStore.reset();
            resolve();
          },
        },
      ];

      const noErrors = this.dataHandlerStore.invalidCount === 0;
      if (noErrors) {
        buttons.push({
          text: lll('buttons.confirm.save_and_close'),
          btnClass: 'btn-primary',
          trigger: async (_e, modal) => {
            modal.hideModal();
            await trySave();
            resolve();
          },
        });
      }

      Modal.confirm(
        lll('label.confirm.close_without_save.title'),
        lll('label.confirm.close_without_save.content'),
        Severity.warning,
        buttons,
      );
    });
  }
}
