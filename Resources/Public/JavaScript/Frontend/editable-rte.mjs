import {LitElement, css} from 'lit';
import {changesStore} from '@andersundsehr/editara/Frontend/changes-store.mjs';
import {ClassicEditor as Editor} from '@ckeditor/ckeditor5-editor-classic';
// import {InlineEditor as Editor} from '@ckeditor/ckeditor5-editor-inline'; // TODO fix issues with inline editor
import {initCKEditorInstance} from '@typo3/rte-ckeditor/init-ckeditor-instance.js';
import {removeRuleBySelector} from '../Shared/remove-rule-by-selector.mjs';

/**
 * @extends {HTMLElement}
 */
export class EditableRte extends LitElement {
  static properties = {
    changed: {type: Boolean, reflect: true},
    value: {type: String, reflect: true},

    name: {type: String},
    table: {type: String},
    uid: {type: Number},
    field: {type: String},
    valueInitial: {type: String},
    placeholder: {type: String},
    langSyncUid: {type: Number}, // TODO implement language sync
    langSyncUidInitial: {},
    options: {type: Object},
  };

  createRenderRoot() {
    // disable shadow DOM, otherwise CKEditor cannot init properly
    return this;
  }

  constructor() {
    super();

    changesStore.addEventListener('changes', () => {
      this.changed = changesStore.hasChanges(this.table, this.uid, this.field);
      this.valueInitial = changesStore.initial[this.table]?.[this.uid]?.[this.field] ?? this.valueInitial;
    })
  }

  async firstUpdated() {
    /** @type {HTMLElement} */
    const element = this;
    element.innerHTML = `<div>${element.innerHTML}</div>`;
    const editor = await initCKEditorInstance(this.options || {}, element.firstElementChild, element.firstElementChild, Editor);
    editor.model.document.on('change:data', () => {
      this.value = editor.getData();
      changesStore.set(this.table, this.uid, this.field, this.value, this.isSynced ? this.langSyncUid : null);
      this.changed = changesStore.hasChanges(this.table, this.uid, this.field);
    });
    const html = editor.getData();
    changesStore.setInitial(this.table, this.uid, this.field, html, this.isSynced ? this.langSyncUid : null);

    // reset CSS
    removeRuleBySelector('.ck.ck-editor__editable_inline > :first-child');
    removeRuleBySelector('.ck.ck-editor__editable_inline > :last-child');
  }

  static style = css`
    :host {
      display: block;
    }`;
}

customElements.define('editable-rte', EditableRte);
