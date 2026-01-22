import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";
import {classMap} from 'lit/directives/class-map.js';
import {isDirectMode, sendMessage} from "@typo3/visual-editor/Shared/iframe-messaging.mjs";
import {useDataHandler} from "@typo3/visual-editor/Frontend/api.mjs";
import {dragInProgressStore} from "@typo3/visual-editor/Frontend/stores/drag-store.mjs";
import {flipInsertBefore} from "@typo3/visual-editor/Frontend/flip-insert-before.mjs";
import {dataHandlerStore} from "@typo3/visual-editor/Frontend/stores/data-handler-store.mjs";
import {autoNoOverlap, calculateAllDebounced} from "@typo3/visual-editor/Frontend/auto-no-overlap.mjs";

/**
 * @extends {HTMLElement}
 */
export class VeDropZone extends LitElement {
  static properties = {
    table: {type: String},

    target: {type: Number},
    colPos: {type: Number},
    tx_container_parent: {type: Number},

    show: {type: Boolean, state: true, attribute: false},
    isDragHovering: {type: Boolean, state: true, attribute: false},
    error: {type: String, state: true, attribute: false},
  };

  get uid() {
    return this.target < 0 ? -this.target : 0;
  }

  get isTop() {
    return this.target >= 0;
  }

  shouldShow() {
    const data = dragInProgressStore.value;
    if (!data) {
      return false;
    }

    if (data.uid === this.uid && data.table === this.table) {
      return false;
    }

    if (this.isAnyOfMyParents(data.table, data.uid)) {
      return false;
    }


    const firstParent = findFirstParent(['ve-content-element', 've-content-area'], this);
    if (!firstParent) {
      this.error = 'ERROR: Cannot find parent <ve-content-element> or <ve-content-area> for drop zone';
      throw new Error(message);
    }

    switch (firstParent.tagName.toLowerCase()) {
      case 've-content-element':
        // my parent is a ve-content-element and the nextSibling of that is the dragged element => do not show drop zone (return false)
        if (firstParent.nextSibling) {
          const nextSibling = firstParent.nextElementSibling;
          if (nextSibling && nextSibling.tagName.toLowerCase() === 've-content-element') {
            if (nextSibling.table === data.table && nextSibling.uid === data.uid) {
              return false;
            }
          }
        }
        break;
      case 've-content-area':
        // my parent is a ve-content-area and the firstSibling is the dragged element => do not show drop zone (return false)
        if (firstParent.firstChild) {
          const firstChild = firstParent.firstElementChild;
          if (firstChild && firstChild.tagName.toLowerCase() === 've-content-element') {
            if (firstChild.table === data.table && firstChild.uid === data.uid) {
              return false;
            }
          }
        }
        break;
    }

    return true;
  }

  constructor() {
    super();
    this.isDragHovering = false;

    dragInProgressStore.addEventListener('change', () => {
      const newValue = this.shouldShow();
      if (this.show !== newValue) {
        setTimeout(calculateAllDebounced);
      }
      this.show = newValue;
    });
  }

  firstUpdated(changedProperties) {
    autoNoOverlap(this.shadowRoot.querySelector('.dropArea'), 've-drop-zone');
  }

  /**
   * @param {DragEvent} event
   */
  _dragOver(event) {
    const isVEDrag = event.dataTransfer.types.includes('text/ve-drag');
    if (isVEDrag) {
      event.preventDefault();
    }
    this.isDragHovering = true;
    // fallback timeout to reset the hovering state
    this.dragOverTimeout && clearTimeout(this.dragOverTimeout);
    this.dragOverTimeout = setTimeout(() => {
      this.isDragHovering = false;
    }, 200);
  }

  /**
   * @param {DragEvent} event
   */
  _dragEnter(event) {
    this.isDragHovering = true;
  }

  /**
   * @param {DragEvent} event
   */
  _dragLeave(event) {
    this.isDragHovering = false;
  }

  /**
   * @param {DragEvent} event
   */
  async _drop(event) {
    const dataString = event.dataTransfer.getData('text/ve-drag');
    if (!dataString) {
      return;
    }
    event.preventDefault();
    const data = JSON.parse(dataString);

    const actionData = {
      action: 'paste',
      target: this.target,
      update: {
        colPos: this.colPos,
        ...(
          Number.isInteger(this.tx_container_parent)
            ? {tx_container_parent: this.tx_container_parent}
            : {}
        )
      },
    };

    if (event.dataTransfer.dropEffect === 'copy') {
      // For copy we ask the user and if confirmed we do an immediate call useDataHandler
      // if not, we do nothing
      const question = dataHandlerStore.changesCount > 0 ? lll('frontend.confirmCopy.saveAll') : lll('frontend.confirmCopy');
      // TODO use modal dialog from core
      const confirmCopy = confirm(question);
      if (!confirmCopy) {
        return;
      }

      dataHandlerStore.setCmd(data.table, data.uid, event.dataTransfer.dropEffect, actionData);
      await useDataHandler(dataHandlerStore.data, dataHandlerStore.cmd);
      dataHandlerStore.markSaved();

      if (isDirectMode) {
        window.location.reload();
        return;
      }
      sendMessage('reloadFrames');
      return;
    }

    dataHandlerStore.setCmd(data.table, data.uid, event.dataTransfer.dropEffect, actionData);


    this.isDragHovering = false; // reset

    const firstParent = findFirstParent(['ve-content-element', 've-content-area'], this);

    if (!firstParent) {
      throw new Error('Cannot find parent ve-content-element or ve-content-area for drop zone');
    }
    const sourceElement = document.getElementById(data.table + ':' + data.uid);
    if (!sourceElement) {
      throw new Error('Cannot find source element for drop operation: ' + data.table + ':' + data.uid);
    }
    sourceElement.setAttribute('colPos', this.colPos);
    sourceElement.setAttribute('tx_container_parent', this.tx_container_parent);

    switch (firstParent.tagName.toLowerCase()) {
      case 've-content-element':
        // append after the area brick
        flipInsertBefore(firstParent.parentNode, sourceElement, firstParent.nextSibling);
        return;
      case 've-content-area':
        // append as first child of the column
        flipInsertBefore(firstParent, sourceElement, firstParent.firstChild);
        return;
    }
  }

  render() {
    if (this.error) {
      return html`
        <ve-error text="${this.error}"/>`;
    }
    const classes = {
      dropArea: true,
      visible: this.show,
      isOver: this.isDragHovering,
      above: this.target >= 0,
    };

    const firstParent = findFirstParent(['ve-content-element', 've-content-area'], this);
    if (firstParent) {
      firstParent.showElementOverlay = this.isDragHovering;
    }

    // Text for debugging purposes only
    let text = html``;
    if (this.target < 0) {
      const name = this.getComponentName(this.target * -1);
      text = html`${text} <small>after</small> <b>${name}</b>`; // TODO label
    }
    if (this.tx_container_parent || this.colPos > 99) {
      // EXT:container + EXT:flux support
      const uidOfParent = this.tx_container_parent || parseInt(this.colPos / 100);
      const nameOfParent = this.getComponentName(uidOfParent);
      text = html`${text} <small>in</small> <b>${nameOfParent}</b>`; // TODO label
    }
    text = html`${text} <small>in column</small> <b>${this.colPos % 100}</b>`; // TODO label

    return html`
      <div class=${classMap(classes)}
           @dragover="${this._dragOver}"
           @dragenter="${this._dragEnter}"
           @dragleave="${this._dragLeave}"
           @drop="${this._drop}"
      >
        <ve-icon name="apps-pagetree-drag-move-into" width="2em"></ve-icon>
        <span>${text}</span>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      /* do not interfere with the grid of the parent */
      grid-column: 1 / -1;
      grid-row: 1 / -1;
      order: 100000;
    }

    .add-button {
      border-radius: 0.2em;
      border: black solid 1px;
      color: white;
      background: rgba(0, 0, 0, 0.5);
      padding: 0.5em;
      width: fit-content;
      cursor: pointer;
    }

    .dropArea {
      --height: 30px;
      display: none;
      position: absolute;
      height: var(--height);

      left: 1px;
      right: 1px;
      /*backdrop-filter: invert(100%);*/
      background-color: rgba(34, 34, 34, 0.8);
      outline: 1px dashed #666;
      border-radius: 0.2em;
      color: #eee;

      gap: 5px;
      /* text centered*/
      align-items: center;
      justify-content: center;

      z-index: 10000;

      bottom: calc(var(--height) * -1 + var(--auto-no-overlap-padding, 0px));

      &.visible {
        display: flex;
      }

      &.isOver {
        background-color: #3b9e3b;
        outline: 2px solid #aaa;
      }

      &.above {
        bottom: calc(100% + var(--auto-no-overlap-padding, 0px));
      }
    }
  `;

  /**
   * @param {string} table
   * @param {number} uid
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isAnyOfMyParents(table, uid, element = this.parentElement || this.parentNode.host) {
    if (element instanceof VeDropZone) {
      if (element.table === table && element.uid === uid) {
        return true;
      }
    }
    const parentElement = element.parentElement;
    if (!parentElement) {
      return false;
    }
    return this.isAnyOfMyParents(table, uid, parentElement);
  }

  /**
   * @param uid {number}
   * @return {string}
   */
  getComponentName(uid) {
    const element = document.querySelector('ve-content-element[id="' + this.table + ':' + uid + '"]');
    if (!element) {
      return 'element not found';
    }
    return element.getAttribute('elementName');
  }
}

/**
 * @param {string[]} tagNamesToFind
 * @param {HTMLElement} element
 * @return {HTMLElement}
 */
function findFirstParent(tagNamesToFind, element) {
  if (tagNamesToFind.includes(element.tagName.toLowerCase())) {
    return element;
  }
  const parentElement = element.parentNode;
  if (!parentElement) {
    return null;
  }
  if (parentElement instanceof ShadowRoot) {
    return findFirstParent(tagNamesToFind, parentElement.host);
  }
  return findFirstParent(tagNamesToFind, parentElement);
}

customElements.define('ve-drop-zone', VeDropZone);
