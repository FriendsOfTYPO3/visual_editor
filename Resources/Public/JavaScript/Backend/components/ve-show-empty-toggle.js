import {html, LitElement} from 'lit';
import {sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {showEmptyActive} from '@typo3/visual-editor/Shared/local-stores';

/**
 * @extends {HTMLElement}
 */
export class VeShowEmptyToggle extends LitElement {
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
    this.onShowEmptyChange = this.#onShowEmptyChange.bind(this);
    this.onClick = this.#onClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    showEmptyActive.addEventListener('change', this.onShowEmptyChange);
    this.addEventListener('click', this.onClick);
  }

  disconnectedCallback() {
    showEmptyActive.removeEventListener('change', this.onShowEmptyChange);
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
      <typo3-backend-icon identifier="${this.active ? 'actions-eye' : 'actions-hyphen'}" size="small"></typo3-backend-icon>
      ${this.label}
    `;
  }

  #onShowEmptyChange() {
    this.active = showEmptyActive.get();
  }

  #onClick(e) {
    e.preventDefault();

    this.active = !this.active;
    showEmptyActive.set(this.active);
    sendMessage('showEmpty', this.active);
  }
}

customElements.define('ve-show-empty-toggle', VeShowEmptyToggle);
