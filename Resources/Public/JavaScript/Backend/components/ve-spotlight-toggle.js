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
    this.onKeydown = this.#onKeydown.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    spotlightActive.addEventListener('change', this.onSpotlightChange);
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback() {
    spotlightActive.removeEventListener('change', this.onSpotlightChange);
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeydown);

    super.disconnectedCallback();
  }

  willUpdate(changedProperties) {
    this.classList.toggle('btn-primary', this.active);
    this.classList.toggle('active', this.active);
    this.classList.toggle('btn-default', !this.active);
    this.setAttribute('role', 'switch');
    this.setAttribute('aria-checked', String(this.active));
    this.setAttribute('aria-label', this.label);
    this.tabIndex = 0;
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

  #onKeydown(e) {
    if (e.key !== 'Enter' && e.key !== ' ') {
      return;
    }
    e.preventDefault();
    this.#onClick(e);
  }
}

customElements.define('ve-spotlight-toggle', VeSpotlightToggle);
