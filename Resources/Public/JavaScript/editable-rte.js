import {LitElement} from 'lit';
import {changesStore} from './changes-store.js';
import {ClassicEditor as Editor} from '@ckeditor/ckeditor5-editor-classic';
// import {InlineEditor as Editor} from '@ckeditor/ckeditor5-editor-inline'; // TODO fix issues with inline editor
import {initCKEditorInstance} from '@typo3/rte-ckeditor/init-ckeditor-instance.js';
import {removeRuleBySelector} from './removeRuleBySelector.js';

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
}

customElements.define('editable-rte', EditableRte);


// document.querySelectorAll('editable-rte').forEach(async (element) => {
//   const options = JSON.parse(element.getAttribute('options') || '{}');
//   const table = element.getAttribute('table') || '';
//   const uid = parseInt(element.getAttribute('uid') || '0', 10);
//   const field = element.getAttribute('field') || '';
//
//   const editor = await initCKEditorInstance(options, element, element, Editor);
//   editor.model.document.on('change:data', () => {
//     const value = editor.getData();
//     changesStore.set(table, uid, field, value, null);
//     const changed = changesStore.hasChanges(table, uid, field);
//     if (changed) {
//       element.setAttribute('changed', 'true');
//     } else {
//       element.removeAttribute('changed');
//     }
//   });
//   const html = editor.getData();
//   changesStore.setInitial(table, uid, field, html, null);
//
//   // reset CSS
//   removeRuleBySelector('.ck.ck-editor__editable_inline > :first-child');
//   removeRuleBySelector('.ck.ck-editor__editable_inline > :last-child');
// });
