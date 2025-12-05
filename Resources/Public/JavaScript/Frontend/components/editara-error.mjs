import {css, html, LitElement} from 'lit';

/**
 * @extends {HTMLElement}
 */
export class EditaraError extends LitElement {
  static properties = {
    text: {type: String},
  };

  render() {
    return html`
      ${this.text}
    `;
  }

  static styles = css`
    :host {
      color: white;
      font-weight: bold;
      padding: 20px;
      border: solid 5px red;
      background: #780000;
    }
  `;
}

customElements.define('editara-error', EditaraError);
