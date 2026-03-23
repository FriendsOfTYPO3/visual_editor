import {css, html, LitElement} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';
import {showEmptyActive} from '@typo3/visual-editor/Shared/local-stores';

/**
 * @extends {HTMLElement}
 */
export class VeEditableText extends LitElement {
  static properties = {
    changed: {type: Boolean, reflect: true,},
    value: {type: String, reflect: true,},

    name: {type: String,},
    table: {type: String,},
    uid: {type: Number,},
    field: {type: String,},
    valueInitial: {type: String,},
    placeholder: {type: String,},
    allowNewlines: {type: Boolean,},
    showEmpty: {type: Boolean,},
  };

  constructor() {
    super();

    this.value = this.getAttribute('value');
    this.valueInitial = this.value;
    this.innerText = '';
    this.showEmpty = showEmptyActive.get();
    this.onClick = this.#onClick.bind(this);
    this.onMousedown = this.#onMousedown.bind(this);
    this.onPointerdown = this.#onPointerdown.bind(this);
    this.onDragstart = this.#onDragstart.bind(this);
    this.onMouseover = this.#onMouseover.bind(this);
    this.onMouseout = this.#onMouseout.bind(this);
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
    this.removeEventListener('contextmenu', this.onContextmenu);
    showEmptyActive.removeEventListener('change', this.onShowEmptyChange);
    dataHandlerStore.removeEventListener('change', this.onDataHandlerChange);

    super.disconnectedCallback();
  }

  /**
   * @param changedProperties {Map<PropertyKey, unknown>}
   */
  firstUpdated(changedProperties) {
    this.placeholder = '👀' + (this.placeholder || this.title);
    this.shadowRoot.querySelector('.slot').innerText = this.valueInitial || '';
    dataHandlerStore.setInitialData(this.table, this.uid, this.field, this.valueInitial);
  }

  updated(changedProperties) {
    this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    if (changedProperties.has('value')) {
      dataHandlerStore.setData(this.table, this.uid, this.field, this.value);
    }

    const hideEmpty = !this.showEmpty && this.value === '' && !this.matches(':focus-within') && !this.changed;
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
    this.shadowRoot.querySelector('.slot').innerText = this.valueInitial;
  };

  render() {
    let buttonCount = 0;
    let buttons = html``;
    if (this.changed) {
      buttonCount = 1;
      buttons = html`
        <div class="buttons">
          <ve-reset-button @click="${this.onReset}"></ve-reset-button>
        </div>`;
    }
    const shouldBeInline = this.shouldBeInline();

    this.classList.toggle('block', !shouldBeInline);
    return html`
      <span
        class=${classMap({slot: true, synced: this.isSynced, changed: this.changed, block: !shouldBeInline})}
        style="--button-count: ${buttonCount};"
        contenteditable="${this.isSynced ? 'false' : 'plaintext-only'}"
        role="textbox"
        spellcheck="true"
        data-placeholder="${this.value.length ? '' : (this.placeholder || '\u200B'/* placeholder keeps firefox from breaking out*/)}"
        @input="${(event) => {
          this.value = event.currentTarget.innerText.trim();
          if (this.value.length === 0) {
            this.shadowRoot.querySelector('.slot').innerText = '';
          }
        }}"
        @blur="${() => this.shadowRoot.querySelector('.slot').innerText = this.value}"
        @keypress="${(event) => {
          if (event.which === 13 && !this.allowNewlines) {
            event.preventDefault();
          }
        }}"
      ></span>
      ${buttons}
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

  #onDataHandlerChange() {
    this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    this.valueInitial = dataHandlerStore.initialData[this.table]?.[this.uid]?.[this.field] ?? this.valueInitial;
    const storedValue = dataHandlerStore.data[this.table]?.[this.uid]?.[this.field] ?? this.valueInitial;
    const slot = this.shadowRoot?.querySelector('.slot');
    if (storedValue?.trim() !== slot?.innerText?.trim()) {
      this.value = storedValue ?? this.value;
      if (slot) {
        slot.innerText = this.value;
      }
    }
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

      transition: box-shadow 0.2s, backdrop-filter 0.2s, outline 0.2s;

      &:before {
        content: attr(data-placeholder);
        font-style: italic;
      }
    }

    .slot:hover, .slot:focus {
      box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.50) inset;
      backdrop-filter: blur(10px) invert(20%);
      outline: 0.25rem solid #5432fe;
    }

    .slot.block {
      display: block;
    }

    .slot.synced {
      /* blur the text: */
      user-select: none;
      // TODO use backdrop-filter
      color: #888;
      background: #f2f2f2;
      outline-color: #bfbfbf;
      cursor: not-allowed;
    }

    .slot.changed {
      backdrop-filter: blur(10px) hue-rotate(120deg) invert(30%);
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
  `;
}

customElements.define('ve-editable-text', VeEditableText);
