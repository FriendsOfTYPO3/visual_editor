import {LitElement} from 'lit';
import {ClassicEditor as Editor} from '@ckeditor/ckeditor5-editor-classic';
// import {InlineEditor as Editor} from '@ckeditor/ckeditor5-editor-inline'; // TODO fix issues with inline editor
import {initCKEditorInstance} from '@typo3/rte-ckeditor/init-ckeditor-instance.js';
import {removeRuleBySelector} from '@andersundsehr/editara/Shared/remove-rule-by-selector.mjs';
import {dataHandlerStore} from "@andersundsehr/editara/Frontend/stores/data-handler-store.mjs";
import {showEmptyActive} from "@andersundsehr/editara/Shared/local-store.js";

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
    placeholder: {type: String},
    options: {type: Object},

    showEmpty: {type: Boolean},
  };

  createRenderRoot() {
    // disable shadow DOM, otherwise CKEditor cannot init properly
    return this;
  }

  constructor() {
    super();
    this.value = this.innerHTML;
    dataHandlerStore.addEventListener('change', () => {
      this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    })
    this.showEmpty = showEmptyActive.get();
    showEmptyActive.addEventListener('currentWindowChange', () => {
      this.showEmpty = showEmptyActive.get();
    });
  }

  async firstUpdated() {
    if (this.placeholder === '') {
      this.placeholder = this.title;
    }
    /** @type {HTMLElement} */
    const element = this;
    element.innerHTML = `<div>${element.innerHTML}</div>`;
    const editor = await initCKEditorInstance(this.options || {}, element.firstElementChild, element.firstElementChild, Editor);
    editor.editing.view.document.getRoot( 'main' ).placeholder = this.placeholder;
    editor.model.document.on('change:data', () => {
      this.value = editor.getData();
      dataHandlerStore.setData(this.table, this.uid, this.field, this.value);
      this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    });
    this.value = editor.getData();
    dataHandlerStore.setInitialData(this.table, this.uid, this.field, this.value);

    // reset CSS
    removeRuleBySelector('.ck.ck-editor__editable_inline > :first-child');
    removeRuleBySelector('.ck.ck-editor__editable_inline > :last-child');
  }

  updated(changedProperties) {
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

  /**
   * Styles are in editable.css
   *
   */
}

customElements.define('editable-rte', EditableRte);
