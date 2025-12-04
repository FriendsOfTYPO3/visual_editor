import {css, html, LitElement} from 'lit';
import {isDirectMode, sendMessage} from "../Shared/iframe-messaging.mjs";
import {useDataHandler} from "./api.mjs";

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
    hidden: {type: Boolean},
    hiddenFieldName: {type: String},
    // areaName: {type: String},
    showDropAreas: {type: Boolean, state: true, attribute: false},
    dragIsOverAbove: {type: Boolean, state: true, attribute: false},
    dragIsOverBelow: {type: Boolean, state: true, attribute: false},

    loading: {type: Boolean, state: true, attribute: true},
  };

  _openEdit() {
    // TODO open modal in Backend
    alert('EDIT not saved in DB');
  }

  async _toggleHidden() {
    this.loading = true;

    await useDataHandler({
      [this.table]: {
        [this.uid]: {
          [this.hiddenFieldName]: !this.hidden,
        }
      }
    });
    this.hidden = !this.hidden;

    this.loading = false;
  }

  async _delete() {
    this.loading = true;

    if (!confirm('Are you sure you want to delete this element?')) {
      this.loading = false;
      return;
    }

    await useDataHandler({}, {
      [this.table]: {
        [this.uid]: {
          delete: 1,
        }
      }
    })
    this.remove();
  }

  _alternativeActions() {
    // TODO implement alternative actions (the same as in the backend page/layout Module)
    alert('not implemented yet');
  }

  _addAbove() {
    alert('ADD ABOVE not implemented yet');
  }

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

    await useDataHandler({}, {
      [data.table]: {
        [data.uid]: {
          [event.dataTransfer.dropEffect]: {
            action: 'paste',
            target: position === 'above' ? this.pid : -this.uid,
            update: {
              colPos: this.colpos,
              sys_language_uid: this.sys_language_uid,
            },
          }
        }
      }
    });

    const sourceElement = document.getElementById(data.table + ':' + data.uid);
    if (event.dataTransfer.dropEffect === 'move') {
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

    // TODO make it possible to use <typo3-backend-icon> here
    const actionsToggleOff = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="1em">
        <g fill="currentColor">
          <path d="M5 5C3.3 5 2 6.3 2 8s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/>
          <path d="M11 4c2.2 0 4 1.8 4 4s-1.8 4-4 4H5c-2.2 0-4-1.8-4-4s1.8-4 4-4h6m0-1H5C2.2 3 0 5.2 0 8s2.2 5 5 5h6c2.8 0 5-2.2 5-5s-2.2-5-5-5z"/>
        </g>
      </svg>`;
    const actionsToggleOn = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="1em">
        <g fill="currentColor">
          <path d="M11 3H5C2.2 3 0 5.2 0 8s2.2 5 5 5h6c2.8 0 5-2.2 5-5s-2.2-5-5-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
        </g>
      </svg>`;

    const toggleIcon = this.hidden ? actionsToggleOff : actionsToggleOn;
    const actionsOpen = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="1em">
        <g fill="currentColor">
          <path
            d="m9.293 3.293-8 8A.997.997 0 0 0 1 12v3h3c.265 0 .52-.105.707-.293l8-8-3.414-3.414zM8.999 5l.5.5-5 5-.5-.5 5-5zM4 14H3v-1H2v-1l1-1 2 2-1 1zM13.707 5.707l1.354-1.354a.5.5 0 0 0 0-.707L12.354.939a.5.5 0 0 0-.707 0l-1.354 1.354 3.414 3.414z"/>
        </g>
      </svg>`;
    const actionsDelete = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="1em">
        <g fill="currentColor">
          <path d="M7 5H6v8h1zM10 5H9v8h1z"/>
          <path
            d="M13 3h-2v-.75C11 1.56 10.44 1 9.75 1h-3.5C5.56 1 5 1.56 5 2.25V3H3v10.75c0 .69.56 1.25 1.25 1.25h7.5c.69 0 1.25-.56 1.25-1.25V3zm-7-.75A.25.25 0 0 1 6.25 2h3.5a.25.25 0 0 1 .25.25V3H6v-.75zm6 11.5a.25.25 0 0 1-.25.25h-7.5a.25.25 0 0 1-.25-.25V4h8v9.75z"/>
          <path d="M13.5 4h-11a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1z"/>
        </g>
      </svg>
    `;
    const actionsMenuAlternative = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="1em">
        <g fill="currentColor">
          <path
            d="M8.5 9h-1c-.3 0-.5-.2-.5-.5v-1c0-.3.2-.5.5-.5h1c.3 0 .5.2.5.5v1c0 .3-.2.5-.5.5zM8.5 4h-1c-.3 0-.5-.2-.5-.5v-1c0-.3.2-.5.5-.5h1c.3 0 .5.2.5.5v1c0 .3-.2.5-.5.5zM8.5 14h-1c-.3 0-.5-.2-.5-.5v-1c0-.3.2-.5.5-.5h1c.3 0 .5.2.5.5v1c0 .3-.2.5-.5.5z"/>
        </g>
      </svg>
    `;
    const actionsDocumentAdd = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="1em">
        <g fill="currentColor">
          <path d="M7 14H2V2h12v5l1 1V1.5a.5.5 0 0 0-.5-.5h-13a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5H8l-1-1z"/>
          <path
            d="M3 3h10v2H3zM3 6h8l-1 1H3zM3 10h4l-1 1H3zM3 12h3v1H3zM3 8h6L8 9H3zM15.5 13H13v2.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5V13H8.5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5H11V8.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V11h2.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5z"/>
        </g>
      </svg>
    `;
    return html`
      <div class="border ${this.hidden ? 'hidden' : ''} ${this.loading ? 'loading' : ''}">
        <span class="button-bar ${this.showDropAreas ? 'dragAndDropActive' : ''}" draggable="true"
              @dragstart="${this._dragStart}"
              @dragend="${this._dragEnd}"
        >
          <span class="button-bar-headline" title="uid:${this.uid}">⠿ ${this.elementName}</span>
          <a class="button" @click="${this._openEdit}">${actionsOpen}</a><!-- TODO handle this should open popup with content element edit view-->
          <a class="button" @click="${this._toggleHidden}">${toggleIcon}</a>
          <a class="button" @click="${this._delete}">${actionsDelete}</a><!-- TODO handle this should open popup with content element edit view-->
          <a class="button" @click="${this._alternativeActions}">${actionsMenuAlternative}</a>
          <!-- TODO handle this should open popup with content element edit view-->
          <a class="button" @click="${this._addAbove}">${actionsDocumentAdd}</a><!-- TODO handle this should open popup with content element edit view-->
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
      outline-offset: 0px;
      box-shadow: 0 0 40px 0 rgba(0, 0, 0, 0.5) inset;
    }

    .border.loading:after {
      animation: textclip 0.6s infinite alternate ease-in-out;
      border-radius: 2px;
      background: rgba(0, 0, 0, 0.5);
      outline: 1px solid black;
    }

    @keyframes textclip {
      to {
        background: rgba(0, 0, 0, 0.95);
        outline: 1px solid white;
      }
    }

    .border.hidden {
      opacity: 0.5;
    }

    .border.hidden:after {
      background: rgba(0, 0, 0, 0.5);
    }

    /* TODO this dose not work, should be visible if the body is hovered */

    *:hover > .button-bar {
      opacity: 0.5;
    }

    .button-bar {
      display: flex;
      gap: 2px;
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

    .button-bar-headline {
      padding-right: 1em;
    }

    .button {
      display: inline-flex;
      color: white;
      border: 1px solid #666;
      border-radius: 0.2em;
      background-color: #444;
      padding: 0.2em 0.5em;
      text-decoration: none;
      cursor: pointer;
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
