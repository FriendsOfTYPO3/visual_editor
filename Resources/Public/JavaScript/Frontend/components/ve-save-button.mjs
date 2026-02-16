import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";
import {isDirectMode, onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging.mjs';
import {useDataHandler} from "@typo3/visual-editor/Frontend/api.mjs";
import {dataHandlerStore} from "@typo3/visual-editor/Frontend/stores/data-handler-store.mjs";

/**
 * @extends {HTMLElement}
 */
export class VeSaveButton extends LitElement {
  static properties = {
    count: {type: Number},
    saving: {type: Boolean},
  };

  constructor() {
    super();
    this.saving = false;
    this.count = 0;
    sendMessage('updateChangesCount', this.count);

    dataHandlerStore.addEventListener('change', e => {
      sendMessage('change', dataHandlerStore.changesCount);
      if (dataHandlerStore.changesCount === this.count) {
        return;
      }
      this.count = dataHandlerStore.changesCount;

      sendMessage('updateChangesCount', this.count);
    });

    document.addEventListener('keydown', (event) => {
      // on CTRL + S
      if (!((event.ctrlKey || event.metaKey) && event.key === 's')) {
        return;
      }

      event.preventDefault();

      this.trySave();
    });

    onMessage('doSave', () => {
      this.trySave();
    });
  }

  trySave() {
    if (this.saving) {
      return;
    }
    if (!this.count) {
      return;
    }

    this._save();
  }

  async _save() {
    this.saving = true;
    sendMessage('onSave');

    const updatePageTree = dataHandlerStore.data['pages'] || dataHandlerStore.cmd['pages'];
    await useDataHandler(dataHandlerStore.data, dataHandlerStore.cmd);

    // worked, so we mark changes as saved
    dataHandlerStore.markSaved();
    this.saving = false;
    sendMessage('saveEnded', {updatePageTree});

    // sendMessage('reloadFrames'); // TODO if langauge compare is added we need this again.
  }

  render() {
    if (!isDirectMode) {
      // save button in iframe mode is handled by the parent
      return html``;
    }

    if (!this.count) {
      return html``;
    }

    let label = this.count === 1 ? lll('save.change') : lll('save.changes', this.count);
    label += ' ✏️';
    if (this.saving) {
      label = lll('saving');
    }
    return html`
      <button
        @click=${this._save}
        ?disabled="${this.saving}"
      >
        ${label}
      </button>
    `;
  }


  static styles = css`
    :host {
    }

    button {
      position: fixed;
      top: 40px;
      right: 20px;
      padding: 10px 20px;
      background-color: #28a745;
      color: #fff;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      z-index: 100000;
    }

    button[disabled] {
      background-color: #6c757d;
      cursor: wait;
    }
  `;
}

customElements.define('ve-save-button', VeSaveButton);
