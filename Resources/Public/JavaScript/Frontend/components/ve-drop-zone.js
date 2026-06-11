import {css, html, LitElement} from 'lit';
import {lll} from "@typo3/core/lit-helper.js";
import {classMap} from 'lit/directives/class-map.js';
import {styleMap} from 'lit/directives/style-map.js';
import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {dragInProgressStore} from '@typo3/visual-editor/Frontend/stores/drag-store';
import {flipInsertBefore} from '@typo3/visual-editor/Frontend/flip-insert-before';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';
import {autoNoOverlap, calculateAllDebounced} from '@typo3/visual-editor/Frontend/auto-no-overlap';
import {DROP_ZONE_LABEL_FIT_DEFAULTS, fitDropZoneLabel} from '@typo3/visual-editor/Frontend/components/ve-drop-zone/label-fitting';

const DROP_ZONE_LABEL_EDGE_LEEWAY = 5;

/**
 * @extends {HTMLElement}
 */
export class VeDropZone extends LitElement {
  static properties = {
    table: {type: String},

    target: {type: Number},
    colPos: {type: Number},
    allowedContentTypes: {type: String},
    disallowedContentTypes: {type: String},
    columnName: {type: String},
    tx_container_parent: {type: Number},

    show: {type: Boolean, state: true, attribute: false},
    isDragHovering: {type: Boolean, state: true, attribute: false},
    error: {type: String, state: true, attribute: false},
    labelFit: {type: Object, state: true, attribute: false},
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

    if (this.allowedContentTypes) {
      if (!this.allowedContentTypes.split(',').map(type => type.trim()).includes(data.CType)) {
        return false;
      }
    }
    if (this.disallowedContentTypes) {
      if (this.disallowedContentTypes.split(',').map(type => type.trim()).includes(data.CType)) {
        return false;
      }
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
    this.labelFit = {
      variant: 'full',
      fontSize: DROP_ZONE_LABEL_FIT_DEFAULTS.maxFontSize,
      lineCount: 1,
      hidden: false,
    };
    this.onDragInProgressChange = this.#onDragInProgressChange.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    dragInProgressStore.addEventListener('change', this.onDragInProgressChange);
  }

  disconnectedCallback() {
    dragInProgressStore.removeEventListener('change', this.onDragInProgressChange);
    this.dragOverTimeout && clearTimeout(this.dragOverTimeout);
    this.resizeObserver?.disconnect();

    super.disconnectedCallback();
  }

  firstUpdated(changedProperties) {
    const dropArea = this.shadowRoot.querySelector('.dropArea');
    autoNoOverlap(dropArea, 've-drop-zone');
    this.resizeObserver = new ResizeObserver(() => this.#updateLabelFit());
    this.resizeObserver.observe(dropArea);
    this.#updateLabelFit();
  }

  updated(changedProperties) {
    if (
      changedProperties.has('show')
      || changedProperties.has('target')
      || changedProperties.has('colPos')
      || changedProperties.has('columnName')
      || changedProperties.has('tx_container_parent')
    ) {
      requestAnimationFrame(() => this.#updateLabelFit());
    }
  }

  /**
   * @param {DragEvent} event
   */
  _dragOver(event) {
    const isVEDrag = event.dataTransfer.types.includes('text/ve-drag');
    if (isVEDrag) {
      event.preventDefault();
    }
    event.dataTransfer.dropEffect = event.ctrlKey ? 'copy' : 'move';

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
        ),
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

      dataHandlerStore.addCmd(data.table, data.uid, 'copy', actionData);

      sendMessage('doSave');
      const unsubscribe = onMessage('saveEnded', () => {
        unsubscribe();
        sendMessage('reloadFrames');
      });
      return;
    }

    dataHandlerStore.addCmd(data.table, data.uid, 'move', actionData);


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

  #onDragInProgressChange() {
    const newValue = this.shouldShow();
    if (this.show !== newValue) {
      setTimeout(calculateAllDebounced);
    }
    this.show = newValue;
  }

  #updateLabelFit() {
    const dropArea = this.shadowRoot?.querySelector('.dropArea');
    if (!dropArea) {
      return;
    }

    const dropAreaRect = dropArea.getBoundingClientRect();
    if (dropAreaRect.width <= 0 || dropAreaRect.height <= 0) {
      return;
    }

    const icon = this.shadowRoot.querySelector('ve-icon');
    const iconWidth = icon?.getBoundingClientRect().width || 0;
    const gap = parseFloat(getComputedStyle(dropArea).columnGap) || 0;
    const availableWidth = Math.max(0, dropAreaRect.width - iconWidth - gap - DROP_ZONE_LABEL_EDGE_LEEWAY * 2);
    const variants = this.getLabelVariants();
    const nextFit = fitDropZoneLabel(variants, {
      availableWidth,
      availableHeight: dropAreaRect.height,
      measureText: (text, fontSize) => this.measureLabelText(text, fontSize),
    });

    if (
      nextFit.variant !== this.labelFit.variant
      || nextFit.fontSize !== this.labelFit.fontSize
      || nextFit.lineCount !== this.labelFit.lineCount
      || nextFit.hidden !== this.labelFit.hidden
    ) {
      this.labelFit = nextFit;
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

    const labelParts = this.getVisibleLabelParts();
    const labelStyles = {
      'font-size': `${this.labelFit.fontSize}px`,
      'line-height': `${DROP_ZONE_LABEL_FIT_DEFAULTS.lineHeight}`,
      '-webkit-line-clamp': this.labelFit.lineCount,
    };

    return html`
      <div class=${classMap(classes)}
           @dragover="${this._dragOver}"
           @dragenter="${this._dragEnter}"
           @dragleave="${this._dragLeave}"
           @drop="${this._drop}"
      >
        <ve-icon name="apps-pagetree-drag-move-into" width="2em"></ve-icon>
        ${this.labelFit.hidden ? '' : html`
          <span
            class="labelText ${this.labelFit.lineCount === 1 ? 'singleLine' : 'multiLine'}"
            style=${styleMap(labelStyles)}
          >
            ${labelParts.map((part, index) => html`${index > 0 ? ' ' : ''}${part.type === 'value' ? html`<b>${part.text}</b>` : html`<small>${part.text}</small>`}`)}
          </span>
        `}
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

    .labelText {
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      text-align: center;
      overflow-wrap: anywhere;
    }

    .labelText.singleLine {
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .labelText.multiLine {
      display: -webkit-box;
      -webkit-box-orient: vertical;
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

  /**
   * @return {{type: string, text: string}|[{type: string, text: string},{type: string, text: string},{type: string, text: string},{type: string, text: string}]|[{type: string, text: string},{type: string, text: string}]|DropZoneLabelPart[]|*|*[]}
   */
  getVisibleLabelParts() {
    const variants = this.getLabelVariants();
    return variants.find(variant => variant.name === this.labelFit.variant)?.parts || [];
  }

  /**
   * @return {[{name: string, parts: *[]},{name: string, parts: *[]},{name: string, parts: [{type: string, text: *},{type: string, text: string}]}]}
   */
  getLabelVariants() {
    const afterParts = [];
    const containerParts = [];

    if (this.target < 0) {
      afterParts.push(
        {type: 'label', text: lll('frontend.after')},
        {type: 'value', text: this.getComponentName(this.target * -1)},
      );
    }
    if (this.tx_container_parent || this.colPos > 99) {
      // EXT:container + EXT:flux support
      const uidOfParent = this.tx_container_parent || parseInt(this.colPos / 100);
      containerParts.push(
        {type: 'label', text: lll('frontend.in')},
        {type: 'value', text: this.getComponentName(uidOfParent)},
      );
    }

    const columnName = this.columnName || (this.colPos % 100);
    const columnParts = [
      {type: 'label', text: lll('frontend.inColumn')},
      {type: 'value', text: String(columnName)},
    ];

    return [
      {
        name: 'full',
        parts: [...afterParts, ...containerParts, ...columnParts],
      },
      {
        name: 'without-container',
        parts: [...afterParts, ...columnParts],
      },
      {
        name: 'column',
        parts: columnParts,
      },
    ];
  }

  /**
   * @param text {String}
   * @param fontSize {number}
   * @return {number}
   */
  measureLabelText(text, fontSize) {
    this.textMeasureCanvas ??= document.createElement('canvas');
    const context = this.textMeasureCanvas.getContext('2d');
    context.font = `${fontSize}px sans-serif`;
    return context.measureText(text).width;
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
