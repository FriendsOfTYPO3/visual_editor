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
import {requestAppearancePreview} from '@typo3/visual-editor/Frontend/appearance-preview/request-appearance-preview';
import {fetchAppearanceItems} from '@typo3/visual-editor/Frontend/appearance-preview/fetch-appearance-items';
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
    appearanceFields: {type: Array},
    openAppearanceField: {type: String, state: true, attribute: false},
    appearanceLoading: {type: Boolean, state: true, attribute: false},

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

  /**
   * @param {string} name
   */
  _toggleAppearanceMenu(name) {
    this.#setOpenAppearanceField(this.openAppearanceField === name ? null : name);
  }

  /**
   * @param {string|null} name
   */
  #setOpenAppearanceField(name) {
    this.openAppearanceField = name;
    document.removeEventListener('pointerdown', this.onAppearancePointerDown);
    document.removeEventListener('keydown', this.onAppearanceKeyDown);
    if (name === null) {
      return;
    }

    document.addEventListener('pointerdown', this.onAppearancePointerDown);
    document.addEventListener('keydown', this.onAppearanceKeyDown);
    if (!this.appearanceFields.every(field => field.items)) {
      this.#loadAppearanceItems();
    }
    this.updateComplete.then(() => {
      this.#alignAppearanceMenu();
      this.renderRoot.querySelector('.appearance-item[aria-checked="true"]')?.focus();
    });
  }

  /**
   * A menu that would be wider than the space right of its button opens to the left, so the page does not get a horizontal scrollbar.
   */
  #alignAppearanceMenu() {
    const menu = this.renderRoot.querySelector('.appearance-menu');
    if (!menu) {
      return;
    }

    menu.classList.remove('align-end');
    if (menu.getBoundingClientRect().right > document.documentElement.clientWidth) {
      menu.classList.add('align-end');
    }
  }

  /**
   * @param {PointerEvent} event
   */
  #onAppearancePointerDown(event) {
    if (!event.composedPath().includes(this.renderRoot.querySelector('.appearance-field.open'))) {
      this.#setOpenAppearanceField(null);
    }
  }

  /**
   * @param {KeyboardEvent} event
   */
  #onAppearanceKeyDown(event) {
    if (event.key === 'Escape') {
      const trigger = this.renderRoot.querySelector('.appearance-field.open .appearance-trigger');
      this.#setOpenAppearanceField(null);
      trigger?.focus();
    }
  }

  /**
   * Moves the focus in the open menu with the arrow keys.
   * @param {KeyboardEvent} event
   */
  _onAppearanceMenuKeyDown(event) {
    const keys = {ArrowDown: 1, ArrowUp: -1, Home: 'first', End: 'last'};
    if (!(event.key in keys)) {
      return;
    }

    event.preventDefault();
    const items = [...event.currentTarget.querySelectorAll('.appearance-item:not([disabled])')];
    const current = items.indexOf(this.renderRoot.activeElement ?? document.activeElement);
    const move = keys[event.key];
    const target = move === 'first' ? 0 : move === 'last' ? items.length - 1 : (current + move + items.length) % items.length;
    items[target]?.focus();
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  async _chooseAppearanceItem(name, value) {
    const trigger = this.renderRoot.querySelector('.appearance-field.open .appearance-trigger');
    this.#setOpenAppearanceField(null);
    trigger?.focus();
    if (this.appearanceFields.find(field => field.name === name)?.value !== value) {
      await this._changeAppearance(name, value);
    }
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  async _changeAppearance(name, value) {
    this.appearanceFields = this.appearanceFields.map(field => field.name === name ? this.#withValue(field, value) : field);
    dataHandlerStore.setData(this.table, this.uid, name, value);

    // the items of the other fields can depend on this value, and the other values can become invalid
    await this.#loadAppearanceItems();
    this.#previewAppearance();
  }

  /**
   * @param {{items?: Array<{label: string, value: string, icon: string|null}>, valueLabel: string, valueIcon: string|null}} field
   * @param {string} value
   */
  #withValue(field, value) {
    const item = field.items?.find(candidate => candidate.value === value);
    return {...field, value, valueLabel: item?.label ?? value, valueIcon: field.items ? (item?.icon ?? null) : field.valueIcon};
  }

  /**
   * Loads the items like the edit form shows them and takes over the values that the backend had to reset.
   */
  async #loadAppearanceItems() {
    this.appearanceController?.abort();
    const controller = new AbortController();
    this.appearanceController = controller;
    this.appearanceLoading = true;

    try {
      const resolved = await fetchAppearanceItems({
        table: this.table,
        uid: this.uid,
        pageId: window.veInfo.pageId,
        fields: this.appearanceFields.map(field => field.name),
        values: Object.fromEntries(this.appearanceFields.map(field => [field.name, field.value])),
      }, controller.signal);

      // fields that the editor does not see in the edit form are not offered
      this.appearanceFields = this.appearanceFields.filter(field => resolved[field.name]).map((field) => {
        const {value, items} = resolved[field.name];
        if (value !== field.value) {
          dataHandlerStore.setData(this.table, this.uid, field.name, value);
        }
        return this.#withValue({...field, items}, value);
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('ve-content-element: the items of the appearance fields could not be loaded.', error);
      }
    } finally {
      if (this.appearanceController === controller) {
        this.appearanceLoading = false;
        this.updateComplete.then(() => this.#alignAppearanceMenu());
      }
    }
  }

  /**
   * Shows the unsaved values in this content element and in the translations of it.
   */
  #previewAppearance() {
    requestAppearancePreview(this, Object.fromEntries(this.appearanceFields.map(field => [field.name, field.value])));

    // fields that are excluded from the translation have the same value in all languages
    const values = Object.fromEntries(this.appearanceFields.filter(field => field.translationExcluded).map(field => [field.name, field.value]));
    if (window.veInfo.languageId === 0 && this.table === 'tt_content' && this.scrollPositionId && Object.keys(values).length) {
      sendMessage('appearanceDraftChanged', {
        table: this.table,
        scrollPositionId: this.scrollPositionId,
        values,
      }, 'parent');
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
    this.onDataHandlerChange = this.#onDataHandlerChange.bind(this);
    this.unsubscribeSyncContentElementDeleted = null;
    this.unsubscribeSyncContentElementMoved = null;
    this.unsubscribeSyncAppearanceDraft = null;
    this.appearanceFields = [];
    this.openAppearanceField = null;
    this.onAppearancePointerDown = this.#onAppearancePointerDown.bind(this);
    this.onAppearanceKeyDown = this.#onAppearanceKeyDown.bind(this);
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
    dataHandlerStore.addEventListener('change', this.onDataHandlerChange);
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

    this.unsubscribeSyncAppearanceDraft = onMessage('syncAppearanceDraft',
      /**
        * @param detail {{languageId: number, table: string, scrollPositionId: string, values: Record<string, string>}}
       */
      (detail) => {
        if (detail.languageId === window.veInfo.languageId) {
          return;
        }
        if (detail.table !== this.table || detail.scrollPositionId !== this.scrollPositionId) {
          return;
        }
        requestAppearancePreview(this, detail.values);
      });

    if (this.parentElement.tagName.toLowerCase() !== 've-content-area') {
      let message = 'parent of ve-content-element must be ve-content-area, found ' + this.parentElement.tagName.toLowerCase();
      message += '\n' + 'drag and drop is disabled for this element.';
      console.warn(message);
    }
  }

  disconnectedCallback() {
    this.#setOpenAppearanceField(null);
    clearTimeout(this.leaveTimer);
    this.resizeObserver.disconnect();
    dragInProgressStore.removeEventListener('change', this.onDragInProgressChange);
    showHiddenActive.removeEventListener('change', this.onShowHiddenChange);
    dataHandlerStore.removeEventListener('change', this.onDataHandlerChange);
    this.unsubscribeSyncContentElementDeleted?.();
    this.unsubscribeSyncContentElementDeleted = null;
    this.unsubscribeSyncContentElementMoved?.();
    this.unsubscribeSyncContentElementMoved = null;
    this.unsubscribeSyncAppearanceDraft?.();
    this.unsubscribeSyncAppearanceDraft = null;

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
      // whole pixels, so the action bar and its cut-out in the spotlight do not end in the middle of a pixel
      '--ve-frame-top': rect ? `${Math.round(rect.top)}px` : null,
      '--ve-frame-left': rect ? `${Math.round(rect.left)}px` : null,
      '--ve-frame-width': rect ? `${Math.round(rect.width)}px` : null,
      '--ve-frame-height': rect ? `${Math.round(rect.height)}px` : null,
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
    // an open menu is closed together with the action bar
    if (this.openAppearanceField !== null && !this.isHovered && !this.isFocusWithin) {
      this.#setOpenAppearanceField(null);
    }
  }

  /**
   * The marks of the unsaved appearance values follow the data handler, for example when it was saved.
   * @param {CustomEvent<{scope: string, kind: string, table?: string, uid?: number}>} event
   */
  #onDataHandlerChange(event) {
    if (this.appearanceFields.length && (event.detail.scope === 'global' || (event.detail.table === this.table && event.detail.uid === this.uid))) {
      this.requestUpdate();
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

    for (const field of this.appearanceFields) {
      dataHandlerStore.setInitialData(this.table, this.uid, field.name, field.value);
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
    const appearanceLabel = lll('frontend.appearance');
    const unsavedLabel = lll('frontend.unsavedChange');
    const headline = `${(this.canBeMoved && this.hasContentAreaAsParent) ? '⠿ ' : ''}${window.veInfo.showIdWithTitle ? `[${this.uid}] ` : ''}${this.elementName}`;
    const actionBar = html`
      <ve-drag-handle
        table="${this.table}" uid="${this.uid}" CType="${this.CType}"
        class="action-bar${this.isHidden ? ' hidden' : ''}${this.dragInProgress ? ' dragAndDropActive' : ''}${(this.isHovered || this.isFocusWithin) ? ' hovered' : ''}"
        isActive="${(this.canBeMoved && this.hasContentAreaAsParent) ? 'true' : 'false'}"
        role="region"
        aria-label="${lll('frontend.actionBar')}"
      >
        <span class="action-bar-headline" title="uid:${this.uid}">
          ${headline}
        </span>
        <!-- TODO extract button bar as separate component -->
        ${
          this.appearanceFields.length ?
            html`
              <div class="appearance" role="group" aria-label="${appearanceLabel}" aria-busy="${this.appearanceLoading}">
                ${this.appearanceFields.map((field) => {
                  const isOpen = this.openAppearanceField === field.name;
                  const isChanged = dataHandlerStore.hasChangedData(this.table, this.uid, field.name);
                  const triggerLabel = `${field.label}: ${field.valueLabel}${isChanged ? ` (${unsavedLabel})` : ''}`;
                  return html`
                    <div class="appearance-field${isOpen ? ' open' : ''}${isChanged ? ' changed' : ''}">
                      <button class="button appearance-trigger" tabindex="0" type="button" aria-haspopup="menu" aria-expanded="${isOpen}" title="${triggerLabel}" aria-label="${triggerLabel}" @click="${() => this._toggleAppearanceMenu(field.name)}">
                        ${field.valueIcon ? html`<typo3-backend-icon class="appearance-icon" identifier="${field.valueIcon}" size="default"></typo3-backend-icon>` : ''}
                        ${field.label}
                      </button>
                      ${isOpen ?
                        html`
                        <div class="appearance-menu" role="menu" aria-label="${field.label}" @keydown="${this._onAppearanceMenuKeyDown}">
                          ${(field.items ?? [{value: field.value, label: field.valueLabel, icon: field.valueIcon}]).map(item => html`
                            <button class="appearance-item" type="button" role="menuitemradio" aria-checked="${item.value === field.value}" ?disabled="${!field.items}" @click="${() => this._chooseAppearanceItem(field.name, item.value)}">
                              ${item.icon ? html`<typo3-backend-icon class="appearance-icon" identifier="${item.icon}" size="default"></typo3-backend-icon>` : ''}
                              ${item.label}
                            </button>
                          `)}
                        </div>
                      `
                        : ''}
                    </div>
                  `;
                })}
              </div>
            `
            : ''
        }
        ${
          this.editContentContextualUrl ?
            html`
              <typo3-backend-contextual-record-edit-trigger
                url="${this.editContentContextualUrl}"
                edit-url="${this.editContentUrl}"
                class="button end"
                title="${editLabel}"
                aria-label="${editLabel}"
              >
                <ve-icon name="actions-open"></ve-icon>
              </typo3-backend-contextual-record-edit-trigger>
            `
            : html`
              <a class="button end" tabindex="0" type="button" href="${this.editContentUrl}" @click="${this._openEdit}" title="${editLabel}" aria-label="${editLabel}">
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
      flex-wrap: wrap;
      align-items: center;
      opacity: 0;
      pointer-events: none;
      gap: 2px;
      position: absolute;
      /* sits on the top edge of the frame */
      bottom: calc(100% - var(--ve-frame-top, 0px));
      left: calc(var(--ve-frame-left, 0px) - 1px);
      /* at least as wide as the frame, it grows if the buttons need more room */
      box-sizing: border-box;
      min-width: calc(var(--ve-frame-width, 0px) + 2px);
      background: var(--ve-toolbar-bg, var(--ve-surface, #171717));
      color: var(--ve-on-surface, #d9d9d9);
      border: 0;
      padding: 4px 6px;
      border-radius: 3px 3px 0 0;
      /* the first shadow covers a gap of a pixel between the bar and the cut-out of the spotlight */
      box-shadow: 0 0 0 1px var(--ve-toolbar-bg, var(--ve-surface, #171717)), 0 -4px 14px rgba(0, 0, 0, 0.25);
      z-index: 10100;
      font-size: var(--ve-font-size, 14px);
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

    /* The action bar appears at once. The spotlight cuts a hole around it as soon as it is hovered, so a fade-in would
       show the bright page through the hole. Fading out is fine, the hole is closed by then. */
    .action-bar.hovered,
    .action-bar:focus-within {
      opacity: 1;
      pointer-events: initial;
      transition: none;
    }

    .action-bar.dragAndDropActive {
      display: none;
    }

    .action-bar.hidden {
      display: flex;
      opacity: 0.75;
      pointer-events: initial;
    }

    .appearance {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px;
      margin-inline-start: 4px;
      padding-inline-start: 6px;
      border-inline-start: 1px solid color-mix(in srgb, var(--ve-on-surface, #d9d9d9) 30%, transparent);
    }

    .appearance-field {
      position: relative;
    }

    .appearance-field.open .appearance-trigger {
      background-color: color-mix(in srgb, var(--ve-accent, #5432fe) 28%, transparent);
    }

    .appearance-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.4em;
      font: inherit;
      white-space: nowrap;
    }

    /* the icons of the values, the size of icons of the default size follows the font size */
    .appearance-icon {
      flex: none;
      font-size: 18px;
      border-radius: 2px;
      background: color-mix(in srgb, var(--ve-on-surface, #d9d9d9) 14%, transparent);
    }

    .appearance-item .appearance-icon {
      font-size: 26px;
    }

    /* an unsaved value */
    .appearance-field.changed .appearance-trigger::before {
      content: '';
      width: 6px;
      height: 6px;
      margin-inline-end: 0.5em;
      border-radius: 50%;
      background: var(--ve-accent, #5432fe);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--ve-on-surface, #d9d9d9) 60%, transparent);
    }

    .appearance-menu.align-end {
      left: auto;
      right: 0;
    }

    .appearance-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 10200;
      display: flex;
      flex-direction: column;
      min-width: 100%;
      max-height: 50vh;
      overflow-y: auto;
      padding: 4px;
      background: var(--ve-toolbar-bg, var(--ve-surface, #171717));
      color: var(--ve-on-surface, #d9d9d9);
      border-radius: 3px;
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--ve-on-surface, #d9d9d9) 18%, transparent), 0 4px 14px rgba(0, 0, 0, 0.35);
    }

    .appearance-item {
      display: flex;
      align-items: center;
      gap: 0.6em;
      width: 100%;
      font: inherit;
      text-align: start;
      white-space: nowrap;
      color: inherit;
      background: transparent;
      border: 0;
      border-radius: 2px;
      padding: 0.3em 0.8em 0.3em 0.5em;
      cursor: pointer;
    }

    /* a column for the check mark, so that the icons and the labels of all options line up */
    .appearance-item::before {
      content: '';
      flex: none;
      width: 1em;
      text-align: center;
    }

    .appearance-item[aria-checked="true"] {
      font-weight: 600;
    }

    .appearance-item[aria-checked="true"]::before {
      content: '✓';
    }

    .appearance-item:hover,
    .appearance-item:focus-visible {
      background-color: color-mix(in srgb, var(--ve-accent, #5432fe) 28%, transparent);
      outline: none;
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

    /* the edit button and the buttons after it sit at the end of the bar, like in the page module */
    .button.end {
      margin-inline-start: auto;
    }

    /* the icons of the buttons are as big as the ones of the layout module */
    .button ve-icon {
      font-size: 16px;
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
