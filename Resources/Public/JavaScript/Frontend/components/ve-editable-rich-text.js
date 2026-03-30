import {LitElement} from 'lit';
import {ClassicEditor as Editor} from '@ckeditor/ckeditor5-editor-classic';
// import {InlineEditor as Editor} from '@ckeditor/ckeditor5-editor-inline'; // TODO fix issues with inline editor
import {initCKEditorInstance} from '@typo3/rte-ckeditor/init-ckeditor-instance.js';
import {prefixAndRebaseCss} from '@typo3/rte-ckeditor/css-prefixer.js';
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
    this.placeholder = '👀' + (this.placeholder || this.title);
    /** @type {HTMLElement} */
    const element = this;
    const wrapper = document.createElement('div');
    while (element.firstChild) {
      wrapper.appendChild(element.firstChild);
    }
    element.appendChild(wrapper);

    this.includeCssScoped(this.options.contentsCss);

    this.editor = await initCKEditorInstance(this.options || {}, wrapper, wrapper, Editor);
    this.editor.editing.view.document.getRoot('main').placeholder = this.placeholder;
    this.editor.model.document.on('change:data', () => {
      this.value = this.editor.getData({ skipListItemIds: true });
      dataHandlerStore.setData(this.table, this.uid, this.field, this.value);
      this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    });
    this.value = this.editor.getData({ skipListItemIds: true });
    dataHandlerStore.setInitialData(this.table, this.uid, this.field, this.value);

    // reset CSS
    removeRuleBySelector('.ck.ck-editor__editable_inline > :first-child');
    removeRuleBySelector('.ck.ck-editor__editable_inline > :last-child');
    removeRuleBySelector('.ck-content');
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
   * @param {string[]} contentsCss
   */
  async includeCssScoped(contentsCss) {
    if (!contentsCss) {
      return;
    }
    // set id to this if not already present
    if (!this.dataset.cssHash) {
      // hash of contentsCss using SubtleCrypto.digest()
      this.dataset.cssHash = 've-' + await this.hash(contentsCss.join(','));
    }

    // skip if there already is a stylesheet with this id
    if (document.adoptedStyleSheets.some(sheet => sheet.cssHash === this.dataset.cssHash)) {
      return;
    }

    let completeCss = '';

    const scopedSheet = new CSSStyleSheet();
    scopedSheet.name = `Scoped styles for ${this.dataset.cssHash}`;
    scopedSheet.cssHash = this.dataset.cssHash;
    scopedSheet.replaceSync(completeCss);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, scopedSheet];

    const promisesArray = contentsCss.map(async url => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Status ' + response.status);
        }
        const cssContent = await response.text();
        const cssPrefixed = prefixAndRebaseCss(cssContent, url, [`[data-css-hash=${this.dataset.cssHash}]`]);
        completeCss += cssPrefixed;
        scopedSheet.replaceSync(completeCss);
      } catch (error) {
        console.error(`Failed to fetch CSS content for CKEditor 5 prefixing: "${url}"`, error);
      }
    });

    await Promise.allSettled(promisesArray);
  }

  /**
   * @param {string} input
   * @return {Promise<string>}
   */
  async hash(input) {
    return new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input))).toHex();
  }

  #onDataHandlerChange(event) {
    if (!this.#isRelevantDataHandlerEvent(event.detail)) {
      return;
    }

    this.changed = dataHandlerStore.hasChangedData(this.table, this.uid, this.field);
    const storedValue = dataHandlerStore.data[this.table]?.[this.uid]?.[this.field] ?? undefined;
    if (storedValue?.trim() !== this.editor?.getData({ skipListItemIds: true })?.trim()) {
      this.value = storedValue ?? this.value;
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
