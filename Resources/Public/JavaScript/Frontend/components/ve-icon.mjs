import {css, html, LitElement} from 'lit';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

/**
 * @extends {HTMLElement}
 * TODO we should use <typo3-backend-icon > in frontend as well (make this possible)
 */
export class VeIcon extends LitElement {
  static properties = {
    name: {type: String},
    width: {type: String},
  };

  constructor() {
    super();
    this.width = '1em';
  }

  icons = {
    'actions-toggle-off': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="currentColor"><path d="M5 5C3.3 5 2 6.3 2 8s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/><path d="M11 4c2.2 0 4 1.8 4 4s-1.8 4-4 4H5c-2.2 0-4-1.8-4-4s1.8-4 4-4h6m0-1H5C2.2 3 0 5.2 0 8s2.2 5 5 5h6c2.8 0 5-2.2 5-5s-2.2-5-5-5z"/></g></svg>',
    'actions-toggle-on': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="currentColor"><path d="M11 3H5C2.2 3 0 5.2 0 8s2.2 5 5 5h6c2.8 0 5-2.2 5-5s-2.2-5-5-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></g></svg>',
    'actions-open': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="currentColor"><path d="m9.293 3.293-8 8A.997.997 0 0 0 1 12v3h3c.265 0 .52-.105.707-.293l8-8-3.414-3.414zM8.999 5l.5.5-5 5-.5-.5 5-5zM4 14H3v-1H2v-1l1-1 2 2-1 1zM13.707 5.707l1.354-1.354a.5.5 0 0 0 0-.707L12.354.939a.5.5 0 0 0-.707 0l-1.354 1.354 3.414 3.414z"/></g></svg>',
    'actions-delete': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="currentColor"><path d="M7 5H6v8h1zM10 5H9v8h1z"/><path d="M13 3h-2v-.75C11 1.56 10.44 1 9.75 1h-3.5C5.56 1 5 1.56 5 2.25V3H3v10.75c0 .69.56 1.25 1.25 1.25h7.5c.69 0 1.25-.56 1.25-1.25V3zm-7-.75A.25.25 0 0 1 6.25 2h3.5a.25.25 0 0 1 .25.25V3H6v-.75zm6 11.5a.25.25 0 0 1-.25.25h-7.5a.25.25 0 0 1-.25-.25V4h8v9.75z"/><path d="M13.5 4h-11a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1z"/></g></svg>',
    'actions-menu-alternative': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="currentColor"><path d="M8.5 9h-1c-.3 0-.5-.2-.5-.5v-1c0-.3.2-.5.5-.5h1c.3 0 .5.2.5.5v1c0 .3-.2.5-.5.5zM8.5 4h-1c-.3 0-.5-.2-.5-.5v-1c0-.3.2-.5.5-.5h1c.3 0 .5.2.5.5v1c0 .3-.2.5-.5.5zM8.5 14h-1c-.3 0-.5-.2-.5-.5v-1c0-.3.2-.5.5-.5h1c.3 0 .5.2.5.5v1c0 .3-.2.5-.5.5z"/></g></svg>',
    'actions-document-add': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="currentColor"><path d="M7 14H2V2h12v5l1 1V1.5a.5.5 0 0 0-.5-.5h-13a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5H8l-1-1z"/><path d="M3 3h10v2H3zM3 6h8l-1 1H3zM3 10h4l-1 1H3zM3 12h3v1H3zM3 8h6L8 9H3zM15.5 13H13v2.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5V13H8.5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5H11V8.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V11h2.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5z"/></g></svg>',
    'apps-pagetree-drag-move-into': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g><path fill="#AAA" d="M.5 10.5v-5h2.293l1 1H6.5v4z"/><path fill="#666" d="m2.586 6 .707.707.293.293H6v3H1V6h1.586M3 5H0v6h7V6H4L3 5z"/></g><path fill="currentColor" d="M13 11 9 8.5 13 6v2h3v1h-3z"/></svg>',
    'actions-undo': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="currentColor"><path d="M8 2c-1.8 0-3.4.8-4.5 2l-1-1c-.2-.2-.4-.1-.4.1l-.9 3.8c0 .2.1.3.3.3l3.8-.9c.2 0 .3-.3.1-.4l-1-1c.9-1 2.2-1.7 3.7-1.7 2.7 0 4.9 2.2 4.9 4.9S10.8 13 8.1 13c-1.5 0-2.8-.7-3.7-1.7l-.9.7c1.1 1.2 2.7 2 4.5 2 3.3 0 6-2.7 6-6s-2.7-6-6-6z"/></g></svg>',
  };

  // createRenderRoot() {
  //   // Disable shadow DOM
  //   return this;
  // }

  render() {
    const icon = unsafeHTML(this.icons[this.name]) || html`missing icon ${this.name}`;
    return html`
    <span class="icon" style="width: ${this.width};">${icon}</span>`;
  }

  static styles = css`
    :host {
      line-height: 0;
    }

    .icon {
      display: inline-block;
      line-height: 0;
    }

    .icon > svg {
      width: 100%;
    }
  `;
}

customElements.define('ve-icon', VeIcon);
