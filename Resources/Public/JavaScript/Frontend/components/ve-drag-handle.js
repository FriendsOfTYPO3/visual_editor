import {css, LitElement} from 'lit';
import {dragInProgressStore} from '@typo3/visual-editor/Frontend/stores/drag-store';
import {autoNoOverlap} from '@typo3/visual-editor/Frontend/auto-no-overlap';
import {initVelocityScroll} from '@typo3/visual-editor/Frontend/components/ve-drag-handle/velocity-scroll';

/**
 * @extends {HTMLElement}
 */
export class VeDragHandle extends LitElement {
  static properties = {
    table: {type: String}, CType: {type: String}, uid: {type: Number}, isActive: {type: String},
  };

  constructor() {
    super();
    this.onDragStart = this.#dragStart.bind(this);
    this.onDragEnd = this.#dragEnd.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.isActive === 'true') {
      this.setAttribute('draggable', 'true');
      this.addEventListener('dragstart', this.onDragStart);
      this.addEventListener('dragend', this.onDragEnd);
    }
  }

  disconnectedCallback() {
    this.removeEventListener('dragstart', this.onDragStart);
    this.removeEventListener('dragend', this.onDragEnd);

    super.disconnectedCallback();
  }

  firstUpdated(changedProperties) {
    autoNoOverlap(this, 've-drag-handle');
    this.style.paddingBottom = 'calc(var(--auto-no-overlap-padding, 0px) + 4px)';
  }

  /**
   * @param {DragEvent} event
   */
  #dragStart(event) {
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.clearData();

    const info = {
      table: this.table,
      uid: this.uid,
      CType: this.CType,
    };
    event.dataTransfer.setData('text/ve-drag', JSON.stringify(info));

    dragInProgressStore.value = info;
    initVelocityScroll(event);
  }

  /**
   * @param {DragEvent} event
   */
  #dragEnd(event) {
    dragInProgressStore.value = false;
  }

  createRenderRoot() {
    // disable shadow DOM
    return this;
  }

  static styles = css`
    :host([draggable]) {
      cursor: grab;
    }
  `;
}

customElements.define('ve-drag-handle', VeDragHandle);
