import {css, html, LitElement} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {isDirectMode, sendMessage} from "@andersundsehr/editara/Shared/iframe-messaging.mjs";
import {useDataHandler} from "@andersundsehr/editara/Frontend/api.mjs";
import {dragInProgressStore} from "@andersundsehr/editara/Frontend/stores/drag-store.mjs";
import {flipInsertBefore} from "@andersundsehr/editara/Frontend/flip-insert-before.mjs";

/**
 * @extends {HTMLElement}
 */
export class EditableDropZone extends LitElement {
  static properties = {
    table: {type: String},

    target: {type: Number},
    colPos: {type: Number},
    sys_language_uid: {type: Number},

    show: {type: Boolean, state: true, attribute: false},
    isOver: {type: Number, state: true, attribute: false},
  };

  get uid() {
    return this.target < 0 ? -this.target : 0;
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


    const firstParent = findFirstParent(['editara-content-element', 'editara-column'], this.parentElement);
    if (!firstParent) {
      const message = 'ERROR: Cannot find parent <editara-content-element> or <editara-column> for drop zone';
      this.innerHTML = `<editara-error text="${message}"/>`;
      throw new Error(message);
    }

    switch (firstParent.tagName.toLowerCase()) {
      case 'editara-content-element':
        // my parent is a editara-content-element and the nextSibling of that is the dragged element => do not show drop zone (return false)
        if (firstParent.nextSibling) {
          const nextSibling = firstParent.nextElementSibling;
          if (nextSibling && nextSibling.tagName.toLowerCase() === 'editara-content-element') {
            if (nextSibling.table === data.table && nextSibling.uid === data.uid) {
              return false;
            }
          }
        }
        break;
      case 'editara-column':
        // my parent is a editara-column and the firstSibling is the dragged element => do not show drop zone (return false)
        if (firstParent.firstChild) {
          const firstChild = firstParent.firstElementChild;
          if (firstChild && firstChild.tagName.toLowerCase() === 'editara-content-element') {
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
    this.isOver = 0;

    dragInProgressStore.addEventListener('change', () => {
      this.show = this.shouldShow();
    });
  }

  /**
   * @param {DragEvent} event
   */
  _dragOver(event) {
    const isEditaraDrag = event.dataTransfer.types.includes('text/editara-drag');
    if (isEditaraDrag) {
      event.preventDefault();
    }
  }

  /**
   * @param {DragEvent} event
   */
  _dragEnter(event) {
    this.isOver++;
  }

  /**
   * @param {DragEvent} event
   */
  _dragLeave(event) {
    // Sometimes dragleave is triggered when entering child elements, so we count the enters and leaves
    this.isOver--;
    if (this.isOver < 0) {
      this.isOver = 0;
    }
  }

  /**
   * @param {DragEvent} event
   */
  async _drop(event) {
    const dataString = event.dataTransfer.getData('text/editara-drag');
    if (!dataString) {
      return;
    }
    event.preventDefault();
    const data = JSON.parse(dataString);


    const cmd = {
      [data.table]: {
        [data.uid]: {
          [event.dataTransfer.dropEffect]: {
            action: 'paste',
            target: this.target,
            update: {
              colPos: this.colPos,
              sys_language_uid: this.sys_language_uid,
            },
          }
        }
      }
    };
    await useDataHandler({}, cmd);

    this.isOver = 0; // reset

    if (event.dataTransfer.dropEffect === 'move') {
      const firstParent = findFirstParent(['editara-content-element', 'editara-column'], this.parentElement);

      if (!firstParent) {
        throw new Error('Cannot find parent editara-content-element or editara-column for drop zone');
      }
      const sourceElement = document.getElementById(data.table + ':' + data.uid);
      if (!sourceElement) {
        throw new Error('Cannot find source element for drop operation: ' + data.table + ':' + data.uid);
      }
      switch (firstParent.tagName.toLowerCase()) {
        case 'editara-content-element':
          // append after the area brick
          flipInsertBefore(firstParent.parentNode, sourceElement, firstParent.nextSibling);
          return;
        case 'editara-column':
          // append as first child of the column
          flipInsertBefore(firstParent, sourceElement, firstParent.firstChild);
          return;
      }
    }

    // For copy we just reload the page to show the new element
    if (isDirectMode) {
      window.location.reload();
      return;
    }
    sendMessage('reloadFrames');
  }

  render() {
    const classes = {
      dropArea: true,
      visible: this.show,
      isOver: this.isOver > 0,
      above: this.target >= 0,
    };
    return html`
      <div class=${classMap(classes)}
           @dragover="${this._dragOver}"
           @dragenter="${this._dragEnter}"
           @dragleave="${this._dragLeave}"
           @drop="${this._drop}"
      >
        <editara-icon name="apps-pagetree-drag-move-into" width="2em"/>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
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
    if (element instanceof EditableDropZone) {
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

customElements.define('editara-drop-zone', EditableDropZone);
