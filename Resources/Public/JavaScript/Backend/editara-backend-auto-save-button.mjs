import {css, html, LitElement} from 'lit';
import {onMessageDebounced, sendMessage} from '@andersundsehr/editara/Shared/iframe-messaging.mjs';

/**
 * @extends {HTMLElement}
 */
export class EditaraBackendAutoSaveButton extends LitElement {
  static properties = {
    workspace: {type: Number},
    isWorkspaceInstalled: {type: Number},
    active: {type: Boolean},
    label: {type: String},
  };

  willUpdate(changedProperties) {
    if (this.active) {
      this.classList.add('btn-primary');
      this.classList.remove('btn-default');
    } else {
      this.classList.remove('btn-primary');
      this.classList.add('btn-default');
    }
  }

  firstUpdated(changedProperties) {
    // default set if workspace is active
    this.active = this.workspace !== 0;

    const setting = localStorage.getItem('editara-autosave-active');
    // if user has a stored setting, use that:
    if(setting === 'true' || setting === 'false') {
      this.active = setting === 'true';
    }
  }

  constructor() {
    super();
    this.count = 0;
    this.label = this.innerText;

    onMessageDebounced('change', (count) => {
      this.count = count;
      if (this.active && this.count > 0) {
        sendMessage('doSave');
      }
    }, 300);

    this.addEventListener('click', (e) => {
      e.preventDefault();
      this.active = !this.active;

      localStorage.setItem('editara-autosave-active', this.active ? 'true' : 'false');

      if (this.active && this.count > 0) {
        sendMessage('doSave');
      }
    })
  }

  render() {
    const icon = this.active ? 'actions-toggle-on' : 'actions-toggle-off';
    return html`
      <typo3-backend-icon identifier="${icon}" size="small"></typo3-backend-icon>
      ${(this.label)}`;
  }


  static styles = css`
    :host {
    }
  `;
}

customElements.define('editara-backend-auto-save-button', EditaraBackendAutoSaveButton);
