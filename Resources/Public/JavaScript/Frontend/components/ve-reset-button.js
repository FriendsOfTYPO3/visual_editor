import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";

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
            border-radius: 0.2em;
        }

        button:focus-visible {
            outline: 2px solid #5432fe;
            outline-offset: 2px;
        }
    `;

  _click() {
    this.dispatchEvent(new Event('click', {
      bubbles: true, composed: true
    }));
  }

  render() {
    const label = lll('frontend.resetChanges');
    return html`
      <button type="button" @click="${this._click}" title="${label}" aria-label="${label}">
        <ve-icon name="actions-undo" width="100%"/>
      </button>
    `;
  }
}

customElements.define('ve-reset-button', VeResetButton);
