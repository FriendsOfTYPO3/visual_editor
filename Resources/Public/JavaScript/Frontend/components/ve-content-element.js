import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";
import {dragInProgressStore} from '@typo3/visual-editor/Frontend/stores/drag-store';
import {isDirectMode, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {openModal} from '@typo3/visual-editor/Frontend/components/ve-iframe-popup';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';

/**
 * @extends {HTMLElement}
 */
export class VeContentElement extends LitElement {
  static properties = {
    id: {type: String},
    elementName: {type: String},
    CType: {type: String},
    table: {type: String},
    uid: {type: Number},
    pid: {type: Number},
    colPos: {type: Number},
    tx_container_parent: {type: Number},
    isHidden: {type: Boolean},
    hiddenFieldName: {type: String},
    canModifyRecord: {type: Boolean},
    canBeMoved: {type: Boolean},

    dragInProgress: {type: Boolean, state: true, attribute: false},
    showElementOverlay: {type: Boolean, attribute: false},
  };

  get editContentUrl() {
    return window.veInfo.editContentUrl
      .replace('__TABLE__', this.table)
      .replace('__UID__', this.uid)
      .replace('__PAGE_ID__', this.pid);
  }

  get editContentContextualUrl() {
    return window.veInfo.editContentContextualUrl
      ?.replace('__TABLE__', this.table)
      ?.replace('__UID__', this.uid)
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
    sendMessage('openInMiddleFrame', this.editContentUrl);
  }

  async _toggleHidden() {
    if (this.hiddenFieldName) {
      dataHandlerStore.setData(this.table, this.uid, this.hiddenFieldName, !this.isHidden);
      this.isHidden = !this.isHidden;
    }
  }

  async _delete() {
    dataHandlerStore.addCmd(this.table, this.uid, 'delete', 1);
    this.remove();
  }

  _addAbove() {
    const newContentUrl = window.veInfo.newContentUrl
      .replace('__COL_POS__', this.colPos)
      .replace('__UID_PID__', -this.uid)
      .replace('__TX_CONTAINER_PARENT__', this.tx_container_parent);

    openModal(newContentUrl, lll('frontend.addContentElement') + ' ' + this.parentElement.columnName, 'large', 'ajax');
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
      const message = 'Use f:render.contentArea or f:mark.contentArea at this location!';
      const veError = document.createElement('ve-error');
      veError.setAttribute('text', message);
      this.appendChild(veError);
      throw new Error(message);
    }
  }

  /**
   * @param changedProperties {Map<PropertyKey, unknown>}
   */
  firstUpdated(changedProperties) {
    // overwrite pid attribute of parent ve-content-area to ensure it is correct even if slide=-1 is used
    this.parentElement.setAttribute('target', this.pid);

    if (this.hiddenFieldName) {
      dataHandlerStore.setInitialData(this.table, this.uid, this.hiddenFieldName, !!this.isHidden);
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
    const notAllowedChildTags = ['style', 'script', 'iframe'];
    const firstChildTagName = element.firstElementChild.tagName.toLowerCase();
    if (firstChildTagName.includes('-') || notAllowedChildTags.includes(firstChildTagName)) {
      console.warn(element, 've-content-element: Child element cannot be <' + firstChildTagName + '> please wrap it in a div or similar.');
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
    const statusBar = html`
      <ve-drag-handle
        table="${this.table}" uid="${this.uid}" CType="${this.CType}"
        class="button-bar ${this.isHidden ? 'hidden' : ''} ${this.dragInProgress ? 'dragAndDropActive' : ''}"
        isActive="${this.canBeMoved ? 'true' : 'false'}"
      >
        <span class="button-bar-headline" title="uid:${this.uid}">
                ${this.canBeMoved ? '⠿ ' : ''}${this.elementName}
              </span>
        <!-- TODO extract button bar as separate component -->
        ${
          this.editContentContextualUrl
            ? html`
              <typo3-backend-contextual-record-edit-trigger
                url="${this.editContentContextualUrl}"
                edit-url="${this.editContentUrl}"
                class="button"
              >
                <ve-icon name="actions-open"/>
              </typo3-backend-contextual-record-edit-trigger>
            `
            : html`
              <a class="button" href="${this.editContentUrl}" @click="${this._openEdit}">
                <ve-icon name="actions-open"/>
              </a>
            `
        }
        ${
          this.hiddenFieldName ?
            html`
              <a class="button" tabindex="0" @click="${this._toggleHidden}">
                <ve-icon name="${toggleIcon}"/>
              </a>
            ` : ''
        }
        <a class="button" tabindex="0" @click="${this._delete}">
          <ve-icon name="actions-delete"/>
        </a>
        ${
          window.veInfo.allowNewContent ? html`
            <a class="button" tabindex="0" @click="${this._addAbove}">
              <ve-icon name="actions-document-add"/>
            </a>
          ` : ''
        }
      </ve-drag-handle>`;

    return html`
      ${this.canModifyRecord ? statusBar : ''}
      <slot></slot><!-- slot must be top level to mitigate all CSS problems -->
      <ve-drop-zone
        table="${this.table}"
        uid="${this.uid}"
        target="${-this.uid}"
        colPos="${this.colPos}"
        allowedContentTypes="${this.parentElement.allowedContentTypes}"
        disallowedContentTypes="${this.parentElement.disallowedContentTypes}"
        columnName="${this.parentElement.columnName}"
        tx_container_parent="${this.tx_container_parent}"
      ></ve-drop-zone>
      <div class="border ${this.isHidden ? 'hidden' : ''} ${this.showElementOverlay ? 'showElementOverlay' : ''}"></div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      /* reset overflow as this breaks the drag handle */
      overflow: initial !important;
    }

    .border {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      z-index: 10;
      pointer-events: none;

      transition: 0.2s, box-shadow 0.2s, background-image 0.2s;
    }

    .border.hidden {
      background: rgba(0, 0, 0, 0.5);
    }

    .border.showElementOverlay {
      background-image: linear-gradient(to top, rgba(59, 158, 59, 0.90) 0%, transparent min(500px, max(100px, 50%)));
    }

    *:hover ~ .border,
    .border:hover,
    .border:has(~ *:hover) {
      outline: 1px solid #d1d1d1;
      outline-offset: 0;
      box-shadow: 0 0 40px 0 rgba(0, 0, 0, 0.5) inset, 0 0 40px 0 rgba(255, 255, 255, 0.5) inset;
    }

    .button-bar {
      display: flex;
      gap: 2px;
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

    .button-bar[isActive="true"] {
      cursor: grab;
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
