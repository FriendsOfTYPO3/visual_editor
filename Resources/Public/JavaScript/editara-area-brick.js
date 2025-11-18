import {css, html, LitElement} from 'lit';

/**
 * @extends {HTMLElement}
 */
export class EditableAreaBrick extends LitElement {
  static properties = {
    areaName: {type: String},
    uid: {type: Number},
    parentUid: {type: Number},
    templateName: {type: String},
  };

  firstUpdated() {
  }

  render() {
    return html`
      <div class="border">
        <span class="button-bar">🍔${this.templateName}</span>
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .border {
      position: relative;
      z-index: 10000;
    }

    .border:hover {
      box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.5) inset;
      backdrop-filter: invert(10%);
    }

    .button-bar {
      position: absolute;
      bottom: 100%;
      left: 0;
      background: #000;
      opacity: 0.5;
      color: white;
      padding: 4px;
      min-width: 200px;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }

    .border:hover .button-bar {
      opacity: 1;
    }
  `;
}

customElements.define('editara-area-brick', EditableAreaBrick);
