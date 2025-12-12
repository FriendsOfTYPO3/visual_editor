import {html, LitElement} from 'lit';
import {sendMessage} from '@andersundsehr/editara/Shared/iframe-messaging.mjs';
import {showEmptyActive} from "@andersundsehr/editara/Shared/local-store.js";

/**
 * @extends {HTMLElement}
 */
export class EditaraShowEmptyToggle extends LitElement {
  static properties = {
    active: {type: Boolean, reflect: true,},
    label: {type: String,},
  };

  createRenderRoot() {
    // Disable shadow DOM
    return this;
  }

  constructor() {
    super();

    this.label = this.innerText;
    this.innerHTML = '';
    this.active = showEmptyActive.get();
    sendMessage('showEmpty', this.active);

    showEmptyActive.addEventListener('currentWindowChange', () => {
      this.active = showEmptyActive.get();
    });
    this.addEventListener('click', (e) => {
      e.preventDefault();

      this.active = !this.active;
      showEmptyActive.set(this.active);
      sendMessage('showEmpty', this.active);
    })
  }

  willUpdate(changedProperties) {
    this.classList.toggle('btn-primary', this.active);
    this.classList.toggle('active', this.active);
    this.classList.toggle('btn-default', !this.active);
  }

  render() {
    return html`
      <typo3-backend-icon identifier="${this.active ? 'actions-toggle-on' : 'actions-toggle-off'}" size="small"></typo3-backend-icon>
      ${this.label}
    `;
  }
}

customElements.define('editara-show-empty-toggle', EditaraShowEmptyToggle);
