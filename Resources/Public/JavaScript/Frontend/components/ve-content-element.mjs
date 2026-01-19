import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";
import {dragInProgressStore} from "@typo3/visual-editor/Frontend/stores/drag-store.mjs";
import {isDirectMode, sendMessage} from "@typo3/visual-editor/Shared/iframe-messaging.mjs";
import {openModal} from "@typo3/visual-editor/Frontend/components/ve-iframe-popup.mjs";
import {dataHandlerStore} from "@typo3/visual-editor/Frontend/stores/data-handler-store.mjs";

/**
 * @extends {HTMLElement}
 */
export class VeContentElement extends LitElement {
  static properties = {
    id: {type: String},
    elementName: {type: String},
    table: {type: String},
    uid: {type: Number},
    pid: {type: Number},
    colPos: {type: Number},
    updateFields: {type: Object},
    isHidden: {type: Boolean},
    hiddenFieldName: {type: String},
    canModifyRecord: {type: Boolean},

    dragInProgress: {type: Boolean, state: true, attribute: false},
    showElementOverlay: {type: Boolean, attribute: false},
  };

  get editUrl() {
    return window.veInfo.editContentUrl
      .replace('__TABLE__', this.table)
      .replace('__UID__', this.uid)
      .replace('__PAGE_ID__', this.pid);
  }

  /**
   * @param {MouseEvent} event
   */
  _openEdit(event) {
    // if clicked with middle mouse button or ctrl/cmd key, open in new tab
    if (event.button === 1 || event.ctrlKey || event.metaKey || isDirectMode) {
      return;
    }
    event.preventDefault();
    sendMessage('openInMiddleFrame', this.editUrl);
  }

  async _toggleHidden() {
    if (this.hiddenFieldName) {
      dataHandlerStore.setData(this.table, this.uid, this.hiddenFieldName, !this.isHidden);
      this.isHidden = !this.isHidden;
    }
  }

  async _delete() {
    dataHandlerStore.setCmd(this.table, this.uid, 'delete', 1);
    this.remove();
  }

  _addAbove() {
    // TODO we need to create the content element above the current one (not below)

    const newContentUrl = window.veInfo.newContentUrl
      .replace('__COL_POS__', this.colPos)
      .replace('__SYS_LANGUAGE_UID__', this.updateFields.sys_language_uid)
      .replace('__UID_PID__', -this.uid);

    openModal(newContentUrl, lll('frontend.addContentElement'), 'large', 'ajax');
  }

  constructor() {
    super();

    dragInProgressStore.addEventListener('change', () => {
      if (!dragInProgressStore.value) {
        this.dragInProgress = false;
      }
      setTimeout(() => {
        // delay the dragInProgress set to true, so the drag handle can be "screenshot". (to create the drag ghost image) (otherwise the drag will immediately end in chromium based browsers)
        this.dragInProgress = !!dragInProgressStore.value;
      });

    });

    if (this.parentElement.tagName.toLowerCase() !== 've-content-area') {
      const message = 'Error: <ve-content-element> must be inside an <ve-content-area> element.';
      this.innerHTML = `<ve-error text="${message}"/>`;
      throw new Error(message);
    }
  }

  /**
   * @param changedProperties {Map<PropertyKey, unknown>}
   */
  firstUpdated(changedProperties) {
    if (this.hiddenFieldName) {
      dataHandlerStore.setInitialData(this.table, this.uid, this.hiddenFieldName, this.isHidden);
    }

    /** @type {HTMLElement} */
    const element = this;
    if (element.getAttribute('was')) {
      // already processed
      return;
    }

    if (element.childElementCount !== 1) {
      console.warn(element, 've-content-element: Expected exactly one child element, found ' + element.childElementCount);
      return;
    }
    const notAllowedChildTags = ['style', 'script', 'iframe', 've-content-element', 've-content-area', 've-drag-handle', 've-drop-zone'];
    if (notAllowedChildTags.includes(element.firstElementChild.tagName.toLowerCase())) {
      console.warn(element, 've-content-element: Child element cannot be <' + element.firstElementChild.tagName.toLowerCase() + '> please wrap it in a div or similar.');
      // set this.style.display = 'none'; if first child is also not visible
      const isChildVisible = !!(element.firstElementChild.offsetWidth || element.firstElementChild.offsetHeight || element.firstElementChild.getClientRects().length);
      if (!isChildVisible) {
        element.style.display = 'none';
      }
      return;
    }

    const child = element.firstElementChild;
    element.setAttribute('was', child.tagName.toLowerCase());
    const properties = Object.keys(element.constructor.properties).map(prop => prop.toLowerCase());
    for (const attributeName of child.getAttributeNames()) {
      if (!properties.includes(attributeName.toLowerCase())) {
        element.setAttribute(attributeName, child.getAttribute(attributeName));
      }
    }
    // put all children of child into element and remove child
    while (child.firstChild) {
      element.appendChild(child.firstChild);
    }
    child.remove();
  }

  render() {
    const toggleIcon = this.isHidden ? 'actions-toggle-off' : 'actions-toggle-on';
    return html`
      ${

        this.canModifyRecord ?
          html`
            <ve-drag-handle
              table="${this.table}" uid="${this.uid}"
              class="button-bar ${this.isHidden ? 'hidden' : ''} ${this.dragInProgress ? 'dragAndDropActive' : ''}"
            >
              <span class="button-bar-headline" title="uid:${this.uid}">⠿ ${this.elementName}</span>
              <!-- TODO extract button bar as separate component -->
              <a class="button" href="${this.editUrl}" @click="${this._openEdit}">
                <ve-icon name="actions-open"/>
              </a>
              ${
                this.hiddenFieldName ?
                  html`
                    <a class="button" @click="${this._toggleHidden}">
                      <ve-icon name="${toggleIcon}"/>
                    </a>
                  ` : ''
              }
              <a class="button" @click="${this._delete}">
                <ve-icon name="actions-delete"/>
              </a>
              <a class="button" @click="${this._addAbove}">
                <ve-icon name="actions-document-add"/>
              </a>
            </ve-drag-handle>` : ''
      }
      <slot></slot><!-- slot must be top level to mitigate all CSS problems -->
      <ve-drop-zone
        table="${this.table}"
        uid="${this.uid}"
        target="${-this.uid}"
        colPos="${this.colPos}"
        updateFields="${JSON.stringify(this.updateFields)}"
      ></ve-drop-zone>
      <div class="border ${this.isHidden ? 'hidden' : ''} ${this.showElementOverlay ? 'showElementOverlay' : ''}"></div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .border {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      pointer-events: none;

      transition: 0.2s, box-shadow 0.2s, background-image 0.2s;
    }

    .border.showElementOverlay {
      background-image: linear-gradient(to top, rgba(59, 158, 59, 0.90) 0%, transparent min(500px, max(100px, 50%)));
    }

    *:hover ~ .border,
    .border:hover,
    .border:has(~ *:hover) {
      outline: 1px solid #d1d1d1;
      outline-offset: 0px;
      box-shadow: 0 0 40px 0 rgba(0, 0, 0, 0.5) inset;
    }

    .border.hidden {
      background: rgba(0, 0, 0, 0.5);
    }

    .button-bar {
      display: flex;
      gap: 2px;
      cursor: grab;
      position: absolute;
      bottom: 100%;
      left: -1px;
      background: #171717;
      opacity: 0.001;
      /*opacity: 0.5;*/
      color: #d9d9d9;
      border: 1px solid #d9d9d9;
      padding: 4px;
      min-width: 200px;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
      z-index: 10100;
      font-size: 0.8em;

      transition: opacity 0.2s;
    }

    *:hover ~ .button-bar,
    .button-bar:hover,
    .button-bar:has(~ *:hover) {
      opacity: 1;
    }

    .button-bar.dragAndDropActive {
      display: none;
    }

    .button-bar.hidden {
      opacity: 0.5;
    }

    .button-bar-headline {
      padding-right: 1em;
    }

    .button {
      display: inline-flex;
      color: #d9d9d9;
      border: 1px solid transparent;
      border-radius: 0.2em;
      padding: 0.2em 0.5em;
      text-decoration: none;
      cursor: pointer;
      height: max-content;

      transition: border 0.2s;
    }

    .button:hover {
      border-color: #d9d9d9;
      background-color: #212121;
    }
  `;
}

customElements.define('ve-content-element', VeContentElement);
