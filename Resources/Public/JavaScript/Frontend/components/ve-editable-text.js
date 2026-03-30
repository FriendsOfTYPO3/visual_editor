import {css, html, LitElement} from 'lit';
import {lll} from '@typo3/core/lit-helper.js';
import {classMap} from 'lit/directives/class-map.js';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';
import {showEmptyActive} from '@typo3/visual-editor/Shared/local-stores';
import '@typo3/visual-editor/Frontend/components/ve-icon';
import '@typo3/visual-editor/Frontend/components/ve-validation-overlay';
import {getEditValue, insertTextAtSelection} from '@typo3/visual-editor/Frontend/components/ve-editable-text/editing';
import {getValidationIssues, normalizeValue} from '@typo3/visual-editor/Frontend/components/ve-editable-text/validation';

/**
 * @extends {HTMLElement}
 */
export class VeEditableText extends LitElement {
  static properties = {
    changed: {type: Boolean, reflect: true},
    value: {type: String, reflect: true},

    name: {type: String},
    table: {type: String},
    uid: {type: Number},
    field: {type: String},
    valueInitial: {type: String},
    placeholder: {type: String},
    allowNewlines: {type: Boolean},
    validation: {type: Object},
    invalid: {type: Boolean, reflect: true},
    validationErrors: {type: Array},
    showEmpty: {type: Boolean},
    focused: {type: Boolean},
    hovered: {type: Boolean},
  };

  constructor() {
    super();

    this.value = this.getAttribute('value') ?? '';
    this.valueInitial = this.value;
    this.validation = this.getAttribute('validation') || {};
    this.invalid = false;
    this.validationErrors = [];
    this.showEmpty = showEmptyActive.get();
    this.focused = false;
    this.hovered = false;
    this.shakeTimeout = null;
    this.deniedInputPulseTimeout = null;
    this.skipNextValueNormalization = false;
    this.onClick = this.#onClick.bind(this);
    this.onMousedown = this.#onMousedown.bind(this);
    this.onPointerdown = this.#onPointerdown.bind(this);
    this.onDragstart = this.#onDragstart.bind(this);
    this.onMouseover = this.#onMouseover.bind(this);
    this.onMouseout = this.#onMouseout.bind(this);
    this.onMouseenter = this.#onMouseenter.bind(this);
    this.onMouseleave = this.#onMouseleave.bind(this);
    this.onContextmenu = this.#onContextmenu.bind(this);
    this.onShowEmptyChange = this.#onShowEmptyChange.bind(this);
    this.onDataHandlerChange = this.#onDataHandlerChange.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('click', this.onClick);
    this.addEventListener('mousedown', this.onMousedown);
    this.addEventListener('pointerdown', this.onPointerdown);
    this.addEventListener('dragstart', this.onDragstart);
    this.addEventListener('mouseover', this.onMouseover);
    this.addEventListener('mouseout', this.onMouseout);
    this.addEventListener('mouseenter', this.onMouseenter);
    this.addEventListener('mouseleave', this.onMouseleave);
    this.addEventListener('contextmenu', this.onContextmenu);
    showEmptyActive.addEventListener('change', this.onShowEmptyChange);
    dataHandlerStore.addEventListener('change', this.onDataHandlerChange);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('mousedown', this.onMousedown);
    this.removeEventListener('pointerdown', this.onPointerdown);
    this.removeEventListener('dragstart', this.onDragstart);
    this.removeEventListener('mouseover', this.onMouseover);
    this.removeEventListener('mouseout', this.onMouseout);
    this.removeEventListener('mouseenter', this.onMouseenter);
    this.removeEventListener('mouseleave', this.onMouseleave);
    this.removeEventListener('contextmenu', this.onContextmenu);
    showEmptyActive.removeEventListener('change', this.onShowEmptyChange);
    dataHandlerStore.removeEventListener('change', this.onDataHandlerChange);
    if (this.shakeTimeout) {
      clearTimeout(this.shakeTimeout);
      this.shakeTimeout = null;
    }
    if (this.deniedInputPulseTimeout) {
      clearTimeout(this.deniedInputPulseTimeout);
      this.deniedInputPulseTimeout = null;
    }
    this.shadowRoot?.querySelector('ve-validation-overlay')?.clear();

    super.disconnectedCallback();
  }

  /**
   * @param changedProperties {Map<PropertyKey, unknown>}
   */
  firstUpdated(changedProperties) {
    this.placeholder = '👀' + this.title;
    this.skipNextValueNormalization = true;
    this.#setSlotText(this.valueInitial);
    dataHandlerStore.setInitialData(this.table, this.uid, this.field, this.valueInitial);
    this.#applyValidationState(this.valueInitial);
  }

  updated(changedProperties) {
    this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    if (changedProperties.has('value') || changedProperties.has('validation')) {
      if (this.skipNextValueNormalization) {
        this.skipNextValueNormalization = false;
        this.#applyValidationState(this.value);
      } else {
        this.#validateAndStore(this.value);
      }
    }

    const hideEmpty = !this.showEmpty && this.value === '' && !this.focused && !this.changed && !this.invalid;
    if (hideEmpty) {
      this.style.display = 'none';
      if (this.parentElement.innerText.trim() === '') {
        this.parentElement.style.display = 'none';
      }
    } else {
      this.style.display = '';
      this.parentElement.style.display = '';
    }
  }

  onReset = () => {
    this.value = this.valueInitial;
    this.#setSlotText(this.valueInitial);
    this.skipNextValueNormalization = true;
    this.#applyValidationState(this.valueInitial);
    dataHandlerStore.setData(this.table, this.uid, this.field, this.valueInitial);
  };

  /**
   * @api used by initialize-save-handling.js focusFirstInvalidField function
   */
  focusEditable() {
    this.style.display = '';
    if (this.parentElement) {
      this.parentElement.style.display = '';
    }
    this.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'auto',
    });

    const slot = this.shadowRoot?.querySelector('.slot');
    slot?.focus({preventScroll: true});
  }

  render() {
    const showValidationErrors = this.hovered || this.focused;
    const showInvalidIcon = this.invalid;
    const buttonControls = [];

    if (showInvalidIcon) {
      buttonControls.push(html`
        <span class="status-icon" title="${this.validationErrors[0] || ''}" aria-hidden="true">
          <ve-icon name="actions-exclamation-circle-alt" width="100%"></ve-icon>
        </span>
      `);
    }

    if (this.changed) {
      buttonControls.push(html`
        <ve-reset-button @click="${this.onReset}"></ve-reset-button>
      `);
    }

    const buttonCount = buttonControls.length;
    const buttons = buttonCount > 0 ? html`
      <div class="buttons">
        ${buttonControls}
      </div>` : html``;
    const shouldBeInline = this.shouldBeInline();

    this.classList.toggle('block', !shouldBeInline);

    const slot = this.shadowRoot?.querySelector('.slot');
    const showPlaceholder = !this.focused && !(slot?.innerText || this.value).length;
    return html`
      <span
        class=${classMap({
          slot: true,
          changed: this.changed,
          invalid: this.invalid,
          block: !shouldBeInline,
        })}
        style="--button-count: ${buttonCount};"
        contenteditable="plaintext-only"
        role="textbox"
        aria-invalid="${this.invalid ? 'true' : 'false'}"
        spellcheck="true"
        data-placeholder="${showPlaceholder ? (this.placeholder || '\u200B'/* placeholder keeps firefox from breaking out*/) : ''}"
        @focus="${() => {
          this.#handleFocus();
        }}"
        @beforeinput="${(event) => {
          this.#handleBeforeInput(event.currentTarget, event);
        }}"
        @input="${(event) => {
          this.#handleInput();
        }}"
        @blur="${(event) => {
          this.#handleBlur();
        }}"
      ></span>
      ${buttons}
      <ve-validation-overlay
        .validationErrors=${showValidationErrors ? this.validationErrors : []}
      ></ve-validation-overlay>
    `;
  }

  shouldBeInline() {
    const parentStyle = getComputedStyle(this.parentElement);
    const parentIsInline = parentStyle.display.startsWith('inline');
    if (parentIsInline) {
      return true;
    }

    // if parent is display: flex + flex-direction: column, we need to be block
    const parentIsFlexColumn = parentStyle.display === 'flex' && parentStyle.flexDirection === 'column';
    if (parentIsFlexColumn) {
      return false;
    }

    let childNodes = [...this.parentElement.childNodes].filter((node) => {
      // if text not and not just whitespace
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim().length > 0;
      }

      return true;
    });

    // if there are other child nodes, we should be inline
    return childNodes.length > 1;
  }

  #getClosestAnchor() {
    const aTag = this.closest('a');
    if (!(aTag instanceof HTMLAnchorElement)) {
      return null;
    }
    aTag.dataset.veHref = aTag.dataset.veHref || aTag.href;
    return aTag;
  }

  #onClick(e) {
    e.stopPropagation();
  }

  #onMousedown(e) {
    e.stopPropagation();

    const aTag = this.#getClosestAnchor();
    if (!aTag) {
      return;
    }

    const ctrlPressed = e.ctrlKey || e.metaKey;
    const middleClick = e.button === 1;
    if (ctrlPressed || middleClick) {
      e.preventDefault();
      aTag.href = aTag.dataset.veHref;

      const target = aTag.target;
      aTag.target = '_self';
      aTag.click();

      setTimeout(() => {
        aTag.target = target;
        aTag.removeAttribute('href');
      });
    }
  }

  #onPointerdown(e) {
    e.stopPropagation();
  }

  #onDragstart(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  #onMouseover() {
    const aTag = this.#getClosestAnchor();
    aTag?.removeAttribute('href');
  }

  #onMouseout() {
    const aTag = this.#getClosestAnchor();
    if (aTag) {
      aTag.href = aTag.dataset.veHref;
    }
  }

  #onMouseenter() {
    this.hovered = true;
  }

  #onMouseleave() {
    this.hovered = false;
  }

  #onContextmenu() {
    const aTag = this.#getClosestAnchor();
    if (!aTag) {
      return;
    }

    aTag.href = aTag.dataset.veHref;
    setTimeout(() => aTag.removeAttribute('href'));
  }

  #onShowEmptyChange() {
    this.showEmpty = showEmptyActive.get();
  }

  #onDataHandlerChange(event) {
    if (!this.#isRelevantDataHandlerEvent(event.detail)) {
      return;
    }

    this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    this.valueInitial = dataHandlerStore.initialData[this.table]?.[this.uid]?.[this.field] ?? this.valueInitial;
    const storedValue = dataHandlerStore.data[this.table]?.[this.uid]?.[this.field] ?? this.valueInitial;
    const slot = this.shadowRoot?.querySelector('.slot');
    const isFocused = this.matches(':focus-within');
    if (!isFocused && storedValue?.trim() !== slot?.innerText?.trim()) {
      this.skipNextValueNormalization = true;
      this.value = storedValue ?? this.value;
      this.#setSlotText(this.value);
    }
  }

  /**
   * @param {string} value
   */
  #setSlotText(value) {
    const element = this.shadowRoot?.querySelector('.slot');
    if (element) {
      element.innerText = value;
    }
  }

  #getSlotText() {
    return this.shadowRoot?.querySelector('.slot')?.innerText.replace(/\n$/, '') ?? '';
  }

  /**
   * @param {HTMLElement} element
   * @param {InputEvent} event
   */
  #handleBeforeInput(element, event) {
    const edit = getEditValue(element, event);
    if (edit === null) {
      return;
    }

    if (edit.type === 'delete') {
      return;
    }

    if (edit.type === 'insertBreak') {
      if (!this.allowNewlines) {
        event.preventDefault();
        this.#showDeniedInputReason(lll('inputDenial.noNewlines'), element);
      }
      return;
    }

    const {text, reasons} = normalizeValue(edit.insertedText, this.validation);
    let insertedText = text;

    for (const reason of reasons) {
      this.#showDeniedInputReason(lll(reason.key, ...(reason.args || [])), element);
    }

    const nextValue = edit.currentValue.slice(0, edit.start) + insertedText + edit.currentValue.slice(edit.end);

    if (!this.allowNewlines) {
      if (insertedText.match(/\n/)) {
        insertedText = insertedText.replaceAll(/\n/g, '');
        this.#showDeniedInputReason(lll('inputDenial.noNewlines'), element);
      }
    }

    const max = Number(this.validation?.max || 0);
    if (max > 0 && nextValue.length > max) {
      insertedText = insertedText.slice(0, max - edit.currentValue.length + (edit.end - edit.start));
      this.#showDeniedInputReason(lll('validation.max', max), element);
    }

    if (insertedText !== edit.insertedText) {
      event.preventDefault();
      insertTextAtSelection(element, insertedText);
      this.#validateAndStore(this.#getSlotText());
    }
  }

  #handleInput() {
    this.#validateAndStore(this.#getSlotText());
  }

  #handleFocus() {
    this.focused = true;
  }

  #handleBlur() {
    this.focused = false;
    this.#setSlotText(this.#validateAndStore(this.#getSlotText()));
  }

  /**
   * @param {string} reason
   * @param {HTMLElement} element
   */
  #showDeniedInputReason(reason, element) {
    if (!reason) {
      return;
    }

    this.#shakeInvalidInput(element);
    this.#restartDeniedInputPulse(element);
    this.shadowRoot?.querySelector('ve-validation-overlay')?.show(reason);
  }

  /**
   * @param {HTMLElement} element
   */
  #shakeInvalidInput(element) {
    element.classList.remove('shake-invalid');
    void element.offsetWidth;
    element.classList.add('shake-invalid');
    if (this.shakeTimeout) {
      clearTimeout(this.shakeTimeout);
    }
    this.shakeTimeout = setTimeout(() => {
      element.classList.remove('shake-invalid');
      this.shakeTimeout = null;
    }, 250);
  }

  /**
   * @param {HTMLElement} element
   */
  #restartDeniedInputPulse(element) {
    element.classList.remove('deniedInputPulse');
    void element.offsetWidth;
    element.classList.add('deniedInputPulse');
    if (this.deniedInputPulseTimeout) {
      clearTimeout(this.deniedInputPulseTimeout);
    }
    this.deniedInputPulseTimeout = setTimeout(() => {
      element.classList.remove('deniedInputPulse');
      this.deniedInputPulseTimeout = null;
    }, 2000);
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  #validateAndStore(value) {
    this.value = value;
    this.#applyValidationState(value);

    let normalizedValue = normalizeValue(value, this.validation).text;

    const min = Number(this.validation?.min || 0);
    const isRequired = Boolean(this.validation?.required || false);
    if (normalizedValue.length < min && !isRequired) {
      normalizedValue = '';
    }

    const max = Number(this.validation?.max || 0);
    if (max > 0 && normalizedValue.length > max) {
      normalizedValue = normalizedValue.slice(0, max);
    }

    dataHandlerStore.setData(this.table, this.uid, this.field, normalizedValue);
    return normalizedValue;
  }

  /**
   * @param {string} value
   */
  #applyValidationState(value) {
    const validationErrors = getValidationIssues(value, this.validation)
      .map(({key, args = []}) => lll(key, ...args));
    this.invalid = validationErrors.length > 0;
    this.validationErrors = validationErrors;

    dataHandlerStore.setInvalid(this.table, this.uid, this.field, this.invalid);
  }

  #isRelevantDataHandlerEvent(detail) {
    if (!detail || detail.scope === 'global') {
      return true;
    }

    return detail.table === this.table
      && detail.uid === this.uid
      && detail.field === this.field;
  }

  static styles = css`
    :host {
      position: relative;
      display: inline-block;
      --button-size: min(0.8em, 32px);
    }

    :host(.block) {
      display: block;
    }

    .slot {
      min-width: 15px;
      display: inline-block;
      min-height: 1lh;
      cursor: text;

      border-radius: 4px;
      /*
      // problem with this: (inset shadow is cut off)
      //border-top: 4px solid transparent;
      //border-bottom: 4px solid transparent;
      //border-left: 4px solid transparent;
      //border-right: max(5px, calc(0.8em * var(--button-count) + 5px * 2 * var(--button-count)));
      //box-sizing: content-box !important;

      // problem with this: element is to big, even if margin is negative */
      --padding-right: calc(4px + var(--button-size) * var(--button-count) + 4px * 2 * var(--button-count));
      padding: 4px var(--padding-right) 4px 4px;
      margin: -4px;
      outline: 0.25rem solid transparent;

      transition: backdrop-filter 0.2s;

      &:before {
        content: attr(data-placeholder);
        font-style: italic;
      }
    }

    .slot:hover, .slot:focus {
      box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.50) inset;
      backdrop-filter: blur(10px) invert(20%);
      outline-color: #5432fe;
    }

    .slot.block {
      display: block;
    }

    .slot.changed {
      backdrop-filter: blur(10px) hue-rotate(120deg) invert(30%);
    }

    .slot.invalid {
      outline-color: #a40000;
      box-shadow: 0 0 4px 0 rgba(164, 0, 0, 0.7) inset;
    }

    .slot.shake-invalid {
      animation: shake-invalid 0.2s ease-in-out;
    }

    .slot.deniedInputPulse {
      outline-color: #a40000;
      box-shadow: 0 0 4px 0 rgba(164, 0, 0, 0.7) inset;
    }

    .slot.deniedInputPulse {
      animation: denied-input-pulse 4s ease-out;
    }

    .slot.shake-invalid.deniedInputPulse {
      animation: shake-invalid 0.2s ease-in-out, denied-input-pulse 4s ease-out;
    }

    .buttons {
      display: inline-flex;
      align-items: center;
      gap: 4px;

      position: absolute;
      right: 4px;
      top: 0;
      bottom: 0;

      pointer-events: none;

      & > * {
        height: var(--button-size);
        aspect-ratio: 1;

        cursor: pointer;
        pointer-events: initial;

        background-size: contain;

        &:hover, &:focus {
          color: black;
          background-color: #e6e6e6;
        }
      }
    }

    .status-icon {
      color: #a40000;
      pointer-events: none;
      cursor: default;

      ve-icon {
        display: block;
      }
    }

    @keyframes shake-invalid {
      0% {
        transform: translateX(0);
      }

      25% {
        transform: translateX(-3px);
      }

      50% {
        transform: translateX(3px);
      }

      75% {
        transform: translateX(-2px);
      }

      100% {
        transform: translateX(0);
      }
    }

    @keyframes denied-input-pulse {
      0% {
        outline-color: rgba(164, 0, 0, 1);
        box-shadow: 0 0 4px 0 rgba(164, 0, 0, 0.7) inset;
      }

      100% {
        outline-color: rgba(164, 0, 0, 0);
        box-shadow: 0 0 4px 0 rgba(164, 0, 0, 0) inset;
      }
    }
  `;
}

customElements.define('ve-editable-text', VeEditableText);
