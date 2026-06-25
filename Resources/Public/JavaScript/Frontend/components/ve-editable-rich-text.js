import {LitElement} from 'lit';
import {lll} from '@typo3/core/lit-helper.js';
import {ClassicEditor as Editor} from '@ckeditor/ckeditor5-editor-classic';
// import {InlineEditor as Editor} from '@ckeditor/ckeditor5-editor-inline'; // TODO fix issues with inline editor
import {initCKEditorInstance} from '@typo3/rte-ckeditor/init-ckeditor-instance.js';
import {removeRuleBySelector} from '@typo3/visual-editor/Shared/remove-rule-by-selector';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';
import {showEmptyActive} from '@typo3/visual-editor/Shared/local-stores';
import {dragInProgressStore} from '@typo3/visual-editor/Frontend/stores/drag-store';
import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';

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
    fieldPositionId: {type: String},
    placeholder: {type: String},
    options: {type: Object},
    highlighted: {type: Boolean, reflect: true},

    showEmpty: {type: Boolean},
  };

  createRenderRoot() {
    // disable shadow DOM, otherwise CKEditor cannot init properly
    return this;
  }

  constructor() {
    super();
    this.highlighted = false;
    this.showEmpty = showEmptyActive.get();
    this.onDataHandlerChange = this.#onDataHandlerChange.bind(this);
    this.onShowEmptyChange = this.#onShowEmptyChange.bind(this);
    this.onDragInProgressChange = this.#onDragInProgressChange.bind(this);
    this.onSyncEditableFieldFocus = this.#onSyncEditableFieldFocus.bind(this);
    this.onEditableFocus = this.#onEditableFocus.bind(this);
    this.onEditableBlur = this.#onEditableBlur.bind(this);
    this.editableElement = null;
    this.unsubscribeSyncEditableFieldFocus = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.value === undefined) {
      // only read innerHTML once!
      this.value = this.innerHTML;
    }
    this.empty = this.value === '';

    dataHandlerStore.addEventListener('change', this.onDataHandlerChange);
    showEmptyActive.addEventListener('change', this.onShowEmptyChange);
    dragInProgressStore.addEventListener('change', this.onDragInProgressChange);
    this.unsubscribeSyncEditableFieldFocus = onMessage('syncEditableFieldFocus', this.onSyncEditableFieldFocus);
  }

  disconnectedCallback() {
    dataHandlerStore.removeEventListener('change', this.onDataHandlerChange);
    showEmptyActive.removeEventListener('change', this.onShowEmptyChange);
    dragInProgressStore.removeEventListener('change', this.onDragInProgressChange);
    this.unsubscribeSyncEditableFieldFocus?.();
    this.unsubscribeSyncEditableFieldFocus = null;
    this.editableElement?.removeEventListener('focus', this.onEditableFocus);
    this.editableElement?.removeEventListener('blur', this.onEditableBlur);
    this.editableElement = null;

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
    const editableElement = this.editor.ui.getEditableElement();
    if (editableElement instanceof HTMLElement) {
      this.editableElement = editableElement;
      const fieldLabel = this.name || this.title || this.field || this.placeholder;
      editableElement.setAttribute('aria-label', lll('editable.title', fieldLabel));
      editableElement.addEventListener('focus', this.onEditableFocus);
      editableElement.addEventListener('blur', this.onEditableBlur);
    }
    this.editor.editing.view.document.getRoot('main').placeholder = this.placeholder;
    this.editor.model.document.on('change:data', () => {
      this.value = this.editor.getData({skipListItemIds: true});
      this.empty = this.value === '';
      dataHandlerStore.setData(this.table, this.uid, this.field, this.value);
      this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    });
    this.value = this.editor.getData({skipListItemIds: true});
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
    if (storedValue?.trim() !== this.editor?.getData({skipListItemIds: true})?.trim()) {
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

  #onEditableFocus() {
    sendMessage('editableFieldFocusChanged', {
      fieldPositionId: this.fieldPositionId,
      focused: true,
    }, 'parent');
  }

  #onEditableBlur() {
    sendMessage('editableFieldFocusChanged', {
      fieldPositionId: this.fieldPositionId,
      focused: false,
    }, 'parent');
  }

  /**
   * @param {{languageId: number|string, fieldPositionId: string, focused: boolean}} detail
   */
  #onSyncEditableFieldFocus(detail) {
    if (String(detail.languageId) === String(window.veInfo.languageId)) {
      return;
    }

    this.highlighted = detail.focused && detail.fieldPositionId === this.fieldPositionId;
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
