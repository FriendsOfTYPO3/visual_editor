import {html, LitElement} from 'lit';
import {spotlightActive} from '@typo3/visual-editor/Shared/local-stores';


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
    this.onSpotlightChange = this.#onSpotlightChange.bind(this);
    this.onClick = this.#onClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    spotlightActive.addEventListener('change', this.onSpotlightChange);
    this.addEventListener('click', this.onClick);
  }

  disconnectedCallback() {
    spotlightActive.removeEventListener('change', this.onSpotlightChange);
    this.removeEventListener('click', this.onClick);

    super.disconnectedCallback();
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

  #onSpotlightChange() {
    this.active = spotlightActive.get();
  }

  #onClick(e) {
    e.preventDefault();

    this.active = !this.active;
    spotlightActive.set(this.active);
  }
}

customElements.define('ve-spotlight-toggle', VeSpotlightToggle);
