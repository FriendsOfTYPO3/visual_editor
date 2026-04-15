import {LitElement} from 'lit';
import {ClassicEditor as Editor} from '@ckeditor/ckeditor5-editor-classic';
// import {InlineEditor as Editor} from '@ckeditor/ckeditor5-editor-inline'; // TODO fix issues with inline editor
import {initCKEditorInstance} from '@typo3/rte-ckeditor/init-ckeditor-instance.js';
import {removeRuleBySelector} from '@typo3/visual-editor/Shared/remove-rule-by-selector';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';
import {showEmptyActive} from '@typo3/visual-editor/Shared/local-stores';
import {dragInProgressStore} from '@typo3/visual-editor/Frontend/stores/drag-store';

/**
 * Styles are in editable.css
 *
 * @extends {HTMLElement}
 */
export class VeEditableRichText extends LitElement {
  static properties = {
    changed: {type: Boolean, reflect: true},
    empty: {type: Boolean, reflect: true},
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
    this.empty = this.value === '';
    this.showEmpty = showEmptyActive.get();
    this.onDataHandlerChange = this.#onDataHandlerChange.bind(this);
    this.onShowEmptyChange = this.#onShowEmptyChange.bind(this);
    this.onDragInProgressChange = this.#onDragInProgressChange.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    dataHandlerStore.addEventListener('change', this.onDataHandlerChange);
    showEmptyActive.addEventListener('change', this.onShowEmptyChange);
    dragInProgressStore.addEventListener('change', this.onDragInProgressChange);
  }

  disconnectedCallback() {
    dataHandlerStore.removeEventListener('change', this.onDataHandlerChange);
    showEmptyActive.removeEventListener('change', this.onShowEmptyChange);
    dragInProgressStore.removeEventListener('change', this.onDragInProgressChange);

    super.disconnectedCallback();
  }

  async firstUpdated() {
    this.placeholder = this.name;
    /** @type {HTMLElement} */
    const element = this;
    const wrapper = document.createElement('div');
    while (element.firstChild) {
      wrapper.appendChild(element.firstChild);
    }
    element.appendChild(wrapper);

    this.editor = await initCKEditorInstance(this.options || {}, wrapper, wrapper, Editor);
    this.editor.editing.view.document.getRoot('main').placeholder = this.placeholder;
    this.editor.model.document.on('change:data', () => {
      this.value = this.editor.getData({ skipListItemIds: true });
      this.empty = this.value === '';
      dataHandlerStore.setData(this.table, this.uid, this.field, this.value);
      this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    });
    this.value = this.editor.getData({ skipListItemIds: true });
    this.empty = this.value === '';
    dataHandlerStore.setInitialData(this.table, this.uid, this.field, this.value);

    // reset CSS
    removeRuleBySelector('.ck.ck-editor__editable_inline > :first-child');
    removeRuleBySelector('.ck.ck-editor__editable_inline > :last-child');
    removeRuleBySelector('.ck-content');
  }

  updated(changedProperties) {
    this.empty = this.value === '';
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

  #onDataHandlerChange(event) {
    if (!this.#isRelevantDataHandlerEvent(event.detail)) {
      return;
    }

    this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    const storedValue = dataHandlerStore.data[this.table]?.[this.uid]?.[this.field] ?? undefined;
    if (storedValue?.trim() !== this.editor?.getData({ skipListItemIds: true })?.trim()) {
      this.value = storedValue ?? this.value;
      this.empty = this.value === '';
      this.editor?.setData(this.value);
    }
  }

  #onShowEmptyChange() {
    this.showEmpty = showEmptyActive.get();
  }

  #onDragInProgressChange() {
    this.style.pointerEvents = dragInProgressStore.value ? 'none' : '';
  }

  #isRelevantDataHandlerEvent(detail) {
    if (!detail || detail.scope === 'global') {
      return true;
    }

    return detail.table === this.table
      && detail.uid === this.uid
      && (detail.field === undefined || detail.field === this.field);
  }
}

customElements.define('ve-editable-rich-text', VeEditableRichText);
