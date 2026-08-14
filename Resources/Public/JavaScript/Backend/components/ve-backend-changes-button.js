import {html, LitElement, nothing} from 'lit';
import {lll} from '@typo3/core/lit-helper.js';
import Modal from '@typo3/backend/modal.js';
import Severity from '@typo3/backend/severity.js';
import {buildChangeOverview} from '@typo3/visual-editor/Backend/build-change-overview';
import {editorStateStore} from '@typo3/visual-editor/Backend/editor-state-store';
import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {autoSaveActive} from '@typo3/visual-editor/Shared/local-stores';

/**
 * @extends {HTMLElement}
 */
export class VeBackendChangesButton extends LitElement {
  static properties = {
    count: {type: Number},
    autoSaveEnabled: {type: Boolean},
  };

  constructor() {
    super();
    this.count = 0;
    this.autoSaveEnabled = false;
    this.overview = {count: 0, records: []};
    this.modal = null;
    this.onClick = this.#onClick.bind(this);
    this.onKeydown = this.#onKeydown.bind(this);
    this.onStateChange = this.#updateOverview.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    editorStateStore.addEventListener('change', this.onStateChange);
    autoSaveActive.addEventListener('change', this.onStateChange);
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeydown);
    this.#updateOverview();
  }

  disconnectedCallback() {
    editorStateStore.removeEventListener('change', this.onStateChange);
    autoSaveActive.removeEventListener('change', this.onStateChange);
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeydown);
    this.modal?.hideModal();
    super.disconnectedCallback();
  }

  willUpdate() {
    const disabled = this.count === 0 || this.autoSaveEnabled;
    const label = lll('changes.count', this.count);
    this.toggleAttribute('hidden', this.autoSaveEnabled);
    this.toggleAttribute('disabled', disabled);
    this.classList.toggle('btn-default', disabled);
    this.classList.toggle('btn-warning', !disabled);
    this.setAttribute('role', 'button');
    this.setAttribute('aria-disabled', String(disabled));
    this.setAttribute('aria-label', label);
    this.tabIndex = disabled ? -1 : 0;
  }

  render() {
    return html`
      <typo3-backend-icon identifier="actions-list" size="small"></typo3-backend-icon>
      ${lll('changes.count', this.count)}
    `;
  }

  #updateOverview() {
    this.autoSaveEnabled = this.#isAutoSaveEnabled();
    if (this.autoSaveEnabled) {
      this.count = 0;
      this.overview = {count: 0, records: []};
      this.modal?.hideModal();
      return;
    }
    const languages = [...document.querySelectorAll('.js-visual-editor-language')].map((element, order) => ({
      id: Number(element.dataset.languageId),
      title: element.dataset.languageTitle || String(element.dataset.languageId),
      order,
    }));
    this.overview = buildChangeOverview(editorStateStore.states, languages);
    this.count = this.overview.count;
    this.modal?.setContent(this.#renderOverview());
  }

  #isAutoSaveEnabled() {
    const toggle = document.querySelector('ve-auto-save-toggle');
    return Boolean(toggle && !toggle.hasAttribute('disabled') && toggle.active);
  }

  #onClick(event) {
    event.preventDefault();
    if (this.count > 0 && !this.autoSaveEnabled) {
      this.#openModal();
    }
  }

  #onKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    this.#onClick(event);
  }

  #openModal() {
    if (this.modal) {
      return;
    }
    this.modal = Modal.advanced({
      title: lll('changes.title'),
      content: this.#renderOverview(),
      size: 'large',
      buttons: [
        {
          text: lll('changes.close'),
          btnClass: 'btn-default',
          active: true,
          trigger: (_event, modal) => modal.hideModal(),
        },
        {
          text: lll('changes.reset'),
          btnClass: 'btn-warning',
          icon: 'actions-undo',
          trigger: () => this.#confirmReset(),
        },
        {
          text: lll('save'),
          btnClass: 'btn-primary',
          icon: 'actions-save',
          trigger: (_event, modal) => {
            modal.addEventListener('typo3-modal-hidden', () => {
              document.querySelector('ve-backend-save-button')?.doSave();
            }, {once: true});
            modal.hideModal();
          },
        },
      ],
    });
    const modal = this.modal;
    modal.addEventListener('typo3-modal-hidden', () => {
      if (this.modal === modal) {
        this.modal = null;
      }
    }, {once: true});
  }

  #renderOverview() {
    if (this.overview.records.length === 0) {
      return html`<p class="mb-0">${lll('changes.empty')}</p>`;
    }
    return html`
      <div class="d-flex flex-column gap-3">
        ${this.overview.records.map(record => this.#renderRecord(record))}
      </div>
    `;
  }

  #renderRecord(record) {
    return html`
      <section class="card">
        <div class="card-header">
          <strong>${record.label}</strong>
          <span class="text-body-secondary ms-1">#${record.uid}</span>
        </div>
        <div class="card-body d-flex flex-column gap-3">
          ${record.actions.map(action => this.#renderAction(action))}
          ${record.fields.map(field => this.#renderField(field))}
        </div>
      </section>
    `;
  }

  #renderAction(action) {
    const content = html`
      <span class="badge text-bg-secondary me-2">${lll(`changes.action.${action.action}`)}</span>
      ${action.languageTitle ? html`<strong>${action.languageTitle}</strong>` : nothing}
      ${action.from ? html`<span class="ms-2">${lll('changes.from')}: ${action.from}</span>` : nothing}
      ${action.to ? html`<span class="ms-2">${lll('changes.to')}: ${action.to}</span>` : nothing}
    `;
    if (action.action === 'delete' || !action.scrollPositionId) {
      return html`<div>${content}</div>`;
    }
    return html`
      <button type="button" class="btn btn-link text-start p-0" @click=${() => this.#reveal(action)}>
        ${content}
      </button>
    `;
  }

  #renderField(field) {
    return html`
      <section>
        <h3 class="h6 mb-2">${field.label}</h3>
        <div class="d-flex flex-column gap-2">
          ${field.languages.map(language => this.#renderLanguage(field, language))}
        </div>
      </section>
    `;
  }

  #renderLanguage(field, language) {
    const before = this.#displayValue(language.before, field.kind);
    const current = this.#displayValue(language.current, field.kind);
    const formattingChanged = this.#isRichText(field.kind)
      && String(language.before ?? '') !== String(language.current ?? '')
      && before === current;
    return html`
      <div class="border rounded p-3 ${language.invalid ? 'border-danger' : ''}">
        <button
          type="button"
          class="btn btn-link text-start p-0 mb-2"
          @click=${() => this.#reveal(language)}
        >
          <strong>${language.languageTitle}</strong>
        </button>
        ${formattingChanged ? html`<div class="mb-2"><span class="badge text-bg-info">${lll('changes.formattingChanged')}</span></div>` : nothing}
        <div class="row g-3">
          <div class="col-md-6">
            <div class="small text-body-secondary mb-1">${lll('changes.before')}</div>
            ${this.#renderValue(before)}
          </div>
          <div class="col-md-6">
            <div class="small text-body-secondary mb-1">${lll('changes.current')}</div>
            ${this.#renderValue(current)}
          </div>
        </div>
        ${language.invalid ? this.#renderValidationErrors(language.validationErrors) : nothing}
      </div>
    `;
  }

  #renderValidationErrors(validationErrors) {
    const errors = Array.isArray(validationErrors) ? validationErrors : Object.values(validationErrors || {});
    return html`
      <div class="alert alert-danger mt-3 mb-0" role="alert">
        <strong>${lll('changes.invalid')}</strong>
        ${errors.length > 0 ?
          html`
            <ul class="mb-0 mt-1">
              ${errors.map(error => html`<li>${error?.message || String(error)}</li>`)}
            </ul>
          `
          : nothing}
      </div>
    `;
  }

  #renderValue(value) {
    if (value === '') {
      return html`<span class="text-body-secondary">—</span>`;
    }
    const lines = value.split('\n');
    if (value.length <= 240 && lines.length <= 3) {
      return html`<pre class="mb-0 text-wrap text-break">${value}</pre>`;
    }
    const preview = lines.slice(0, 3).join('\n').slice(0, 240);
    return html`
      <details @toggle=${(event) => {
        const details = event.currentTarget;
        details.querySelector('.js-change-expand').hidden = details.open;
        details.querySelector('.js-change-collapse').hidden = !details.open;
      }}>
        <summary class="text-break">
          ${preview}${preview.length < value.length ? '…' : ''}
          <span class="js-change-expand ms-1">${lll('changes.expand')}</span>
          <span class="js-change-collapse ms-1" hidden>${lll('changes.collapse')}</span>
        </summary>
        <pre class="mt-2 mb-0 text-wrap text-break">${value}</pre>
      </details>
    `;
  }

  #displayValue(value, kind) {
    if (kind === 'visibility') {
      return value === true || value === 1 || value === '1' ? lll('changes.hidden') : lll('changes.visible');
    }
    if (!this.#isRichText(kind)) {
      return value === null || value === undefined ? '' : String(value);
    }
    const template = document.createElement('template');
    template.innerHTML = String(value ?? '');
    const container = template.content;
    container.querySelectorAll('script, style').forEach(element => element.remove());
    container.querySelectorAll('br').forEach(element => element.replaceWith('\n'));
    container.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6').forEach(element => element.append('\n'));
    return (container.textContent || '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  #isRichText(kind) {
    return kind === 'richText' || kind === 'rich-text' || kind === 'rte';
  }

  #reveal(change) {
    const reveal = () => sendMessage('revealChange', {
      languageId: change.languageId,
      fieldPositionId: change.fieldPositionId,
      scrollPositionId: change.scrollPositionId,
    }, 'iframe');
    if (!this.modal) {
      reveal();
      return;
    }
    this.modal.addEventListener('typo3-modal-hidden', reveal, {once: true});
    this.modal.hideModal();
  }

  #confirmReset() {
    Modal.confirm(
      lll('changes.resetConfirmTitle'),
      lll('changes.resetConfirmMessage'),
      Severity.warning,
      [
        {
          text: lll('changes.close'),
          btnClass: 'btn-default',
          active: true,
          trigger: (_event, modal) => modal.hideModal(),
        },
        {
          text: lll('changes.reset'),
          btnClass: 'btn-warning',
          icon: 'actions-undo',
          trigger: async (_event, modal) => {
            modal.hideModal();
            this.modal?.hideModal();
            await this.#discardChanges();
            window.location.reload();
          },
        },
      ],
    );
  }

  async #discardChanges() {
    const languageIds = [...editorStateStore.states]
      .filter(([, state]) => state.count > 0 || state.invalidCount > 0)
      .map(([languageId]) => Number(languageId));
    if (languageIds.length === 0) {
      return;
    }
    await new Promise((resolve) => {
      const pending = new Set(languageIds);
      let timeout;
      const finish = () => {
        clearTimeout(timeout);
        dispose();
        resolve();
      };
      const dispose = onMessage('changesDiscarded', (_detail, languageId) => {
        pending.delete(Number(languageId));
        if (pending.size === 0) {
          finish();
        }
      });
      timeout = setTimeout(finish, 1500);
      sendMessage('discardChanges', {languageIds}, 'iframe');
    });
  }
}

customElements.define('ve-backend-changes-button', VeBackendChangesButton);
