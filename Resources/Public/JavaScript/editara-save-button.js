import {css, html, LitElement} from 'lit';
import {changesStore} from './changes-store.js';

/**
 * @extends {HTMLElement}
 */
export class EditaraSaveButton extends LitElement {
    static properties = {
        changes: {type: Object},
        saving: {type: Boolean},
    };

    constructor() {
        super();
        this.changes = {};
        this.saving = false;

        changesStore.addEventListener('changes', e => {
            this.changes = e.detail.changes;
            console.log('Changes updated:', this.changes);
        })

        document.addEventListener('keydown', (event) => {
            // on CTRL + S
            if (!((event.ctrlKey || event.metaKey) && event.key === 's')) {
                return;
            }

            event.preventDefault();

            if (this.saving) {
                return;
            }
            if (!this.count) {
                return;
            }

            this._save();
        });
    }

    get count() {
        // iterate other the tables and count the uids:
        return Object.values(this.changes).reduce((acc, tableChanges) => {
            return acc + Object.keys(tableChanges).length;
        }, 0);
    }

    async _save() {
        this.saving = true;
        const value = this.changes;
        const body = JSON.stringify(value, null, 2);
        const response = await fetch(window.location.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
        });

        if (!response.ok) {
            document.body.innerHTML = await response.text();
            return;
        }

        const html = await response.text();
        this.saving = false;

        // TODO only replace the changed elements instead of reloading the whole page
        console.log('Save response:', html);

        if(window.parent === window) {
            window.location.reload();
            return;
        }
        const message = {
            command: "editaraReloadFrames",
        };
        top.postMessage(message, '*');
    }

    render() {
        if (!this.count) {
            return html``;
        }
        return html`
            <button
                    @click=${this._save}
                    ?disabled="${this.saving}"
            >
                ${
                        this.saving
                                ? html`💾 Saving...`
                                : html`Save ${this.count} ✏️ changes`
                }

            </button>
        `;
    }


    static styles = css`
        :host {
        }

        button {
            position: fixed;
            top: 40px;
            right: 20px;
            padding: 10px 20px;
            background-color: #28a745;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
        }

        button[disabled] {
            background-color: #6c757d;
            cursor: wait;
        }
    `;
}

customElements.define('editara-save-button', EditaraSaveButton);
