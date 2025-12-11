import {css, html, LitElement} from 'lit';
import {isDirectMode, onMessage, sendMessage} from '@andersundsehr/editara/Shared/iframe-messaging.mjs';
import {useDataHandler} from "@andersundsehr/editara/Frontend/api.mjs";
import {dataHandlerStore} from "@andersundsehr/editara/Frontend/stores/data-handler-store.mjs";

/**
 * @extends {HTMLElement}
 */
export class EditaraSaveButton extends LitElement {
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

    await useDataHandler(dataHandlerStore.data, dataHandlerStore.cmd);

    // worked, so we mark changes as saved
    dataHandlerStore.markSaved();
    this.saving = false;
    sendMessage('saveEnded');

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
    return html`
      <button
        @click=${this._save}
        ?disabled="${this.saving}"
      >
        ${
          this.saving
            ? html`💾 Saving...`
            : html`Save ${this.count} ✏️ changes`
        }

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

customElements.define('editara-save-button', EditaraSaveButton);
