import {css, html, LitElement} from 'lit';
import {isDirectMode, sendMessage} from "../Shared/iframe-messaging.mjs";

class Store extends EventTarget {
  #data = null;

  constructor(initialValue) {
    super();
    this.#data = initialValue;
  }

  get value() {
    return this.#data;
  }

  set value(value) {
    this.#data = value;
    this.dispatchEvent(new Event('change'));
  }
}

const dragInProgressStore = new Store(false);

/**
 * @extends {HTMLElement}
 */
export class EditableAreaBrick extends LitElement {
  static properties = {
    elementName: {type: String},
    table: {type: String},
    uid: {type: Number},
    pid: {type: Number},
    colpos: {type: Number},
    sys_language_uid: {type: Number},
    // areaName: {type: String},
    showDropAreas: {type: Boolean, state: true, attribute: false},
    dragIsOverAbove: {type: Boolean, state: true, attribute: false},
    dragIsOverBelow: {type: Boolean, state: true, attribute: false},
  };

  constructor() {
    super();

    dragInProgressStore.addEventListener('change', () => {
      const data = dragInProgressStore.value;
      this.dragIsOverAbove = false;
      this.dragIsOverBelow = false;
      if (!data) {
        this.showDropAreas = false;
        return;
      }

      if (data.uid === this.uid && data.table === this.table) {
        this.showDropAreas = false;
        return;
      }

      if (this.isAnyOfMyParents(data.table, data.uid)) {
        this.showDropAreas = false;
        return;
      }

      this.showDropAreas = true;
    });
  }


  /**
   * @param {DragEvent} event
   */
  _dragStart(event) {
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.clearData();

    const info = {
      table: this.table,
      uid: this.uid,
    };
    event.dataTransfer.setData('text/editara-drag', JSON.stringify(info));

    dragInProgressStore.value = info;
  }

  /**
   * @param {DragEvent} event
   */
  _dragOver(event) {
    if (!this.canDropHere(event)) {
      return;
    }
    event.preventDefault();
  }

  canDropHere(event) {
    const dataString = event.dataTransfer.getData('text/editara-drag');
    if (!dataString) {
      return false;
    }
    const data = JSON.parse(dataString);
    if (data.uid === this.uid && data.table === this.table) {
      // Prevent dropping on itself
      return false;
    }
    if (this.isAnyOfMyParents(data.table, data.uid)) {
      // Prevent dropping a parent into one of its children
      return false;
    }
    return true;
  }

  /**
   * @param {DragEvent} event
   * @param {'above'|'below'} position
   */
  _dragEnter(event, position) {
    if (!this.canDropHere(event)) {
      return;
    }
    if (position === 'above') {
      this.dragIsOverAbove = true;
    } else {
      this.dragIsOverBelow = true;
    }
  }

  /**
   * @param {DragEvent} event
   * @param {'above'|'below'} position
   */
  _dragLeave(event, position) {
    if (position === 'above') {
      this.dragIsOverAbove = false;
    } else {
      this.dragIsOverBelow = false;
    }
  }

  /**
   * @param {DragEvent} event
   * @param {'above'|'below'} position
   */
  async _drop(event, position) {
    const dataString = event.dataTransfer.getData('text/editara-drag');
    if (!dataString) {
      return;
    }
    event.preventDefault();
    const data = JSON.parse(dataString);

    const sendToServer = {
      [event.dataTransfer.dropEffect]: {
        table: data.table,
        uid: data.uid,
        target: position === 'above' ? this.pid : -this.uid,
        colPos: this.colpos,
        sysLanguageUid: this.sys_language_uid,
      }
    }
    // TODO reduce duplicate content, here and in editara-save-button.mjs
    const response = await fetch(window.location.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendToServer),
    });

    if (!response.ok) {
      document.body.innerHTML = await response.text();
      return;
    }


    const sourceElement = document.getElementById(data.table + ':' + data.uid);
    if(event.dataTransfer.dropEffect === 'move') {
      if (position === 'above') {
        this.parentNode.insertBefore(sourceElement, this);
      } else {
        this.parentNode.insertBefore(sourceElement, this.nextSibling);
      }
      return;
    }
    // For copy we just reload the page to show the new element

    if (isDirectMode) {
      window.location.reload();
      return;
    }
    // window.location.hash = '#cc' + data.uid; // TODO handle this from the parent, put the content element in the center of the screen after the reload!
    sendMessage('reloadFrames');
  }

  /**
   * @param {DragEvent} event
   */
  _dragEnd(event) {
    dragInProgressStore.value = false;
  }

  firstUpdated() {
  }

  render() {
    const hasPrecedingSibling = this.parentElement && this.parentElement.firstElementChild !== this && this.parentElement.firstElementChild instanceof EditableAreaBrick;

    /**
     * @param {'above'|'below'} position
     */
    const dropArea = (position) => {
      const active = this.showDropAreas ? 'active' : '';
      const over = (position === 'above' ? this.dragIsOverAbove : this.dragIsOverBelow) ? 'over' : '';
      return html`
        <div class="dropArea ${position} ${active} ${over}"
             @dragover="${this._dragOver}"
             @dragenter="${(e) => this._dragEnter(e, position)}"
             @dragleave="${(e) => this._dragLeave(e, position)}"
             @drop="${(e) => this._drop(e, position)}"
        >
          DROP HERE
        </div>`;
    };

    const dropAreaAbove = hasPrecedingSibling ? () => null : dropArea;
    return html`
      <div class="border">
        <span class="button-bar ${this.showDropAreas ? 'dragAndDropActive' : ''}" draggable="true"
              @dragstart="${this._dragStart}"
              @dragend="${this._dragEnd}"
        >
          <span title="uid:${this.uid}">⠿ ${this.elementName}</span>
          <a class="button" href="">✏️</a><!-- TODO handle this should open popup with content element edit view-->
        </span>
        ${dropAreaAbove('above')}
        <slot></slot>
        ${dropArea('below')}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .border {
      position: relative;
    }

    .border:after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      pointer-events: none;
    }

    .border:hover:after {
      outline: 2px ridge black;
      outline-offset: 2px;
      box-shadow: 0 0 40px 0 rgba(0, 0, 0, 0.5) inset;
    }

    /* TODO this dose not work, should be visible if the body is hovered */
    *:hover > .button-bar {
      opacity: 0.5;
    }

    .button-bar {
      cursor: grab;
      position: absolute;
      bottom: 100%;
      left: 0;
      background: #000;
      opacity: 0.001;
      /*opacity: 0.5;*/
      color: white;
      padding: 4px;
      min-width: 200px;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
      z-index: 10100;
    }

    .border:hover .button-bar:not(.dragAndDropActive) {
      opacity: 1;
    }

    .button-bar.dragAndDropActive {
      display: none;
    }

    .button {
      color: white;
      border: 1px solid #666;
      border-radius: 0.2em;
      background-color: #444;
      padding: 0.2em 0.5em;
      text-decoration: none;
    }

    .button:hover {
      border: 1px solid #888;
      background-color: #666;
    }

    .dropArea {
      display: none;
      position: absolute;
      height: 20px;

      left: 0;
      right: 0;
      /*backdrop-filter: invert(100%);*/
      background-color: #222;
      outline: 1px dashed #666;
      border-radius: 0.2em;
      color: #eee;

      /* text centered*/
      align-items: center;
      justify-content: center;

      z-index: 10000;

      &.active {
        display: flex;
      }

      &.over {
        background-color: #3b9e3b;
        outline: 2px solid #aaa;
      }

      &.above {
        top: -22px;
      }

      &.below {
        bottom: -22px;
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
    if (element instanceof EditableAreaBrick) {
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

customElements.define('editara-area-brick', EditableAreaBrick);
