import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";

/**
 * @extends {HTMLElement}
 */
export class VeContentArea extends LitElement {
  static properties = {
    target: {type: Number},
    colPos: {type: Number},
    updateFields: {type: Object},

    showElementOverlay: {type: Boolean, attribute: false},
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
      .replace('__SYS_LANGUAGE_UID__', this.updateFields.sys_language_uid)
      .replace('__UID_PID__', this.target);

    const columnHasChild = this.children.length > 0;
    const addButton = html`<div class="center">
      <ve-iframe-popup title="new Content" src="${newContentUrl}" type="ajax">
        <ve-icon name="actions-document-add" width="2em"></ve-icon>
        ${lll('frontend.addContentElement')}
      </ve-iframe-popup>
    </div>`;
    return html`
      <div class="ve-content-area ${this.showElementOverlay ? 'showElementOverlay':''}">
        ${(columnHasChild ? '' : addButton)}
        <ve-drop-zone
          table="tt_content"
          target="${this.target}"
          colPos="${this.colPos}"
          updateFields="${this.updateFields}"
        ></ve-drop-zone>
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
    }
    
    .ve-content-area {
      position: relative;
    }

    .ve-content-area.showElementOverlay:after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      pointer-events: none;

      background-image: linear-gradient(to bottom, rgba(59, 158, 59, 0.90) 0%, transparent min(500px, max(100px, 50%)));
    }

    .center {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `;
}

customElements.define('ve-content-area', VeContentArea);
