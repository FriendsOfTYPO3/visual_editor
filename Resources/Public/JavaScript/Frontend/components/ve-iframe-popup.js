import {css, html, LitElement} from 'lit';
import {isDirectMode, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';

/**
 * @param {string} src
 * @param {string} title
 * @param {'medium' | 'large' | 'full'} size
 * @param {'iframe' | 'ajax'} type
 */
export function openModal(src, title, size = 'large', type = 'iframe') {
  if (isDirectMode) {
    try {
      const parsed = new URL(src, window.location.href);
      const allowedOrigins = [window.location.origin, ...(window.veInfo?.allowedReferrer || [])];
      if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && allowedOrigins.includes(parsed.origin)) {
        window.location = parsed.href;
      }
    } catch {
      // invalid URL, ignore
    }
    return;
  }

  const message = {
    src: src + '%23ve-close',
    title,
    size,
    type,
  };
  sendMessage('openModal', message);
}

/**
 * @extends {HTMLElement}
 */
export class VeIframePopup extends LitElement {
  static properties = {
    title: {type: String,},
    src: {type: String,},
    size: {type: String,},
    type: {type: String,},
  };


  static styles = css`
        button {
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
    `;

  constructor() {
    super();
    this.size = 'large';
    this.type = 'iframe';
  }

  _click(event) {
    event.preventDefault();
    const title = this.title;
    const size = this.size;
    const type = this.type;
    const src = this.src;
    openModal(src, title, size, type);
  }

  render() {
    return html`
            <button @click="${this._click}" title="${this.title}">
                <slot/>
            </button>
        `;
  }
}

customElements.define('ve-iframe-popup', VeIframePopup);
