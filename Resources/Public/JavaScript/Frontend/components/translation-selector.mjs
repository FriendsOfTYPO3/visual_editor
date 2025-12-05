import {css, html, LitElement} from 'lit';
import {map} from 'lit/directives/map.js';

/**
 * @extends {HTMLElement}
 */
export class TranslationSelector extends LitElement {
    static properties = {
        value: {},
    };

    /**
     * @param {Map<PropertyKey, unknown>} changed
     * @returns {Promise<void>}
     */
    async willUpdate(changed) {
        if (changed.has('value')) {
            this.dispatchEvent(new CustomEvent('value-changed', {
                detail: {value: this.value}, bubbles: true, composed: true
            }));
        }
    }


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
            anchor-name: --translation-selector;
        }

        .popover {
            position: absolute;
            position-anchor: --translation-selector;
            position-area: bottom;
            position-try: most-width, flip-inline, bottom left;
            margin: 5px;

            font-size: 1rem;
            font-weight: normal;
            font-family: sans-serif;

            border: 1px solid #ccc;
            border-radius: 5px;
        }

        .headline {
            min-width: 300px;
        }

        ul {
            list-style: none;
            padding: 0;
            margin: 0;

            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        li {
        }

        .option {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            min-width: 250px;
            width: 100%;
            align-items: center;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 5px;
        }

        .text {
            flex-grow: 1;
            text-align: initial;
        }
    `;

    render() {
        let buttonIcon = '';

        if (typeof this.value === 'number') {
            const currentLangauge = window.editaraInfo.pageLanguages.find(lang => lang.uid === this.value);
            const flagUrl = this.flagUrl(currentLangauge.flag);
            buttonIcon = html`<img src="${flagUrl}" alt="Language Icon" title="Language Icon" style="width: 100%; height: auto;"/>`;
        } else {
            buttonIcon = html`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" style="width: 100%">
                    <g fill="currentColor" opacity=".5">
                        <path d="M14.8 1H5.3c-.2 0-.3.1-.3.3V5h5.6l.5-1H7V3h2V2h2v1h2v1h-.8L11 6.4v.8l.9.9-.7.7-.2-.1V11h3.8c.1 0 .3-.1.3-.3V1.3c-.1-.2-.2-.3-.3-.3z"/>
                    </g>
                    <g fill="currentColor">
                        <path d="m5.8 8-.5 2h1.5l-.5-2z"/>
                        <path d="M10.8 5H1.3c-.2 0-.3.1-.3.3v9.5c0 .1.1.2.3.2h9.5c.1 0 .3-.1.3-.3V5.3c-.1-.2-.2-.3-.3-.3zm-3.3 8L7 11H5l-.5 2h-1L5 7h2l1.5 6h-1z"/>
                    </g>
                </svg>`;
        }

        const randomId = Math.random().toString(36).substring(2, 15);
        const currentPageLanguage = window.editaraInfo.pageLanguages.find(lang => lang.uid === window.editaraInfo.currentLanguageId);
        const options = [
            {
                uid: '',
                title: currentPageLanguage.title + ' (no sync)',
                flag: currentPageLanguage.flag,
            },
            ...window.editaraInfo.pageLanguages.filter((lang) => {
                return lang.uid !== window.editaraInfo.currentLanguageId;
            }),];
        return html`
            <button popovertarget="popover-${randomId}">
                ${buttonIcon}
            </button>
            <div class="popover" id="popover-${randomId}" popover>
                <span class="headline">Sync From:</span>
                <ul>
                    ${map(options, (lang) => html`
                        <li>
                            <button class="option" @click="${() => {
                                this.value = lang.uid;
                                const popover = this.shadowRoot.querySelector(`#popover-${randomId}`);
                                popover.hidePopover();
                            }}">
                                <img src="${this.flagUrl(lang.flag)}" alt="" style="width: 20px; height: auto;"/>
                                <span class="text">${lang.title}</span>
                                <span>${lang.uid === this.value ? html`
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" style="height:20px">
                                        <g fill="currentColor">
                                            <path d="m13.3 4.8-.7-.7c-.2-.2-.5-.2-.7 0L6.5 9.5 4 6.9c-.2-.2-.5-.2-.7 0l-.6.7c-.2.2-.2.5 0 .7l3.6 3.6c.2.2.5.2.7 0l6.4-6.4c.1-.2.1-.5-.1-.7z"/>
                                        </g>
                                    </svg>` : ''}</span>
                            </button>
                        </li>
                    `)}
                </ul>
            </div>
        `;
    }

    /**
     * @param {string} flagName
     * @returns {string}
     */
    flagUrl(flagName) {
        return `/_assets/1ee1d3e909b58d32e30dcea666dd3224/Icons/Flags/${flagName}.webp`;
    }
}

customElements.define('translation-selector', TranslationSelector);
