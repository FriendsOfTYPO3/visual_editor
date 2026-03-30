import {css, html, LitElement} from 'lit';
import '@typo3/visual-editor/Frontend/components/ve-validation-message';

export class VeValidationOverlay extends LitElement {
  static properties = {
    messages: {type: Array},
    validationErrors: {type: Array},
  };

  constructor() {
    super();
    this.messages = [];
    this.validationErrors = [];
    this.messageId = 0;
    this.clearTimeouts = new Map();
    this.validationErrorShakeKeys = new Map();
  }

  render() {
    if (this.messages.length === 0 && this.validationErrors.length === 0) {
      return html``;
    }

    const uniqueValidationErrors = [...new Set(this.validationErrors)];

    return html`
      <div class="messageOverlay">
        ${uniqueValidationErrors.map((reason) => html`
          <ve-validation-message
            .reason=${reason}
            .animated=${false}
            .shakeKey=${this.validationErrorShakeKeys.get(reason) ?? 0}
          ></ve-validation-message>
        `)}
        ${this.messages.map(({id, reason, animationKey}) => html`
          <ve-validation-message
            .reason=${reason}
            .animated=${true}
            .animationKey=${animationKey}
            data-message-id="${id}"
          ></ve-validation-message>
        `)}
      </div>
    `;
  }

  /**
   * @param {string} reason
   * @api
   */
  show(reason) {
    if (!reason) {
      return;
    }

    if (this.validationErrors.includes(reason)) {
      this.validationErrorShakeKeys.set(reason, (this.validationErrorShakeKeys.get(reason) ?? 0) + 1);
      this.requestUpdate();
      return;
    }

    const animationDuration = 2000;
    const existingMessage = this.messages.find((message) => message.reason === reason);
    const messageId = existingMessage ? existingMessage.id : ++this.messageId;

    if (existingMessage) {
      this.messages = this.messages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        return {
          ...message,
          animationKey: message.animationKey + 1,
        };
      });
    } else {
      this.messages = [...this.messages, {id: messageId, reason, animationKey: 0}];
    }

    this.#notifyStateChange();

    const existingTimeout = this.clearTimeouts.get(messageId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    this.clearTimeouts.set(messageId, setTimeout(() => {
      this.#removeDeniedInputMessage(messageId);
    }, animationDuration * 2));
  }

  /**
   * @api
   */
  clear() {
    for (const timeout of this.clearTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.clearTimeouts.clear();
    this.messages = [];
    this.#notifyStateChange();
  }

  disconnectedCallback() {
    this.clear();
    super.disconnectedCallback();
  }

  /**
   * @param {number} messageId
   */
  #removeDeniedInputMessage(messageId) {
    const timeout = this.clearTimeouts.get(messageId);
    if (timeout) {
      clearTimeout(timeout);
      this.clearTimeouts.delete(messageId);
    }

    this.messages = this.messages.filter((message) => message.id !== messageId);
    this.#notifyStateChange();
  }

  #notifyStateChange() {
    this.dispatchEvent(new CustomEvent('denied-input-state-change', {
      detail: {
        active: this.messages.length > 0,
        count: this.messages.length,
      },
      bubbles: true,
      composed: true,
    }));
  }

  static styles = css`
    :host {
      display: block;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 10;
      pointer-events: none;
    }

    .messageOverlay {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  `;
}

customElements.define('ve-validation-overlay', VeValidationOverlay);
