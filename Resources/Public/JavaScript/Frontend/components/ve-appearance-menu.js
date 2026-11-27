import {css, html, LitElement} from 'lit';
import {lll} from '@typo3/core/lit-helper.js';
import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';
import {requestAppearancePreview} from '@typo3/visual-editor/Frontend/appearance-preview/request-appearance-preview';
import {fetchAppearanceItems} from '@typo3/visual-editor/Frontend/appearance-preview/fetch-appearance-items';

/**
 * The select fields of a record (for example the frame class) as buttons with a menu in the action bar of a
 * ve-content-element. A change is shown at once, see request-appearance-preview, and saved with the other changes.
 */
export class VeAppearanceMenu extends LitElement {
  static properties = {
    table: {type: String},
    uid: {type: Number},
    fields: {type: Array},
    openField: {type: String, state: true, attribute: false},
    loading: {type: Boolean, state: true, attribute: false},
  };

  constructor() {
    super();
    this.fields = [];
    this.openField = null;
    this.onPointerDown = this.#onPointerDown.bind(this);
    this.onKeyDown = this.#onKeyDown.bind(this);
    this.onDataHandlerChange = () => this.requestUpdate();
    this.unsubscribeSyncAppearanceDraft = null;
  }

  /**
   * @returns {HTMLElement} the ve-content-element this menu is part of
   */
  get contentElement() {
    return this.getRootNode().host;
  }

  connectedCallback() {
    super.connectedCallback();
    for (const field of this.fields) {
      dataHandlerStore.setInitialData(this.table, this.uid, field.name, field.value);
    }

    dataHandlerStore.addEventListener('change', this.onDataHandlerChange);
    this.unsubscribeSyncAppearanceDraft = onMessage('syncAppearanceDraft',
      /**
        * @param detail {{languageId: number, table: string, scrollPositionId: string, values: Record<string, string>}}
       */
      (detail) => {
        const {scrollPositionId} = this.contentElement;
        if (detail.languageId === window.veInfo.languageId || detail.table !== this.table || detail.scrollPositionId !== scrollPositionId) {
          return;
        }
        requestAppearancePreview(this.contentElement, detail.values);
      });
  }

  disconnectedCallback() {
    this.close();
    dataHandlerStore.removeEventListener('change', this.onDataHandlerChange);
    this.unsubscribeSyncAppearanceDraft?.();
    this.unsubscribeSyncAppearanceDraft = null;
    super.disconnectedCallback();
  }

  close() {
    this.#setOpenField(null);
  }

  /**
   * @param {string|null} name
   */
  #setOpenField(name) {
    if (this.openField === name) {
      return;
    }

    this.openField = name;
    document.removeEventListener('pointerdown', this.onPointerDown);
    document.removeEventListener('keydown', this.onKeyDown);
    if (name === null) {
      return;
    }

    document.addEventListener('pointerdown', this.onPointerDown);
    document.addEventListener('keydown', this.onKeyDown);
    if (!this.fields.every(field => field.items)) {
      this.#loadItems();
    }
    this.updateComplete.then(() => {
      this.#alignMenu();
      this.renderRoot.querySelector('.item[aria-checked="true"]')?.focus();
    });
  }

  /**
   * A menu that would be wider than the space right of its button opens to the left, so the page does not get a horizontal scrollbar.
   */
  #alignMenu() {
    const menu = this.renderRoot.querySelector('.menu');
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
  #onPointerDown(event) {
    if (!event.composedPath().includes(this.renderRoot.querySelector('.field.open'))) {
      this.close();
    }
  }

  /**
   * @param {KeyboardEvent} event
   */
  #onKeyDown(event) {
    if (event.key === 'Escape') {
      const trigger = this.renderRoot.querySelector('.field.open .trigger');
      this.close();
      trigger?.focus();
    }
  }

  /**
   * Moves the focus in the open menu with the arrow keys.
   * @param {KeyboardEvent} event
   */
  _onMenuKeyDown(event) {
    const keys = {ArrowDown: 1, ArrowUp: -1, Home: 'first', End: 'last'};
    if (!(event.key in keys)) {
      return;
    }

    event.preventDefault();
    const items = [...event.currentTarget.querySelectorAll('.item:not([disabled])')];
    const current = items.indexOf(this.renderRoot.activeElement ?? document.activeElement);
    const move = keys[event.key];
    const target = move === 'first' ? 0 : move === 'last' ? items.length - 1 : (current + move + items.length) % items.length;
    items[target]?.focus();
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  async _chooseItem(name, value) {
    const trigger = this.renderRoot.querySelector('.field.open .trigger');
    this.close();
    trigger?.focus();
    if (this.fields.find(field => field.name === name)?.value !== value) {
      await this._change(name, value);
    }
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  async _change(name, value) {
    this.fields = this.fields.map(field => field.name === name ? this.#withValue(field, value) : field);
    dataHandlerStore.setData(this.table, this.uid, name, value);

    // the items of the other fields can depend on this value, and the other values can become invalid
    await this.#loadItems();
    this.#preview();
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
  async #loadItems() {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;

    try {
      const resolved = await fetchAppearanceItems({
        table: this.table,
        uid: this.uid,
        pageId: window.veInfo.pageId,
        fields: this.fields.map(field => field.name),
        values: Object.fromEntries(this.fields.map(field => [field.name, field.value])),
      }, controller.signal);

      // fields that the editor does not see in the edit form are not offered
      this.fields = this.fields.filter(field => resolved[field.name]).map((field) => {
        const {value, items} = resolved[field.name];
        if (value !== field.value) {
          dataHandlerStore.setData(this.table, this.uid, field.name, value);
        }
        return this.#withValue({...field, items}, value);
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('ve-appearance-menu: the items of the appearance fields could not be loaded.', error);
      }
    } finally {
      if (this.controller === controller) {
        this.loading = false;
        this.updateComplete.then(() => this.#alignMenu());
      }
    }
  }

  /**
   * Shows the unsaved values in the content element and in the translations of it.
   */
  #preview() {
    requestAppearancePreview(this.contentElement, Object.fromEntries(this.fields.map(field => [field.name, field.value])));

    // fields that are excluded from the translation have the same value in all languages
    const values = Object.fromEntries(this.fields.filter(field => field.translationExcluded).map(field => [field.name, field.value]));
    const {scrollPositionId} = this.contentElement;
    if (window.veInfo.languageId === 0 && this.table === 'tt_content' && scrollPositionId && Object.keys(values).length) {
      sendMessage('appearanceDraftChanged', {table: this.table, scrollPositionId, values}, 'parent');
    }
  }

  render() {
    const label = lll('frontend.appearance');
    const unsavedLabel = lll('frontend.unsavedChange');
    return html`
      <div class="appearance" role="group" aria-label="${label}" aria-busy="${this.loading}">
        ${this.fields.map((field) => {
          const isOpen = this.openField === field.name;
          const isChanged = dataHandlerStore.hasChangedData(this.table, this.uid, field.name);
          const triggerLabel = `${field.label}: ${field.valueLabel}${isChanged ? ` (${unsavedLabel})` : ''}`;
          return html`
            <div class="field${isOpen ? ' open' : ''}${isChanged ? ' changed' : ''}">
              <button class="trigger" tabindex="0" type="button" aria-haspopup="menu" aria-expanded="${isOpen}" title="${triggerLabel}" aria-label="${triggerLabel}" @click="${() => this.#setOpenField(isOpen ? null : field.name)}">
                ${field.valueIcon ? html`<typo3-backend-icon class="icon" identifier="${field.valueIcon}" size="default"></typo3-backend-icon>` : ''}
                ${field.label}
              </button>
              ${isOpen ?
                html`
                <div class="menu" role="menu" aria-label="${field.label}" @keydown="${this._onMenuKeyDown}">
                  ${(field.items ?? [{value: field.value, label: field.valueLabel, icon: field.valueIcon}]).map(item => html`
                    <button class="item" type="button" role="menuitemradio" aria-checked="${item.value === field.value}" ?disabled="${!field.items}" @click="${() => this._chooseItem(field.name, item.value)}">
                      ${item.icon ? html`<typo3-backend-icon class="icon" identifier="${item.icon}" size="default"></typo3-backend-icon>` : ''}
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
    `;
  }

  static styles = css`
    :host {
      display: contents;
    }

    .appearance {
      display: flex;
      align-items: center;
      gap: 2px;
      padding-inline: 4px;
    }

    .field {
      position: relative;
    }

    .trigger,
    .item {
      display: inline-flex;
      align-items: center;
      gap: 0.4em;
      font: inherit;
      color: #d9d9d9;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 0.2em;
      padding: 0.2em 0.5em;
      white-space: nowrap;
      cursor: pointer;
    }

    .trigger:hover,
    .field.open .trigger {
      border-color: #d9d9d9;
      background-color: #212121;
    }

    .trigger:focus-visible,
    .item:focus-visible {
      border-color: #d9d9d9;
      background-color: #212121;
      outline: 2px solid #5432fe;
      outline-offset: 2px;
    }

    /* the icons of the values, the size of icons of the default size follows the font size */
    .icon {
      flex: none;
      font-size: 18px;
      border-radius: 2px;
      background: rgba(217, 217, 217, 0.14);
    }

    .item .icon {
      font-size: 26px;
    }

    /* an unsaved value */
    .field.changed .trigger::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #5432fe;
      box-shadow: 0 0 0 1px rgba(217, 217, 217, 0.6);
    }

    .menu {
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
      background: #171717;
      color: #d9d9d9;
      border: 1px solid #d9d9d9;
      border-radius: 6px;
    }

    .menu.align-end {
      left: auto;
      right: 0;
    }

    .item {
      width: 100%;
      text-align: start;
      gap: 0.6em;
    }

    /* a column for the check mark, so that the icons and the labels of all options line up */
    .item::before {
      content: '';
      flex: none;
      width: 1em;
      text-align: center;
    }

    .item[aria-checked="true"] {
      font-weight: 600;
    }

    .item[aria-checked="true"]::before {
      content: '✓';
    }

    .item:hover {
      border-color: #d9d9d9;
      background-color: #212121;
    }
  `;
}

customElements.define('ve-appearance-menu', VeAppearanceMenu);
