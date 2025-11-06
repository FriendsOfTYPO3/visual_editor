import {css, html, LitElement} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {changesStore} from './changes-store.js';

/**
 * @extends {HTMLElement}
 */
export class EditableRte extends LitElement {
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
    };

    constructor() {
        super();
        this.value = this.innerHTML;
        this.valueInitial = this.value;
        this.innerHTML = '';
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
        this.shadowRoot.querySelector('.slot').innerHTML = this.valueInitial || '\n';
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
        this.shadowRoot.querySelector('.slot').innerHTML = this.valueInitial;
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
        // TODO use RTE ckedit or tiptap
        return html`
            <span
                    class=${classMap({slot: true, synced: this.isSynced, changed: this.changed,})}
                    style="--button-count: ${buttonCount};"
                    contenteditable="${this.isSynced ? 'false' : 'true'}"
                    data-placeholder="${this.value.length ? '' : (this.placeholder || '\u200B'/* placeholder keeps firefox from breaking out*/)}"
                    @input="${(event) => {
                        this.value = event.currentTarget.innerHTML.trim();
                        if (this.value.length === 0) {
                            this.shadowRoot.querySelector('.slot').innerHTML = '';
                        }
                    }}"
                    @blur="${() => this.shadowRoot.querySelector('.slot').innerHTML = this.value}"
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
            border: 1px solid transparent;
            &:hover, &:focus {
              --deg: 90deg;
              // TODO make this an outline again with proper automatic color selection (on white use x on black use y, etc) maybe css: hue-rotate
              border-image: conic-gradient(from var(--deg), #ff0000 0%, #ffff00 8.33%, #00ff00 16.66%, #00ffff 25%, #0000ff 33.33%, #ff00ff 41.66%, #ff0000 50%, #ffff00 58.33%, #00ff00 66.66%, #00ffff 75%, #0000ff 83.33%, #ff00ff 91.66%, #ff0000 100%) 1;
              outline: 0;
            }
            border-radius: 4px;
            padding-left: 4px;
            padding-right: max(5px, calc(0.8em * var(--button-count) + 5px * 2 * var(--button-count)));

            &:after {
                content: attr(data-placeholder);
                color: #555;
            }
        }

        .slot.synced {
            /* blur the text: */
            user-select: none;
            color: #888;
            background: #f2f2f2;
            outline-color: #bfbfbf;
            cursor: not-allowed;
        }

        .slot.disabled {
            filter: blur(1px);
        }

        .slot.changed {
            background: #ffa5007d;
            outline-color: #ffa5007d;
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

            color: #444;

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

customElements.define('editable-rte', EditableRte);
