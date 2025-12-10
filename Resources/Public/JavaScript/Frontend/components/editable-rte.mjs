import {LitElement, css} from 'lit';
import {ClassicEditor as Editor} from '@ckeditor/ckeditor5-editor-classic';
// import {InlineEditor as Editor} from '@ckeditor/ckeditor5-editor-inline'; // TODO fix issues with inline editor
import {initCKEditorInstance} from '@typo3/rte-ckeditor/init-ckeditor-instance.js';
import {removeRuleBySelector} from '@andersundsehr/editara/Shared/remove-rule-by-selector.mjs';
import {dataHandlerStore} from "@andersundsehr/editara/Frontend/stores/data-handler-store.mjs";

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
    options: {type: Object},
  };

  createRenderRoot() {
    // disable shadow DOM, otherwise CKEditor cannot init properly
    return this;
  }

  constructor() {
    super();

    dataHandlerStore.addEventListener('change', () => {
      this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
      this.valueInitial = dataHandlerStore.initialData[this.table]?.[this.uid]?.[this.field] ?? this.valueInitial;
    })
  }

  async firstUpdated() {
    /** @type {HTMLElement} */
    const element = this;
    element.innerHTML = `<div>${element.innerHTML}</div>`;
    const editor = await initCKEditorInstance(this.options || {}, element.firstElementChild, element.firstElementChild, Editor);
    editor.model.document.on('change:data', () => {
      this.value = editor.getData();
      dataHandlerStore.setData(this.table, this.uid, this.field, this.value);
      this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    });
    const html = editor.getData();
    dataHandlerStore.setInitialData(this.table, this.uid, this.field, html);

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
