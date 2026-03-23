import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";
import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';

/**
 * @extends {HTMLElement}
 */
export class VeBackendSaveButton extends LitElement {
  static properties = {
    count: {type: Number, reflect: true},
    disabled: {type: Boolean, reflect: true},
    saving: {type: Boolean},
  };

  willUpdate(changedProperties) {
    this.disabled = this.saving === true || this.count === 0;

    this.classList.toggle('btn-default', this.disabled);
    this.classList.toggle('btn-warning', !this.disabled);
  }

  constructor() {
    super();
    this.count = 0;
    this.saving = false;
    this.disabled = true;
    this.disposeUpdateChangesCountListener = null;
    this.disposeOnSaveListener = null;
    this.disposeSaveEndedListener = null;
  }

  connectedCallback() {
    super.connectedCallback();

    if (!this.disposeUpdateChangesCountListener) {
      this.disposeUpdateChangesCountListener = onMessage('updateChangesCount', this.onUpdateChangesCount.bind(this));
    }
    if (!this.disposeOnSaveListener) {
      this.disposeOnSaveListener = onMessage('onSave', this.onSaveMessage.bind(this));
    }
    if (!this.disposeSaveEndedListener) {
      this.disposeSaveEndedListener = onMessage('saveEnded', this.onSaveEndedMessage.bind(this));
    }

    this.addEventListener('click', this.onClick);
  }

  disconnectedCallback() {
    this.disposeUpdateChangesCountListener?.();
    this.disposeUpdateChangesCountListener = null;
    this.disposeOnSaveListener?.();
    this.disposeOnSaveListener = null;
    this.disposeSaveEndedListener?.();
    this.disposeSaveEndedListener = null;
    this.removeEventListener('click', this.onClick);

    super.disconnectedCallback();
  }

  render() {
    let label = lll('save');
    if (this.count > 0) {
      label = this.count === 1 ? lll('save.change') : lll('save.changes', this.count);
    }
    if (this.saving) {
      label = lll('saving');
    }
    return html`
      <typo3-backend-icon identifier="actions-save" size="small"></typo3-backend-icon>
      ${label}
    `;
  }

  onUpdateChangesCount(count) {
    this.count = count;
  }

  onSaveMessage() {
    this.saving = true;
  }

  onSaveEndedMessage({updatePageTree}) {
    this.saving = false;

    if (updatePageTree) {
      console.log('Updating page tree after save', {updatePageTree});
      top.document.dispatchEvent(new CustomEvent('typo3:pagetree:refresh'));
    }
  }

  onClick(e) {
    e.preventDefault();
    sendMessage('doSave');
  }


  static styles = css`
    :host {
    }
  `;
}

customElements.define('ve-backend-save-button', VeBackendSaveButton);
