import {css, html, LitElement} from 'lit';
import {dragInProgressStore} from "@andersundsehr/editara/Frontend/stores/drag-store.mjs";

/**
 * @extends {HTMLElement}
 */
export class EditaraDragHandle extends LitElement {
  static properties = {
    table: {type: String},
    uid: {type: Number},
  };

  constructor() {
    super();

    /** @type {HTMLElement} */
    const element = this;
    element.setAttribute('draggable', 'true');
    element.addEventListener('dragstart', this._dragStart.bind(this));
    element.addEventListener('dragend', this._dragEnd.bind(this));
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
  _dragEnd(event) {
    dragInProgressStore.value = false;
  }

  createRenderRoot() {
    // disable shadow DOM, otherwise CKEditor cannot init properly
    return this;
  }

  static styles = css`
    :host {
      cursor: grab;
    }
  `;
}

customElements.define('editara-drag-handle', EditaraDragHandle);
