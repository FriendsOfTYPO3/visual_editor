import {css, html, LitElement} from 'lit';
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

    onMessage('saveEnded', () => {
      this.saving = false;
    });
    this.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage('doSave');
    })
  }

  render() {
    let s = 'Save';  // TODO label
    if (this.count > 0) {
      const label = this.count === 1 ? 'change' : 'changes';
      s = html`Save ${this.count} ${label}`; // TODO label
    }
    if (this.saving) {
      s = html`Saveing ...`; // TODO label
    }
    return html`
      <typo3-backend-icon identifier="actions-save" size="small"></typo3-backend-icon>
      ${s}
    `;
  }


  static styles = css`
    :host {
    }
  `;
}

customElements.define('ve-backend-save-button', VeBackendSaveButton);
