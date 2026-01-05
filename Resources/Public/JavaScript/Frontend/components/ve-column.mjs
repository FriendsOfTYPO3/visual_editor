import {css, html, LitElement} from 'lit';

/**
 * @extends {HTMLElement}
 */
export class VeColumn extends LitElement {
  static properties = {
    target: {type: Number},
    colPos: {type: Number},
    sys_language_uid: {type: Number},
  };

  constructor() {
    super();
    // observe child changes and rerender this component
    const observer = new MutationObserver(() => {
      this.requestUpdate();
    });
    observer.observe(this, {childList: true});
  }

  render() {
    const newContentUrl = window.veInfo.newContentUrl
      .replace('__COL_POS__', this.colPos)
      .replace('__SYS_LANGUAGE_UID__', this.sys_language_uid)
      .replace('__UID_PID__', this.target);

    const columnHasChild = this.children.length > 0;
    const addButton = html`<div class="center">
      <ve-iframe-popup title="new Content" src="${newContentUrl}" type="ajax">
        <ve-icon name="actions-document-add" width="2em"></ve-icon>
        Create new Content
      </ve-iframe-popup>
    </div>`;
    return html`
      <div class="ve-column">
        ${(columnHasChild ? '' : addButton)}
        <ve-drop-zone
          table="tt_content"
          target="${this.target}"
          colPos="${this.colPos}"
          sys_language_uid="${this.sys_language_uid}"
        ></ve-drop-zone>
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
    }
    
    .ve-column {
      position: relative;
    }
    
    .center {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `;
}

customElements.define('ve-column', VeColumn);
