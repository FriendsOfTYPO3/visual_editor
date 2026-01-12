import {css, LitElement} from 'lit';
import {dragInProgressStore} from "@typo3/visual-editor/Frontend/stores/drag-store.mjs";
import {autoNoOverlap} from "@typo3/visual-editor/Frontend/auto-no-overlap.mjs";

/**
 * @extends {HTMLElement}
 */
export class VeDragHandle extends LitElement {
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

    element.style.paddingBottom = 'calc(var(--auto-no-overlap-padding, 0px) + 4px)';
  }

  firstUpdated(changedProperties) {
    autoNoOverlap(this, 've-drag-handle');
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
    event.dataTransfer.setData('text/ve-drag', JSON.stringify(info));

    dragInProgressStore.value = info;
  }

  /**
   * @param {DragEvent} event
   */
  _dragEnd(event) {
    dragInProgressStore.value = false;
  }

  createRenderRoot() {
    // disable shadow DOM
    return this;
  }

  static styles = css`
    :host {
      cursor: grab;
    }
  `;
}

customElements.define('ve-drag-handle', VeDragHandle);
