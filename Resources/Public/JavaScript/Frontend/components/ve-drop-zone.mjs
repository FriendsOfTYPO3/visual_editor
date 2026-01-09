import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";
import {classMap} from 'lit/directives/class-map.js';
import {isDirectMode, sendMessage} from "@typo3/visual-editor/Shared/iframe-messaging.mjs";
import {useDataHandler} from "@typo3/visual-editor/Frontend/api.mjs";
import {dragInProgressStore} from "@typo3/visual-editor/Frontend/stores/drag-store.mjs";
import {flipInsertBefore} from "@typo3/visual-editor/Frontend/flip-insert-before.mjs";
import {dataHandlerStore} from "@typo3/visual-editor/Frontend/stores/data-handler-store.mjs";

/**
 * @extends {HTMLElement}
 */
export class VeDropZone extends LitElement {
  static properties = {
    table: {type: String},

    target: {type: Number},
    colPos: {type: Number},
    updateFields: {type: Number},

    show: {type: Boolean, state: true, attribute: false},
    isDragHovering: {type: Number, state: true, attribute: false},
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


    const firstParent = findFirstParent(['ve-content-element', 've-content-area'], this.parentElement);
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
    this.isDragHovering = 0;

    dragInProgressStore.addEventListener('change', () => {
      this.show = this.shouldShow();
    });
  }

  /**
   * @param {DragEvent} event
   */
  _dragOver(event) {
    const isVEDrag = event.dataTransfer.types.includes('text/ve-drag');
    if (isVEDrag) {
      event.preventDefault();
    }
  }

  /**
   * @param {DragEvent} event
   */
  _dragEnter(event) {
    this.isDragHovering++;
  }

  /**
   * @param {DragEvent} event
   */
  _dragLeave(event) {
    // Sometimes dragleave is triggered when entering child elements, so we count the enters and leaves
    this.isDragHovering--;
    if (this.isDragHovering < 0) {
      this.isDragHovering = 0;
    }
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
        ...this.updateFields,
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


    this.isDragHovering = 0; // reset

    const firstParent = findFirstParent(['ve-content-element', 've-content-area'], this.parentElement);

    if (!firstParent) {
      throw new Error('Cannot find parent ve-content-element or ve-content-area for drop zone');
    }
    const sourceElement = document.getElementById(data.table + ':' + data.uid);
    if (!sourceElement) {
      throw new Error('Cannot find source element for drop operation: ' + data.table + ':' + data.uid);
    }
    sourceElement.setAttribute('colPos', this.colPos);
    sourceElement.setAttribute('updateFields', this.updateFields);

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
    if(this.error) {
      return html`<ve-error text="${this.error}"/>`;
    }
    const classes = {
      dropArea: true,
      visible: this.show,
      isOver: this.isDragHovering > 0,
      above: this.target >= 0,
    };

    return html`
      <div class=${classMap(classes)}
           @dragover="${this._dragOver}"
           @dragenter="${this._dragEnter}"
           @dragleave="${this._dragLeave}"
           @drop="${this._drop}"
      >
        <ve-icon name="apps-pagetree-drag-move-into" width="2em"/>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
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

      left: 0;
      right: 0;
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

      bottom: calc((var(--height) + 4px) * -1);

      &.visible {
        display: flex;
      }

      &.isOver {
        background-color: #3b9e3b;
        outline: 2px solid #aaa;
      }

      &.above {
        bottom: initial;
        top: calc((var(--height) + 4px) * -1);
      }
    }
  `;

  /**
   * @param {string} table
   * @param {number} uid
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isAnyOfMyParents(table, uid, element = this.parentElement) {
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
