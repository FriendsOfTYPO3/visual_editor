import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";
import {isDirectMode, onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {useDataHandler} from '@typo3/visual-editor/Frontend/use-data-handler';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';

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
    this.disposeDoSaveListener = null;
    this.onDataHandlerChange = this.#onDataHandlerChange.bind(this);
    this.onKeydown = this.#onKeydown.bind(this);
    this.onDoSaveMessage = this.#onDoSaveMessage.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    sendMessage('updateChangesCount', this.count);
    dataHandlerStore.addEventListener('change', this.onDataHandlerChange);
    document.addEventListener('keydown', this.onKeydown);
    if (!this.disposeDoSaveListener) {
      this.disposeDoSaveListener = onMessage('doSave', this.onDoSaveMessage);
    }
  }

  disconnectedCallback() {
    dataHandlerStore.removeEventListener('change', this.onDataHandlerChange);
    document.removeEventListener('keydown', this.onKeydown);
    this.disposeDoSaveListener?.();
    this.disposeDoSaveListener = null;

    super.disconnectedCallback();
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

    const updatePageTree = dataHandlerStore.hasChangesIn('pages');
    await useDataHandler(dataHandlerStore.data, dataHandlerStore.cmdArray);

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

  #onDataHandlerChange() {
    sendMessage('change', dataHandlerStore.changesCount);
    if (dataHandlerStore.changesCount === this.count) {
      return;
    }
    this.count = dataHandlerStore.changesCount;

    sendMessage('updateChangesCount', this.count);
  }

  #onKeydown(event) {
    if (!((event.ctrlKey || event.metaKey) && event.key === 's')) {
      return;
    }

    event.preventDefault();
    this.trySave();
  }

  #onDoSaveMessage() {
    this.trySave();
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
