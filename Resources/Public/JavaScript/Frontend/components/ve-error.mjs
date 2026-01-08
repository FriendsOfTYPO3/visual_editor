import {css, LitElement} from 'lit';

/**
 * @extends {HTMLElement}
 */
export class VeError extends LitElement {
  static properties = {
    text: {type: String},
  };

  render() {
    return this.text;
  }

  static styles = css`
    :host {
      display: inline-block;
      color: white;
      font-weight: bold;
      padding: 20px;
      border: solid 5px red;
      background: #780000;
    }
  `;
}

customElements.define('ve-error', VeError);
