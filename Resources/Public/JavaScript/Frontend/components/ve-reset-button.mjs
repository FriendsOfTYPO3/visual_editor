import {css, html, LitElement} from 'lit';

/**
 * @extends {HTMLElement}
 */
export class VeResetButton extends LitElement {

  static styles = css`
        button {
            display: flex;
            background: none;
            color: inherit;
            border: none;
            padding: 0;
            font: inherit;
            cursor: pointer;
            outline: inherit;
        }
    `;

  _click() {
    this.dispatchEvent(new Event('click', {
      bubbles: true, composed: true
    }));
  }

  render() {
    return html`
      <button @click="${this._click}" title="Reset changes">
        <ve-icon name="actions-undo" width="100%"/>
      </button>
    `;
  }
}

customElements.define('ve-reset-button', VeResetButton);
