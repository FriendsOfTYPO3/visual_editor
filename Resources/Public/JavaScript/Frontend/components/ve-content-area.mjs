import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";

/**
 * @extends {HTMLElement}
 */
export class VeContentArea extends LitElement {
  static properties = {
    target: {type: Number},
    colPos: {type: Number},
    allowedContentTypes: {type: String},
    disallowedContentTypes: {type: String},
    columnName: {type: String},
    tx_container_parent: {type: Number},

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

  firstUpdated(changedProperties) {
    /** @type {HTMLElement} */
    const element = this;
    if (element.getAttribute('was')) {
      // already processed
      return;
    }
    const parent = element.parentElement;

    const notAllowedParentTags = ['body'];
    const parentTagName = parent.tagName.toLowerCase();
    if (parentTagName.includes('-') || notAllowedParentTags.includes(parentTagName)) {
      console.warn(element, 've-content-area: Parent element cannot be <' + parentTagName + '> please wrap it in a div or similar.');
      return;
    }

    element.setAttribute('was', parentTagName);
    const properties = Object.keys(element.constructor.properties).map(prop => prop.toLowerCase());
    for (const attributeName of parent.getAttributeNames()) {
      if (!properties.includes(attributeName.toLowerCase())) {
        element.setAttribute(attributeName, parent.getAttribute(attributeName));
      }
    }

    // move every child into element (keep position before and after the element) and remove parent
    const oldFirstChild = element.firstChild
    let isAfterSelf = false;
    for (const child of Array.from(parent.childNodes)) {
      if (child === element) {
        isAfterSelf = true;
        continue;
      }
      if (isAfterSelf) {
        // insert inside element after all children:
        element.appendChild(child);
      } else {
        // insert before oldFirstChild:
        element.insertBefore(child, oldFirstChild);
      }
    }
    parent.replaceWith(element);
  }

  render() {
    const newContentUrl = window.veInfo.newContentUrl
      .replace('__COL_POS__', this.colPos)
      .replace('__UID_PID__', this.target)
      .replace('__TX_CONTAINER_PARENT__', this.tx_container_parent || 0);

    const columnHasChild = [...this.children].filter((element) => element.tagName.toLowerCase() === 've-content-element').length > 0;
    const label = lll('frontend.addContentElement') + ' ' + this.columnName;
    const addButton = html`
      <div class="center">
        <ve-iframe-popup title="${label}" src="${newContentUrl}" type="ajax">
          <ve-icon name="actions-document-add" width="2em"></ve-icon>
          ${label}
        </ve-iframe-popup>
      </div>`;
    const allowNew = window.veInfo.allowNewContent && !columnHasChild;
    return html`
      ${allowNew ? addButton : ''}
      <ve-drop-zone
        table="tt_content"
        target="${this.target}"
        colPos="${this.colPos}"
        allowedContentTypes="${(this.parentElement.parentElement.allowedContentTypes)}"
        disallowedContentTypes="${this.disallowedContentTypes}"
        columnName="${this.columnName}"
        tx_container_parent="${this.tx_container_parent}"
      ></ve-drop-zone>
      <slot></slot><!-- slot must be top level to mitigate all CSS problems -->
      <div class="ve-content-area ${this.showElementOverlay ? 'showElementOverlay' : ''}">
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .ve-content-area {
      display: none;
    }

    .ve-content-area.showElementOverlay {
      display: block;
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
