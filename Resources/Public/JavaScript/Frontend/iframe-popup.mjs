import {css, html, LitElement} from 'lit';
import {isDirectMode, sendMessage} from "@andersundsehr/editara/Shared/iframe-messaging.mjs";


/**
 * @extends {HTMLElement}
 */
export class IframePopup extends LitElement {
    static properties = {
        title: {type: String,},
        src: {type: String,},
        size: {type: String,},
    };


    static styles = css`
        button {
            cursor: pointer;
        }

        iframe {
            border: none;

            &.full {
                width: 95vw;
                height: 95vh;
            }

            &.large {
                width: 75vw;
                height: 95vh;
            }

            &.medium {
                width: 60vw;
                height: 85vh;
            }
        }
    `;

    constructor() {
        super();
        this.size = 'large';
    }

    _click(event) {
        event.preventDefault();
        if (isDirectMode) {
            // direct mode, just navigate
            window.location = this.src;
            return;
        }

        const message = {
            src: this.src + '%23editara-close',
            title: this.title,
            size: this.size,
        };
        sendMessage('openModal', message);
    }

    render() {
        return html`
            <button @click="${this._click}" title="${this.title}">
                <slot/>
            </button>
        `;
    }
}

customElements.define('iframe-popup', IframePopup);
