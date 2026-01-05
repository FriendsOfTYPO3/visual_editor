import {html, LitElement} from 'lit';
import {spotlightActive} from "@typo3/visual-editor/Shared/local-store.js";


/**
 * @extends {HTMLElement}
 */
export class VeSpotlightToggle extends LitElement {
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
    this.active = spotlightActive.get();

    spotlightActive.addEventListener('currentWindowChange', () => {
      this.active = spotlightActive.get();
    });

    this.addEventListener('click', (e) => {
      e.preventDefault();

      this.active = !this.active;
      spotlightActive.set(this.active);
    })
  }

  willUpdate(changedProperties) {
    this.classList.toggle('btn-primary', this.active);
    this.classList.toggle('active', this.active);
    this.classList.toggle('btn-default', !this.active);
  }

  render() {
    return html`
      <typo3-backend-icon identifier="${this.active ? 'actions-lightbulb-on' : 'actions-lightbulb'}" size="small"></typo3-backend-icon>
      ${this.label}
    `;
  }
}

customElements.define('ve-spotlight-toggle', VeSpotlightToggle);
