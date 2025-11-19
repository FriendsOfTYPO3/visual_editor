import {css, html, LitElement} from 'lit';
import {changesStore} from './changes-store.mjs';
import {isDirectMode, onMessage, sendMessage} from '../Shared/iframe-messaging.mjs';
import {getObjectLeafCount} from "../Shared/get-object-leaf-count.mjs";

/**
 * @extends {HTMLElement}
 */
export class EditaraSaveButton extends LitElement {
  static properties = {
    changes: {type: Object},
    saving: {type: Boolean},
  };

  constructor() {
    super();
    /** @type {object} */
    this.changes = {};
    this.saving = false;
    sendMessage('updateChangesCount', this.count);

    changesStore.addEventListener('changes', e => {
      this.changes = e.detail.changes;
      console.log('Changes updated:', this.changes);

      sendMessage('updateChangesCount', this.count);// TODO handle this in parent
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

  get count() {
    return getObjectLeafCount(this.changes);
  }

  async _save() {
    this.saving = true;
    sendMessage('onSave');
    const value = this.changes;
    const body = JSON.stringify(value, null, 2);
    const response = await fetch(window.location.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    });

    if (!response.ok) {
      document.body.innerHTML = await response.text();
      return;
    }

    const html = await response.text();
    this.saving = false;
    sendMessage('updateChangesCount', 0);
    sendMessage('saveEnded');

    // TODO only replace the changed elements instead of reloading the whole page
    console.log('Save response:', html);

    if (isDirectMode) {
      window.location.reload();
      return;
    }
    sendMessage('reloadFrames');
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
