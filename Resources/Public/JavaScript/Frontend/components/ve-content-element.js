import {css, html, LitElement} from 'lit';
import {lll} from '@typo3/core/lit-helper.js';
import {dragInProgressStore} from '@typo3/visual-editor/Frontend/stores/drag-store';
import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {openModal} from '@typo3/visual-editor/Frontend/components/ve-iframe-popup';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';
import {calculateAllDebounced} from '@typo3/visual-editor/Frontend/auto-no-overlap';
import {getAriaRole} from '@typo3/visual-editor/Frontend/get-aria-role';
import {getAddAboveUidPid} from '@typo3/visual-editor/Frontend/components/add-above-target';
import {shouldHideContentElement} from '@typo3/visual-editor/Frontend/components/should-hide-content-element';
import {syncContentElementMoved} from '@typo3/visual-editor/Frontend/components/sync-content-element-moved';
import {showHiddenActive} from '@typo3/visual-editor/Shared/local-stores';
import {CUTOUT_PADDING_BLOCK, CUTOUT_PADDING_INLINE, FIELD_SELECTOR} from '@typo3/visual-editor/Frontend/cutout-geometry';

const HOVER_LEAVE_DELAY = 50; // ms

/**
 * @extends {HTMLElement}
 */
export class VeContentElement extends LitElement {
  static properties = {
    id: {type: String},
    elementName: {type: String},
    CType: {type: String},
    table: {type: String},
    uid: {type: Number},
    pid: {type: Number},
    colPos: {type: Number},
    tx_container_parent: {type: Number},
    scrollPositionId: {type: String},
    isHidden: {type: Boolean},
    hiddenFieldName: {type: String},
    canModifyRecord: {type: Boolean},
    canBeMoved: {type: Boolean},

    showHidden: {type: Boolean, state: true, attribute: false},
    isHovered: {type: Boolean, state: true, attribute: false},
    isFocusWithin: {type: Boolean, state: true, attribute: false},
    dragInProgress: {type: Boolean, state: true, attribute: false},
    showElementOverlay: {type: Boolean, attribute: false},
  };

  get editContentUrl() {
    return window.veInfo.editContentUrl
      .replace('__TABLE__', this.table)
      .replace('__UID__', this.uid);
  }

  get editContentContextualUrl() {
    return window.veInfo.editContentContextualUrl
      ?.replace('__TABLE__', this.table)
      ?.replace('__UID__', this.uid);
  }

  /**
   * @param {MouseEvent} event
   */
  _openEdit(event) {
    // if clicked with middle mouse button or ctrl/cmd key, open in new tab
    if (event.button === 1 || event.ctrlKey || event.metaKey) {
      return;
    }
    event.preventDefault();
    sendMessage('openInMiddleFrame', this.editContentUrl);
  }

  async _toggleHidden() {
    if (this.hiddenFieldName) {
      dataHandlerStore.setData(this.table, this.uid, this.hiddenFieldName, !this.isHidden);
      this.isHidden = !this.isHidden;
    }
  }

  async _delete() {
    dataHandlerStore.addCmd(this.table, this.uid, 'delete', 1);
    if (window.veInfo.languageId === 0 && this.table === 'tt_content' && this.scrollPositionId) {
      sendMessage('contentElementDeleted', {
        table: this.table,
        scrollPositionId: this.scrollPositionId,
      }, 'parent');
    }
    this.remove();
  }

  _addAbove() {
    const newContentUrl = window.veInfo.newContentUrl
      .replace('__COL_POS__', this.colPos)
      .replace('__UID_PID__', getAddAboveUidPid(this))
      .replace('__TX_CONTAINER_PARENT__', this.tx_container_parent);

    openModal(newContentUrl, lll('frontend.addContentElement') + ' ' + this.parentElement.columnName, 'large', 'ajax');
  }

  constructor() {
    super();
    this.onDragInProgressChange = this.#onDragInProgressChange.bind(this);
    this.onShowHiddenChange = this.#onShowHiddenChange.bind(this);
    this.unsubscribeSyncContentElementDeleted = null;
    this.unsubscribeSyncContentElementMoved = null;
    this.showHidden = showHiddenActive.get();
    this.isFocusWithin = false;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.isHovered || this.isFocusWithin) {
        this.#updateFrame();
      }
    });
    this.addEventListener('mouseenter', () => {
      clearTimeout(this.leaveTimer);
      this.isHovered = true;
      setTimeout(calculateAllDebounced);
    });
    this.addEventListener('mouseover', () => {
      clearTimeout(this.leaveTimer);
      if (this.isHovered) {
        return;
      }
      this.isHovered = true;
      setTimeout(calculateAllDebounced);
    });
    this.addEventListener('mouseleave', () => {
      // short grace period, so the pointer can cross the gap between the element and its action bar
      this.leaveTimer = setTimeout(() => {
        this.isHovered = false;
        setTimeout(calculateAllDebounced);
      }, HOVER_LEAVE_DELAY);
    });
    this.addEventListener('focusin', () => {
      this.isFocusWithin = true;
    });
    this.addEventListener('focusout', () => {
      this.isFocusWithin = false;
    });
  }

  connectedCallback() {
    super.connectedCallback();

    this.resizeObserver.observe(this);

    dragInProgressStore.addEventListener('change', this.onDragInProgressChange);
    showHiddenActive.addEventListener('change', this.onShowHiddenChange);
    this.unsubscribeSyncContentElementDeleted = onMessage('syncContentElementDeleted',
      /**
        * @param detail {{languageId: number, table: string, scrollPositionId: string}}
       */
      (detail) => {
        if (detail.languageId !== 0) {
          return;
        }
        if (detail.table !== this.table) {
          return;
        }
        if (detail.scrollPositionId !== this.scrollPositionId) {
          return;
        }
        // dataHandlerStore.addCmd(this.table, this.uid, 'delete', 1); TOOD decide if we want this delete action to be visible
        this.remove();
      });
    this.unsubscribeSyncContentElementMoved = onMessage('syncContentElementMoved',
      /**
        * @param detail {{languageId: number, table: string, scrollPositionId: string}}
       */
      (detail) => {
        if (detail.table !== this.table) {
          return;
        }
        if (detail.scrollPositionId !== this.scrollPositionId) {
          return;
        }
        syncContentElementMoved(detail);
      });

    if (this.parentElement.tagName.toLowerCase() !== 've-content-area') {
      let message = 'parent of ve-content-element must be ve-content-area, found ' + this.parentElement.tagName.toLowerCase();
      message += '\n' + 'drag and drop is disabled for this element.';
      console.warn(message);
    }
  }

  disconnectedCallback() {
    clearTimeout(this.leaveTimer);
    this.resizeObserver.disconnect();
    dragInProgressStore.removeEventListener('change', this.onDragInProgressChange);
    showHiddenActive.removeEventListener('change', this.onShowHiddenChange);
    this.unsubscribeSyncContentElementDeleted?.();
    this.unsubscribeSyncContentElementDeleted = null;
    this.unsubscribeSyncContentElementMoved?.();
    this.unsubscribeSyncContentElementMoved = null;

    super.disconnectedCallback();
  }

  /**
   * The hover frame and the action bar are positioned through custom properties on this element.
   * The frame hugs the cut-outs of the spotlight: the bounding box of the fields of this
   * element (not of nested content elements), plus the cut-out padding.
   * Without fields it is the whole element.
   */
  #updateFrame() {
    const rect = this.#computeFrameRect();
    const properties = {
      '--ve-frame-top': rect ? `${rect.top}px` : null,
      '--ve-frame-left': rect ? `${rect.left}px` : null,
      '--ve-frame-width': rect ? `${rect.width}px` : null,
      '--ve-frame-height': rect ? `${rect.height}px` : null,
    };
    for (const [name, value] of Object.entries(properties)) {
      if (value === null) {
        this.style.removeProperty(name);
      } else {
        this.style.setProperty(name, value);
      }
    }
  }

  /**
   * @return {{top: number, left: number, width: number, height: number}|null}
   */
  #computeFrameRect() {
    const rects = Array.from(this.querySelectorAll(FIELD_SELECTOR))
      .filter(field => field.closest('ve-content-element') === this)
      .map(field => field.getBoundingClientRect())
      .filter(rect => rect.width > 0 || rect.height > 0);
    if (!rects.length) {
      return null;
    }

    const hostRect = this.getBoundingClientRect();
    const left = Math.min(...rects.map(rect => rect.left)) - CUTOUT_PADDING_INLINE;
    const top = Math.min(...rects.map(rect => rect.top)) - CUTOUT_PADDING_BLOCK;
    const right = Math.max(...rects.map(rect => rect.right)) + CUTOUT_PADDING_INLINE;
    const bottom = Math.max(...rects.map(rect => rect.bottom)) + CUTOUT_PADDING_BLOCK;

    return {
      top: top - hostRect.top,
      left: left - hostRect.left,
      width: right - left,
      height: bottom - top,
    };
  }

  /**
   * @param changedProperties {Map<PropertyKey, unknown>}
   */
  willUpdate(changedProperties) {
    if ((changedProperties.has('isHovered') || changedProperties.has('isFocusWithin')) && (this.isHovered || this.isFocusWithin)) {
      this.#updateFrame();
    }
  }

  #onShowHiddenChange() {
    this.showHidden = showHiddenActive.get();
  }

  #onDragInProgressChange() {
    if (!dragInProgressStore.value) {
      this.dragInProgress = false;
    }
    setTimeout(() => {
      // delay the dragInProgress set to true, so the drag handle can be "screenshot". (to create the drag ghost image) (otherwise the drag will immediately end in chromium based browsers)
      this.dragInProgress = !!dragInProgressStore.value;
    });
  }

  get hasContentAreaAsParent() {
    return this.parentElement.tagName.toLowerCase() === 've-content-area';
  }

  /**
   * Whether this element should be visually hidden because the editor turned off
   * "Show hidden".
   * @return {boolean}
   */
  get hideBecauseHidden() {
    return shouldHideContentElement({
      showHidden: this.showHidden,
      isHidden: this.isHidden,
      hasUnsavedHiddenChange: !!this.hiddenFieldName && dataHandlerStore.hasChangedData(this.table, this.uid, this.hiddenFieldName),
    });
  }

  /**
   * @param changedProperties {Map<PropertyKey, unknown>}
   */
  firstUpdated(changedProperties) {
    // overwrite pid attribute of parent ve-content-area to ensure it is correct even if slide=-1 is used
    if (this.hasContentAreaAsParent) {
      this.parentElement.setAttribute('target', this.pid);
    }

    if (this.hiddenFieldName) {
      dataHandlerStore.setInitialData(this.table, this.uid, this.hiddenFieldName, !!this.isHidden);
    }

    /** @type {HTMLElement} */
    const element = this;
    if (element.getAttribute('was')) {
      // already processed
      return;
    }

    if (element.childElementCount !== 1) {
      console.warn(element, 've-content-element: Expected exactly one child element, found ' + element.childElementCount);
      return;
    }
    const notAllowedChildTags = ['style', 'script', 'iframe'];
    const firstChildTagName = element.firstElementChild.tagName.toLowerCase();
    if (firstChildTagName.includes('-') || notAllowedChildTags.includes(firstChildTagName)) {
      console.warn(element, 've-content-element: Child element cannot be <' + firstChildTagName + '> please wrap it in a div or similar.');
      return;
    }

    const child = element.firstElementChild;
    element.setAttribute('was', child.tagName.toLowerCase());
    const role = getAriaRole(child.tagName.toLowerCase());
    if (role && !element.hasAttribute('role')) {
      element.setAttribute('role', role);
    }
    const properties = Object.keys(element.constructor.properties).map(prop => prop.toLowerCase());
    for (const attributeName of child.getAttributeNames()) {
      if (!properties.includes(attributeName.toLowerCase())) {
        element.setAttribute(attributeName, child.getAttribute(attributeName));
      }
    }
    // put all children of child into element and remove child
    while (child.firstChild) {
      element.appendChild(child.firstChild);
    }
    child.remove();
  }

  /**
   * @param changedProperties {Map<PropertyKey, unknown>}
   */
  updated(changedProperties) {
    // the spotlight cuts a hole around the visible action bar, so it needs to know when that changes
    if (changedProperties.has('isHovered') || changedProperties.has('isFocusWithin') || changedProperties.has('isHidden')) {
      window.dispatchEvent(new CustomEvent('ve-spotlight-refresh'));
    }
    // hide the whole element when "Show hidden" is off and this element is hidden
    this.classList.toggle('ve-hidden', this.hideBecauseHidden);
  }

  render() {
    const toggleIcon = this.isHidden ? 'actions-toggle-off' : 'actions-toggle-on';
    const editLabel = lll('frontend.editContentElement');
    const toggleLabel = lll('frontend.showContentElement');
    const deleteLabel = lll('frontend.deleteContentElement');
    const addLabel = lll('frontend.addContentElementButton');
    const actionBar = html`
      <ve-drag-handle
        table="${this.table}" uid="${this.uid}" CType="${this.CType}"
        class="action-bar${this.isHidden ? ' hidden' : ''}${this.dragInProgress ? ' dragAndDropActive' : ''}${(this.isHovered || this.isFocusWithin) ? ' hovered' : ''}"
        isActive="${(this.canBeMoved && this.hasContentAreaAsParent) ? 'true' : 'false'}"
        role="region"
        aria-label="${lll('frontend.actionBar')}"
      >
        <span class="action-bar-headline" title="uid:${this.uid}">
                ${(this.canBeMoved && this.hasContentAreaAsParent) ? '⠿ ' : ''}${window.veInfo.showIdWithTitle ? `[${this.uid}] ` : ''}${this.elementName}
              </span>
        <!-- TODO extract button bar as separate component -->
        ${
          this.editContentContextualUrl ?
            html`
              <typo3-backend-contextual-record-edit-trigger
                url="${this.editContentContextualUrl}"
                edit-url="${this.editContentUrl}"
                class="button"
                title="${editLabel}"
                aria-label="${editLabel}"
              >
                <ve-icon name="actions-open"></ve-icon>
              </typo3-backend-contextual-record-edit-trigger>
            `
            : html`
              <a class="button" tabindex="0" type="button" href="${this.editContentUrl}" @click="${this._openEdit}" title="${editLabel}" aria-label="${editLabel}">
                <ve-icon name="actions-open"></ve-icon>
              </a>
            `
        }
        ${
          this.hiddenFieldName ?
            html`
              <button class="button" tabindex="0" type="button" role="switch" @click="${this._toggleHidden}" title="${toggleLabel}" aria-label="${toggleLabel}" aria-checked="${!this.isHidden}" >
                <ve-icon name="${toggleIcon}"></ve-icon>
              </button>
            `
            : ''
        }
        <button class="button" tabindex="0" type="button" @click="${this._delete}" title="${deleteLabel}" aria-label="${deleteLabel}">
          <ve-icon name="actions-delete"></ve-icon>
        </button>
        ${
          window.veInfo.allowNewContent ?
            html`
            <button class="button" tabindex="0" type="button" @click="${this._addAbove}" title="${addLabel}" aria-label="${addLabel}">
              <ve-icon name="actions-document-add"></ve-icon>
            </button>
          `
            : ''
        }
      </ve-drag-handle>`;

    return html`
      ${this.canModifyRecord ? actionBar : ''}
      <slot></slot><!-- slot must be top level to mitigate all CSS problems -->
      ${
        this.hasContentAreaAsParent ?
          html`
          <ve-drop-zone
            table="${this.table}"
            uid="${this.uid}"
            target="${-this.uid}"
            colPos="${this.colPos}"
            allowedContentTypes="${this.parentElement.allowedContentTypes}"
            disallowedContentTypes="${this.parentElement.disallowedContentTypes}"
            columnName="${this.parentElement.columnName}"
            tx_container_parent="${this.tx_container_parent}"
          ></ve-drop-zone>`
          : ''
      }
      <div class="border${this.isHidden ? ' hidden' : ''}${this.showElementOverlay ? ' showElementOverlay' : ''}"></div>
      ${(this.isHovered || this.isFocusWithin) ? html`<div class="frame"></div>` : ''}
    `;
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      /* reset overflow as this breaks the drag handle */
      overflow: initial !important;
    }

    :host(.ve-hidden) {
      display: none;
    }

    .border {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      z-index: 10;
      pointer-events: none;

      transition: 0.2s, box-shadow 0.2s, background-image 0.2s, backdrop-filter 0.2s;
    }

    .border.hidden {
      background: repeating-linear-gradient(
        -45deg,
        rgba(128, 128, 128, 0.35),
        rgba(128, 128, 128, 0.35) 12px,
        rgba(128, 128, 128, 0.2) 12px,
        rgba(128, 128, 128, 0.2) 24px
      );
      backdrop-filter: saturate(0%);
    }

    .border.hidden::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      box-sizing: border-box;
      border-radius: 999px;
      background:
        center / 16px 16px no-repeat url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8s2.3-4.5 6.5-4.5S14.5 8 14.5 8s-2.3 4.5-6.5 4.5S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/><path d="M2.5 13.5l11-11"/></svg>'),
        color-mix(in srgb, var(--ve-surface, #171717) 85%, transparent);
      border: 1px solid color-mix(in srgb, var(--ve-on-surface, #d9d9d9) 30%, transparent);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .border.showElementOverlay {
      background-image: linear-gradient(to top, rgba(59, 158, 59, 0.90) 0%, transparent min(500px, max(100px, 50%)));
    }

    /* The frame hugs the spotlight cut-outs of the fields (see #updateFrame), the whole element otherwise.
       It stays quiet (1px), the field rings inside it are the strong cue (2px). */
    .frame {
      position: absolute;
      top: var(--ve-frame-top, 0px);
      left: var(--ve-frame-left, 0px);
      width: var(--ve-frame-width, 100%);
      height: var(--ve-frame-height, 100%);
      z-index: 10;
      pointer-events: none;
      box-sizing: border-box;
      outline: 1px solid color-mix(in srgb, var(--ve-accent, #5432fe) 70%, transparent);
      outline-offset: 0;
      border-radius: 0 5px 5px 5px; /* CUTOUT_RADIUS, the top left corner is where the action bar attaches */
      background-color: color-mix(in srgb, var(--ve-accent, #5432fe) 3%, transparent);
    }

    .action-bar {
      display: flex;
      align-items: center;
      opacity: 0;
      pointer-events: none;
      gap: 2px;
      position: absolute;
      /* sits on the top edge of the frame */
      bottom: calc(100% - var(--ve-frame-top, 0px));
      left: calc(var(--ve-frame-left, 0px) - 1px);
      background: color-mix(in srgb, var(--ve-surface, #171717) 90%, transparent);
      backdrop-filter: blur(8px);
      color: var(--ve-on-surface, #d9d9d9);
      border: 0;
      padding: 3px 4px;
      border-radius: 3px 3px 0 0;
      box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.25);
      z-index: 10100;
      font-size: 13px;
      line-height: 1.4;

      transition: opacity 0.2s ease;
    }

    /* The frame can reach above this element. This keeps the pointer on the action bar while it crosses that gap. */
    .action-bar::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      height: max(0px, calc(-1 * var(--ve-frame-top, 0px)));
    }

    .action-bar[isActive="true"] {
      cursor: grab;
    }

    .action-bar.hovered,
    .action-bar:focus-within {
      opacity: 1;
      pointer-events: initial;
    }

    .action-bar.dragAndDropActive {
      display: none;
    }

    .action-bar.hidden {
      display: flex;
      opacity: 0.75;
      pointer-events: initial;
    }

    .action-bar-headline {
      padding: 0 0.75em 0 0.5em;
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--ve-on-surface, #d9d9d9);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 2px;
      padding: 0.2em 0.5em;
      text-decoration: none;
      cursor: pointer;

      transition: background-color 0.15s ease, border-color 0.15s ease;
    }

    .button:hover {
      background-color: color-mix(in srgb, var(--ve-accent, #5432fe) 28%, transparent);
    }

    .button:focus-visible {
      background-color: color-mix(in srgb, var(--ve-accent, #5432fe) 28%, transparent);
      outline: 2px solid var(--ve-accent, #5432fe);
      outline-offset: 1px;
    }
  `;
}

customElements.define('ve-content-element', VeContentElement);
