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
        langSyncUid: {type: Number,}, // TODO implement language sync
        langSyncUidInitial: {},
        options: {type: Object,},
    };

    async firstUpdated() {
      const editor = await initRte(this, this.options || {}, (html) => {
        this.value = html;
        changesStore.set(this.table, this.uid, this.field, html, this.isSynced ? this.langSyncUid : null);
        this.changed = changesStore.hasChanges(this.table, this.uid, this.field);
      });
      const html = editor.getData();
      changesStore.setInitial(this.table, this.uid, this.field, html, this.isSynced ? this.langSyncUid : null);
    }
}

customElements.define('editable-rte', EditableRte);
