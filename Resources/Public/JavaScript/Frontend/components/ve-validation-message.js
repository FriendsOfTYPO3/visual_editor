import {css, html, LitElement} from 'lit';

export class VeValidationMessage extends LitElement {
  static properties = {
    reason: {type: String},
    animationKey: {type: Number},
    shakeKey: {type: Number},
    animated: {type: Boolean},
  };

  constructor() {
    super();
    this.reason = '';
    this.animationKey = 0;
    this.shakeKey = 0;
    this.animated = false;
    this.shakeTimeout = null;
  }

  firstUpdated() {
    this.#syncAnimationState();
  }

  updated(changedProperties) {
    if (changedProperties.has('animationKey') && this.animated) {
      this.#restartFadeAnimation();
      this.#restartShakeAnimation();
      return;
    }

    if (changedProperties.has('shakeKey') && changedProperties.get('shakeKey') !== undefined) {
      this.#restartShakeAnimation();
    }

    if (changedProperties.has('animated')) {
      this.#syncAnimationState();
    }
  }

  disconnectedCallback() {
    if (this.shakeTimeout) {
      clearTimeout(this.shakeTimeout);
      this.shakeTimeout = null;
    }
    super.disconnectedCallback();
  }

  render() {
    return html`
      <div class="validation-bubble bubble ${this.animated ? 'animate' : ''}" aria-live="polite">
        ${this.reason}
      </div>
    `;
  }

  #syncAnimationState() {
    if (!this.animated) {
      const bubble = this.shadowRoot?.querySelector('.bubble');
      bubble?.classList.remove('animate', 'shake-invalid');
      if (this.shakeTimeout) {
        clearTimeout(this.shakeTimeout);
        this.shakeTimeout = null;
      }
      return;
    }

    this.#restartFadeAnimation();
  }

  #restartFadeAnimation() {
    const bubble = this.shadowRoot?.querySelector('.bubble');
    if (!bubble || !this.animated) {
      bubble?.classList.remove('animate');
      return;
    }

    bubble.classList.remove('animate');
    void bubble.offsetWidth;
    bubble.classList.add('animate');
  }

  #restartShakeAnimation() {
    const bubble = this.shadowRoot?.querySelector('.bubble');
    if (!bubble) {
      return;
    }

    bubble.classList.remove('shake-invalid');
    void bubble.offsetWidth;
    bubble.classList.add('shake-invalid');

    if (this.shakeTimeout) {
      clearTimeout(this.shakeTimeout);
    }

    this.shakeTimeout = setTimeout(() => {
      bubble.classList.remove('shake-invalid');
      this.shakeTimeout = null;
    }, 250);
  }

  static styles = css`
    :host {
      display: block;
    }

    .validation-bubble {
      display: block;
      width: max-content;
      padding: 0.4rem 0.55rem;
      border-radius: 0.45rem;
      border: 1px solid rgba(164, 0, 0, 0.35);
      background: rgba(255, 248, 248, 0.96);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
      backdrop-filter: blur(10px);
      color: #a40000;
      font-size: 14px;
      line-height: 1.3;
      text-wrap: pretty;
      font-family: "Open Sans", serif;
      font-weight: normal;
    }

    .bubble {
      will-change: opacity, transform;
    }

    .bubble.animate {
      animation: denied-input-fade 4s ease-out forwards;
    }

    .bubble.shake-invalid {
      animation: shake-invalid 0.2s ease-in-out;
    }

    .bubble.animate.shake-invalid {
      animation: shake-invalid 0.2s ease-in-out, denied-input-fade 4s ease-out forwards;
    }

    @keyframes denied-input-fade {
      0% {
        opacity: 1;
      }

      50% {
        opacity: 1;
      }

      90% {
        opacity: 0.5;
      }

      100% {
        opacity: 0;
      }
    }

    @keyframes shake-invalid {
      0% {
        transform: translateX(0);
      }

      25% {
        transform: translateX(-3px);
      }

      50% {
        transform: translateX(3px);
      }

      75% {
        transform: translateX(-2px);
      }

      100% {
        transform: translateX(0);
      }
    }
  `;
}

customElements.define('ve-validation-message', VeValidationMessage);
