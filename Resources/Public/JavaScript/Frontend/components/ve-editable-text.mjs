import {css, html, LitElement} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {dataHandlerStore} from "@typo3/visual-editor/Frontend/stores/data-handler-store.mjs";
import {showEmptyActive} from "@typo3/visual-editor/Shared/stores.js";

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
    allowNewLines: {type: Boolean,},
    showEmpty: {type: Boolean,},
  };

  constructor() {
    super();
    this.value = this.innerText;
    this.valueInitial = this.value;
    this.innerText = '';
    this.addEventListener('click', (e) => {
      e.stopPropagation();
    })
    this.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    })
    this.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    })
    this.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
    })
    this.showEmpty = showEmptyActive.get();
    showEmptyActive.addEventListener('currentWindowChange', () => {
      this.showEmpty = showEmptyActive.get();
    });
    dataHandlerStore.addEventListener('change', () => {
      this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
      this.valueInitial = dataHandlerStore.initialData[this.table]?.[this.uid]?.[this.field] ?? this.valueInitial;
    })
  }

  /**
   * @param changedProperties {Map<PropertyKey, unknown>}
   */
  firstUpdated(changedProperties) {
    if (this.placeholder === '') {
      this.placeholder = this.title;
    }
    const aTag = this.closest('a');
    if (aTag) {
      // disable links above editable inputs to prevent navigation when clicking
      aTag.dataset.href = aTag.href;
      aTag.removeAttribute('href');
    }
    this.shadowRoot.querySelector('.slot').innerText = this.valueInitial || '';
    dataHandlerStore.setInitialData(this.table, this.uid, this.field, this.valueInitial);
  }

  updated(changedProperties) {
    this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    dataHandlerStore.setData(this.table, this.uid, this.field, this.value);

    const hideEmpty = !this.showEmpty && this.value === '' && !this.matches(':focus-within') && !this.changed;
    if (hideEmpty) {
      this.style.display = 'none';
      if (this.parentElement.innerText === '') {
        this.parentElement.display = 'none';
      }
    } else {
      this.style.display = '';
      this.parentElement.display = '';
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
    const parentIsInline = getComputedStyle(this.parentElement).display.startsWith('inline');
    /** @type {HTMLElement} */
    const e = this;
    this.classList.toggle('block', !parentIsInline);
    return html`
      <span
        class=${classMap({slot: true, synced: this.isSynced, changed: this.changed, block: !parentIsInline})}
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
          if (event.which === 13 && !this.allowNewLines) {
            event.preventDefault();
          }
        }}"
      ></span>
      ${buttons}
    `;
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

      &:before {
        content: attr(data-placeholder);
        color: #555;
      }
    }

    .slot:hover, .slot:focus {
      box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.50) inset;
      outline: 0;
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
