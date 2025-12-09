import {css, html, LitElement} from 'lit';
import {useDataHandler} from "@andersundsehr/editara/Frontend/api.mjs";
import {dragInProgressStore} from "@andersundsehr/editara/Frontend/stores/drag-store.mjs";
import {isDirectMode, sendMessage} from "@andersundsehr/editara/Shared/iframe-messaging.mjs";
import {openModal} from "@andersundsehr/editara/Frontend/iframe-popup.mjs";

/**
 * @extends {HTMLElement}
 */
export class EditaraContentElement extends LitElement {
  static properties = {
    elementName: {type: String},
    editUrl: {type: String},
    table: {type: String},
    uid: {type: Number},
    pid: {type: Number},
    colPos: {type: Number},
    sys_language_uid: {type: Number},
    isHidden: {type: Boolean},
    hiddenFieldName: {type: String},

    dragInProgress: {type: Boolean, state: true, attribute: false},

    loading: {type: Boolean, state: true, attribute: true},
  };

  /**
   * @param {MouseEvent} event
   */
  _openEdit(event) {
    // if clicked with middle mouse button or ctrl/cmd key, open in new tab
    if (event.button === 1 || event.ctrlKey || event.metaKey || isDirectMode) {
      return;
    }
    event.preventDefault();
    sendMessage('openInMiddleFrame', this.editUrl);
  }

  async _toggleHidden() {
    this.loading = true;

    // TODO we could optimistically update the UI here, and not wait for the response and only on save we send the data to the backend
    await useDataHandler({
      [this.table]: {
        [this.uid]: {
          [this.hiddenFieldName]: !this.isHidden,
        }
      }
    });
    this.isHidden = !this.isHidden;

    this.loading = false;
  }

  async _delete() {
    this.loading = true;

    if (!confirm('Are you sure you want to delete this element?')) {
      this.loading = false;
      return;
    }

    await useDataHandler({}, {
      [this.table]: {
        [this.uid]: {
          delete: 1,
        }
      }
    })
    this.remove();
  }

  _addAbove() {
    // TODO we need to create the content element above the current one (not below)

    const newContentUrl = window.editaraInfo.newContentUrl
      .replace('__COL_POS__', this.colPos)
      .replace('__SYS_LANGUAGE_UID__', this.sys_language_uid)
      .replace('__UID_PID__', -this.uid);

    openModal(newContentUrl, 'new Content', 'large', 'ajax');
  }

  constructor() {
    super();

    dragInProgressStore.addEventListener('change', () => {
      this.dragInProgress = !!dragInProgressStore.value;
    });

    if (this.parentElement.tagName.toLowerCase() !== 'editara-column') {
      const message = 'Error: <editara-content-element> must be inside an <editara-column> element.';
      this.innerHTML = `<editara-error text="${message}"/>`;
      throw new Error(message);
    }
  }

  render() {
    const toggleIcon = this.isHidden ? 'actions-toggle-off' : 'actions-toggle-on';
    return html`
      <div class="border ${this.isHidden ? 'hidden' : ''} ${this.loading ? 'loading' : ''}">
        <editara-drag-handle
          table="${this.table}" uid="${this.uid}"
          class="button-bar ${this.dragInProgress ? 'dragAndDropActive' : ''}"
        >
          <span class="button-bar-headline" title="uid:${this.uid}">⠿ ${this.elementName}</span>
          <!-- TODO extract button bar as separate component -->
          <a class="button" href="${this.editUrl}" @click="${this._openEdit}"><editara-icon name="actions-open"/></a>
          <a class="button" @click="${this._toggleHidden}"><editara-icon name="${toggleIcon}"/></a>
          <a class="button" @click="${this._delete}"><editara-icon name="actions-delete"/></a>
          <a class="button" @click="${this._addAbove}"><editara-icon name="actions-document-add"/></a>
        </editara-drag-handle>
        <slot></slot>
        <editara-drop-zone
          table="${this.table}"
          uid="${this.uid}"
          target="${-this.uid}"
          colPos="${this.colPos}"
          sys_language_uid="${this.sys_language_uid}"
        ></editara-drop-zone>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .border {
      position: relative;
    }

    .border:after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      pointer-events: none;
    }

    .border:hover:after {
      outline: 2px ridge black;
      outline-offset: 0px;
      box-shadow: 0 0 40px 0 rgba(0, 0, 0, 0.5) inset;
    }

    .border.loading:after {
      animation: textclip 0.6s infinite alternate ease-in-out;
      border-radius: 2px;
      background: rgba(0, 0, 0, 0.5);
      outline: 1px solid black;
    }

    @keyframes textclip {
      to {
        background: rgba(0, 0, 0, 0.95);
        outline: 1px solid white;
      }
    }

    .border.hidden {
      opacity: 0.5;
    }

    .border.hidden:after {
      background: rgba(0, 0, 0, 0.5);
    }

    *:hover > .button-bar {
      /* TODO this dose not work, should be visible if the body is hovered */
      opacity: 0.5;
    }

    .button-bar {
      display: flex;
      gap: 2px;
      cursor: grab;
      position: absolute;
      bottom: 100%;
      left: 0;
      background: #000;
      opacity: 0.001;
      /*opacity: 0.5;*/
      color: white;
      padding: 4px;
      min-width: 200px;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
      z-index: 10100;
    }

    /* TODO do not hide if the current element is the draged one */
    .border:hover .button-bar:not(.dragAndDropActive) {
      opacity: 1;
    }

    .button-bar.dragAndDropActive {
      display: none;
    }

    .button-bar-headline {
      padding-right: 1em;
    }

    .button {
      display: inline-flex;
      color: white;
      border: 1px solid #666;
      border-radius: 0.2em;
      background-color: #444;
      padding: 0.2em 0.5em;
      text-decoration: none;
      cursor: pointer;
    }

    .button:hover {
      border: 1px solid #888;
      background-color: #666;
    }

    .dropArea {
      display: none;
      position: absolute;
      height: 20px;

      left: 0;
      right: 0;
      /*backdrop-filter: invert(100%);*/
      background-color: #222;
      outline: 1px dashed #666;
      border-radius: 0.2em;
      color: #eee;

      /* text centered*/
      align-items: center;
      justify-content: center;

      z-index: 10000;

      &.active {
        display: flex;
      }

      &.over {
        background-color: #3b9e3b;
        outline: 2px solid #aaa;
      }

      &.above {
        top: -22px;
      }

      &.below {
        bottom: -22px;
      }
    }
  `;
}

customElements.define('editara-content-element', EditaraContentElement);
