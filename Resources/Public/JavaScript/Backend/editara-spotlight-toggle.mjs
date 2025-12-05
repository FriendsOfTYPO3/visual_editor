import {css, html, LitElement} from 'lit';
import {sendMessage} from '@andersundsehr/editara/Shared/iframe-messaging.mjs';


/**
 * @extends {HTMLElement}
 */
export class EditaraSpotlightToggle extends LitElement {
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
    this.active = localStorage.getItem('editara-spotlight-active') === 'true';
    sendMessage('spotlight', this.active);

    this.addEventListener('click', (e) => {
      e.preventDefault();

      this.active = !this.active;
      localStorage.setItem('editara-spotlight-active', this.active ? 'true' : 'false');
      sendMessage('spotlight', this.active);
    })
  }

  render() {
    return html`
      <typo3-backend-icon identifier="${this.active ? 'actions-toggle-on' : 'actions-toggle-off'}" size="small"></typo3-backend-icon>
      ${this.label}
    `;
  }
}

customElements.define('editara-spotlight-toggle', EditaraSpotlightToggle);
