import {css, html, LitElement} from 'lit';
import {lll} from '@typo3/core/lit-helper.js';
import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {useDataHandler} from '@typo3/visual-editor/Backend/use-data-handler';
import {reloadAllChildFrames} from '@typo3/visual-editor/Backend/reload-all-child-frames';

/**
 * @type {{data: Object, cmdArray: Object[], invalidFields: Object, count: number, invalidCount: number}}
 */
let lastInfo = null;

/**
 * @extends {HTMLElement}
 */
export class VeBackendSaveButton extends LitElement {
  static properties = {
    count: {type: Number},
    invalidCount: {type: Number},
    saving: {type: Boolean},
  };

  willUpdate() {
    this.setAttribute('aria-disabled', this.isVisuallyDisabled ? 'true' : 'false');
    this.toggleAttribute('disabled', this.isInteractionDisabled);

    this.classList.toggle('btn-default', this.isInteractionDisabled && !this.hasInvalidFields);
    this.classList.toggle('btn-warning', !this.isVisuallyDisabled);
    this.classList.toggle('btn-danger', this.hasInvalidFields);
    this.setAttribute('role', 'button');
    this.setAttribute('aria-disabled', String(this.isInteractionDisabled));
    this.setAttribute('aria-busy', String(this.saving));
    this.setAttribute('tabindex', this.isInteractionDisabled ? '-1' : '0');
    this.setAttribute('aria-label', this.getLabel());
  }

  constructor() {
    super();
    this.count = 0;
    this.invalidCount = 0;
    this.saving = false;
    this.onClick = this.#onClick.bind(this);
    this.onKeydown = this.#onKeydown.bind(this);
    this.disposeUpdateEditorStateListener = null;
    this.disposeDoSaveListener = null;
    if (lastInfo) {
      this.onUpdateEditorState(lastInfo);
    }
  }

  connectedCallback() {
    super.connectedCallback();

    if (!this.disposeUpdateEditorStateListener) {
      this.disposeUpdateEditorStateListener = onMessage('updateEditorState', this.onUpdateEditorState.bind(this));
    }
    if (!this.disposeDoSaveListener) {
      this.disposeDoSaveListener = onMessage('doSave', this.doSave.bind(this));
    }

    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback() {
    this.disposeUpdateEditorStateListener?.();
    this.disposeUpdateEditorStateListener = null;
    this.disposeDoSaveListener?.();
    this.disposeDoSaveListener = null;
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeydown);

    super.disconnectedCallback();
  }

  getLabel() {
    let label = lll('save');
    if (this.count > 0) {
      label = this.count === 1 ? lll('save.change') : lll('save.changes', this.count);
    }
    if (this.invalidCount) {
      label = this.invalidCount === 1 ? lll('save.fixInvalidField') : lll('save.fixInvalidFields', this.invalidCount);
    }
    if (this.saving) {
      label = lll('saving');
    }
    return label;
  }

  render() {
    const label = this.getLabel();
    const icon = this.hasInvalidFields ? 'actions-exclamation-circle-alt' : 'actions-save';
    return html`
      <typo3-backend-icon identifier="${icon}" size="small"></typo3-backend-icon>
      ${label}
    `;
  }

  onUpdateEditorState(info) {
    lastInfo = info;
    this.count = info.count;
    this.invalidCount = info.invalidCount;
  }

  async doSave() {
    if (this.isInteractionDisabled) {
      return;
    }

    const count = lastInfo.count;
    const invalidCount = lastInfo.invalidCount;
    if (invalidCount > 0) {
      sendMessage('focusFirstInvalidField');
      return;
    }

    if (this.saving) {
      // already saving currently.
      return;
    }

    if (count === 0) {
      // nothing to save.
      return;
    }

    const updatePageTree = 'pages' in lastInfo.data;

    try {
      this.saving = true;
      const saveOk = await useDataHandler(lastInfo.data, lastInfo.cmdArray);
      requestAnimationFrame(() => {
        sendMessage('saveEnded');
      });
      if (!saveOk) {
        reloadAllChildFrames();
      }
    } finally {
      this.saving = false;
    }

    if (updatePageTree) {
      top.document.dispatchEvent(new CustomEvent('typo3:pagetree:refresh'));
    }
  }

  #onClick(e) {
    e.preventDefault();
    this.doSave();
  }

  #onKeydown(e) {
    if (this.disabled || (e.key !== 'Enter' && e.key !== ' ')) {
      return;
    }
    e.preventDefault();
    this.doSave();
  }

  get hasChanges() {
    return this.count > 0;
  }

  get hasInvalidFields() {
    return this.invalidCount > 0;
  }

  get isInteractionDisabled() {
    return this.saving === true || (!this.hasChanges && !this.hasInvalidFields);
  }

  get isVisuallyDisabled() {
    return this.isInteractionDisabled || this.hasInvalidFields;
  }

  static styles = css`
    :host {
    }
  `;
}

customElements.define('ve-backend-save-button', VeBackendSaveButton);
