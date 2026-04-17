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
    this.onDragOver = this.#dragOver.bind(this);
    this.onDragEnd = this.#dragEnd.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.isActive === 'true') {
      this.setAttribute('draggable', 'true');
      this.addEventListener('dragstart', this.onDragStart);
      window.addEventListener('dragover', this.onDragOver);
      this.addEventListener('dragend', this.onDragEnd);
    }
  }

  disconnectedCallback() {
    this.removeEventListener('dragstart', this.onDragStart);
    window.removeEventListener('dragover', this.onDragOver);
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
    this.#autoScroll(event.clientX, event.clientY);

    this.velocityScroll = initVelocityScroll();
  }

  /**
   * @param {DragEvent} event
   */
  #dragOver(event) {
    const dragInfo = dragInProgressStore.value;
    if (!dragInfo) {
      return;
    }
    if (dragInfo.table !== this.table) {
      return;
    }
    if (dragInfo.uid !== this.uid) {
      return;
    }
    if (dragInfo.CType !== this.CType) {
      return;
    }
    this.#autoScroll(event.clientX, event.clientY);
  }

  /**
   * @param {DragEvent} event
   */
  #dragEnd(event) {
    dragInProgressStore.value = false;
    this.velocityScroll?.destroy();
  }

  #autoScroll(clientX, clientY) {
    const verticalEdgeOfWindow = window.innerHeight * 0.2;
    const horizontalEdgeOfWindow = window.innerWidth * 0.2;
    const maxVerticalScrollStrength = window.innerHeight * 2.5;
    const maxHorizontalScrollStrength = window.innerWidth * 2.5;
    // scroll zone progress goes from 0 to 1:
    // 0 means the cursor just entered the scroll zone,
    // 1 means the cursor is at the viewport edge
    const maxProgress = 1;
    let verticalScrollAmount = 0;
    let horizontalScrollAmount = 0;

    // from the mouse position, calculate the distance to each viewport edge
    const distanceToTop = clientY;
    const distanceToBottom = window.innerHeight - clientY;
    const distanceToLeft = clientX;
    const distanceToRight = window.innerWidth - clientX;

    // the closer the cursor is to the viewport edge, the stronger the scroll becomes
    // We calculate a progress value and square it (** 2) so scrolling accelerates more near the edge
    if (distanceToBottom < verticalEdgeOfWindow) {
      const progressInBottomZone = maxProgress - distanceToBottom / verticalEdgeOfWindow;
      verticalScrollAmount = ((progressInBottomZone ** 2) * maxVerticalScrollStrength);
    }

    if (distanceToTop < verticalEdgeOfWindow) {
      const progressInTopZone = maxProgress - distanceToTop / verticalEdgeOfWindow;
      verticalScrollAmount = -((progressInTopZone ** 2) * maxVerticalScrollStrength);
    }

    if (distanceToRight < horizontalEdgeOfWindow) {
      const progressInRightZone = maxProgress - distanceToRight / horizontalEdgeOfWindow;
      horizontalScrollAmount = ((progressInRightZone ** 2) * maxHorizontalScrollStrength);
    }

    if (distanceToLeft < horizontalEdgeOfWindow) {
      const progressInLeftZone = maxProgress - distanceToLeft / horizontalEdgeOfWindow;
      horizontalScrollAmount = -((progressInLeftZone ** 2) * maxHorizontalScrollStrength);
    }

    this.velocityScroll?.setVelocity(verticalScrollAmount, horizontalScrollAmount);
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
