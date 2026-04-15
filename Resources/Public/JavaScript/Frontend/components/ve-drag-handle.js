import {css, LitElement} from 'lit';
import {dragInProgressStore} from '@typo3/visual-editor/Frontend/stores/drag-store';
import {autoNoOverlap} from '@typo3/visual-editor/Frontend/auto-no-overlap';

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
  }

  #autoScroll(clientX, clientY) {
    if (clientX == null || clientY == null) {
      return;
    }

    const verticalEdgeOfWindow = window.innerHeight * 0.20;
    const horizontalEdgeOfWindow = window.innerWidth * 0.20;
    const maxVerticalScrollStrength = window.innerHeight * 0.6;
    const maxHorizontalScrollStrength = window.innerWidth * 0.6;
    // scroll zone progress goes from 0 to 1:
    // 0 means the cursor just entered the scroll zone,
    // 1 means the cursor is at the viewport edge
    const maxProgress = 1;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const scrollingElement = document.scrollingElement;
    if (!scrollingElement) {
      return;
    }
    let verticalScrollAmount = 0;
    let horizontalScrollAmount = 0;

    // from the mouse position, calculate the distance to each viewport edge
    const distanceToTop = clientY;
    const distanceToBottom = viewportHeight - clientY;
    const distanceToLeft = clientX;
    const distanceToRight = viewportWidth - clientX;

    // the closer the cursor is to the viewport edge, the stronger the scroll becomes
    // We calculate a progress value and square it (** 2) so scrolling accelerates more near the edge
    if (distanceToBottom < verticalEdgeOfWindow) {
      const progressInBottomZone = maxProgress - distanceToBottom / verticalEdgeOfWindow;
      verticalScrollAmount = Math.ceil((progressInBottomZone ** 2) * maxVerticalScrollStrength);
    }

    if (distanceToTop < verticalEdgeOfWindow) {
      const progressInTopZone = maxProgress - distanceToTop / verticalEdgeOfWindow;
      verticalScrollAmount = -Math.ceil((progressInTopZone ** 2) * maxVerticalScrollStrength);
    }

    if (distanceToRight < horizontalEdgeOfWindow) {
      const progressInRightZone = maxProgress - distanceToRight / horizontalEdgeOfWindow;
      horizontalScrollAmount = Math.ceil((progressInRightZone ** 2) * maxHorizontalScrollStrength);
    }

    if (distanceToLeft < horizontalEdgeOfWindow) {
      const progressInLeftZone = maxProgress - distanceToLeft / horizontalEdgeOfWindow;
      horizontalScrollAmount = -Math.ceil((progressInLeftZone ** 2) * maxHorizontalScrollStrength);
    }

    if (!verticalScrollAmount && !horizontalScrollAmount) {
      return;
    }

    const newVerticalScrollPosition = scrollingElement.scrollTop + verticalScrollAmount;
    const maxVerticalScrollPosition = scrollingElement.scrollHeight - viewportHeight;
    const limitedVerticalScrollPosition = Math.max(0, Math.min(newVerticalScrollPosition, maxVerticalScrollPosition));
    const newHorizontalScrollPosition = scrollingElement.scrollLeft + horizontalScrollAmount;
    const maxHorizontalScrollPosition = scrollingElement.scrollWidth - viewportWidth;
    const limitedHorizontalScrollPosition = Math.max(0, Math.min(newHorizontalScrollPosition, maxHorizontalScrollPosition));

    // in firefox we only can set one of the both scrollTop and scrollLeft to them taking effect, so we select that really needs updating
    if (limitedVerticalScrollPosition !== Math.ceil(scrollingElement.scrollTop)) {
      scrollingElement.scrollTop = limitedVerticalScrollPosition;
    }
    if (limitedHorizontalScrollPosition !== Math.ceil(scrollingElement.scrollLeft)) {
      scrollingElement.scrollLeft = limitedHorizontalScrollPosition;
    }
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
