import {css, html, LitElement} from 'lit';

/**
 * @extends {HTMLElement}
 */
export class EditaraColumn extends LitElement {
  static properties = {
    target: {type: Number},
    colpos: {type: Number},
    sys_language_uid: {type: Number},
  };

  constructor() {
    super();
  }

  render() {
    return html`
      <div class="editara-column">
        <editara-drop-zone
          table="tt_content"
          target="${this.target}"
          colPos="${this.colpos}"
          sys_language_uid="${this.sys_language_uid}"
        ></editara-drop-zone>
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
    }
    
    .editara-column {
      position: relative;
    }
  `;
}

customElements.define('editara-column', EditaraColumn);
