import {css, html, LitElement} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {changesStore} from './changes-store.js';

/**
 * @extends {HTMLElement}
 */
export class EditableInput extends LitElement {
    static properties = {
        changed: {type: Boolean, reflect: true,},
        value: {type: String, reflect: true,},

        name: {type: String,},
        table: {type: String,},
        uid: {type: Number,},
        field: {type: String,},
        valueInitial: {type: String,},
        placeholder: {type: String,},
        langSyncUid: {type: Number,},
        langSyncUidInitial: {},
        allowNewLines: {type: Boolean, },
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
    }

    /**
     * @param changedProperties {Map<PropertyKey, unknown>}
     */
    firstUpdated(changedProperties) {
        const aTag = this.closest('a');
        if (aTag) {
          // disable links above editable inputs to prevent navigation when clicking
          aTag.dataset.href = aTag.href;
          aTag.removeAttribute('href');
        }
        this.shadowRoot.querySelector('.slot').innerText = this.valueInitial || '\n';
        this.langSyncUidInitial = this.langSyncUid;
        changesStore.setInitial(this.table, this.uid, this.field, this.valueInitial, this.isSynced ? this.langSyncUid : null);
    }

    get isSynced() {
        return typeof this.langSyncUid === 'number';
    }

    updated(changedProperties) {
        this.changed = this.value !== this.valueInitial;
        changesStore.set(this.table, this.uid, this.field, this.value, this.isSynced ? this.langSyncUid : null);

        if (changedProperties.has('value')) {
            this.dispatchEvent(new CustomEvent('value-changed', {
                detail: {value: this.value}, bubbles: true, composed: true
            }));
        }
    }

    onReset = () => {
        this.value = this.valueInitial;
        this.langSyncUid = this.langSyncUidInitial;
        this.shadowRoot.querySelector('.slot').innerText = this.valueInitial;
    };

    render() {
        let buttonCount = 0;
        let buttons = html``;
        if (this.changed) {
            buttonCount = 1;
            buttons = html`
                <div class="buttons">
                    <reset-button @click="${this.onReset}"></reset-button>
                </div>`;
        }
        if (window.editaraInfo.currentLanguageId !== 0 && this.table === 'editable') {
            // TODO why is the allowLanguageSynchronization not working with default langauge?
            // TODO only show if the table + field allows language synchronization
            // TODO only show all languages if it is table:editable
            // TODO other tables should only show the same as in the backend  (default (0) lang + l10n_source lang)
            buttonCount = 2;
            buttons = html`
                <div class="buttons">
                    <translation-selector
                            .value="${this.langSyncUid ?? ''}"
                            @value-changed="${(e) => this.langSyncUid = e.detail.value}"
                    ></translation-selector>
                    <reset-button @click="${this.onReset}"></reset-button>
                </div>`;
        }
        return html`
            <span
                    class=${classMap({slot: true, synced: this.isSynced, changed: this.changed,})}
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
      }

      .slot {
        min-width: 5px;
        display: inline-block;
        min-height: 1lh;

        border-radius: 4px;
        /*
        // problem with this: (inset shadow is cut off)
        //border-top: 4px solid transparent;
        //border-bottom: 4px solid transparent;
        //border-left: 4px solid transparent;
        //border-right: max(5px, calc(0.8em * var(--button-count) + 5px * 2 * var(--button-count)));
        //box-sizing: content-box !important;

        // problem with this: element is to big, even if margin is negative */

        padding: 4px
            max(4px, calc(0.8em * var(--button-count) + 4px * 2 * var(--button-count)))
            4px
            4px;
        margin: -4px;

        &:after {
          content: attr(data-placeholder);
          color: #555;
        }
      }
      .slot:hover, .slot:focus {
        box-shadow: 0 0 4px 0 rgba(0,0,0,0.50) inset;
        outline: 0;
        backdrop-filter: blur(10px) invert(20%);
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
        gap: 5px;

        position: absolute;
        right: 5px;
        top: 0;
        bottom: 0;

        pointer-events: none;

        & > * {
          height: 0.8em;
          width: 0.8em;

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

// TODO prefix all components with editara-
customElements.define('editable-input', EditableInput);
