import {css, html, LitElement} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {changesStore} from './changes-store.js';
import {initRte} from './initRte.js';

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
        options: {type: Object,},
    };

    firstUpdated() {
      initRte(this, this.options || {}, (html) => {
        this.value = html;
        console.log(`RTE content changed ${this.table}:${this.uid}.${this.field}`, html);
      });
    }
}

customElements.define('editable-rte', EditableRte);
