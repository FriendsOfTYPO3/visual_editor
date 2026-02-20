import {css, html, LitElement} from 'lit';
import {onMessageDebounced, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging.mjs';
import {autoSaveActive} from "@typo3/visual-editor/Shared/local-stores.mjs";


/**
 * @extends {HTMLElement}
 */
export class VeAutoSaveToggle extends LitElement {
  static properties = {
    workspace: {type: Number},
    isWorkspaceInstalled: {type: Number},
    active: {type: Boolean},
    label: {type: String},
  };

  willUpdate(changedProperties) {
    this.classList.toggle('btn-primary', this.active);
    this.classList.toggle('active', this.active);
    this.classList.toggle('btn-default', !this.active);
  }

  firstUpdated(changedProperties) {
    // default set if workspace is active
    this.active = this.workspace !== 0;

    // if user has a stored setting, use that:
    if (this.active) {
      this.active = autoSaveActive.get();
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

      autoSaveActive.set(this.active);

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

customElements.define('ve-auto-save-toggle', VeAutoSaveToggle);
