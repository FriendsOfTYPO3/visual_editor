import {css, html, LitElement} from 'lit';

/**
 * @extends {HTMLElement}
 */
export class ResetButton extends LitElement {

    static styles = css`
        button {
            display: flex;
            background: none;
            color: inherit;
            border: none;
            padding: 0;
            font: inherit;
            cursor: pointer;
            outline: inherit;
        }
    `;

    _click(){
        this.dispatchEvent(new Event('click', {
            bubbles: true, composed: true
        }));
    }

    render() {
        return html`
            <button @click="${this._click}" title="Reset changes">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" style="width: 100%">
                    <g fill="currentColor">
                        <path d="M8 2c-1.8 0-3.4.8-4.5 2l-1-1c-.2-.2-.4-.1-.4.1l-.9 3.8c0 .2.1.3.3.3l3.8-.9c.2 0 .3-.3.1-.4l-1-1c.9-1 2.2-1.7 3.7-1.7 2.7 0 4.9 2.2 4.9 4.9S10.8 13 8.1 13c-1.5 0-2.8-.7-3.7-1.7l-.9.7c1.1 1.2 2.7 2 4.5 2 3.3 0 6-2.7 6-6s-2.7-6-6-6z"/>
                    </g>
                </svg>
            </button>
        `;
    }
}

customElements.define('reset-button', ResetButton);
