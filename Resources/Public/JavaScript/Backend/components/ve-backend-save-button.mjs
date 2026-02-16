import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";
import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging.mjs';

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

    onMessage('updateChangesCount', (count) => {
      this.count = count;
    });

    onMessage('onSave', () => {
      this.saving = true;
    });

    onMessage('saveEnded', ({updatePageTree}) => {
      this.saving = false;

      if (updatePageTree) {
        console.log('Updating page tree after save', {updatePageTree});
        top.document.dispatchEvent(new CustomEvent('typo3:pagetree:refresh'));
      }
    });
    this.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage('doSave');
    })
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


  static styles = css`
    :host {
    }
  `;
}

customElements.define('ve-backend-save-button', VeBackendSaveButton);
