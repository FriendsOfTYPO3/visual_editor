import {onMessage, sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging.mjs';

class LocalStore extends EventTarget {
  /**
   * @param {string} key
   * @param {any} defaultValue
   */
  constructor(key, defaultValue = null) {
    super();
    this.key = key;
    if (localStorage.getItem(this.key) === null && defaultValue !== undefined) {
      localStorage.setItem(this.key, JSON.stringify(defaultValue));
    }
    // emit if the localStorage changes from other tabs/windows
    window.addEventListener('storage', (event) => {
      if (event.key === this.key) {
        this.dispatchEvent(new Event('change'));
      }
    });
    onMessage('localStoreChange', (changedKey) => {
      if (changedKey === this.key) {
        this.dispatchEvent(new Event('currentWindowChange'));
      }
    });
  }

  get() {
    return JSON.parse(localStorage.getItem(this.key));
  }

  set(value) {
    localStorage.setItem(this.key, JSON.stringify(value));
    // emit change event
    this.dispatchEvent(new Event('change'));
    sendMessage('localStoreChange', this.key);
  }
}

/**
 * @param {string} key
 * @param {any} defaultValue
 * @return {LocalStore}
 */
function localStore(key, defaultValue) {
  return new LocalStore(key, defaultValue);
}

export const spotlightActive = localStore('ve-spotlight-active', true);
export const autoSaveActive = localStore('ve-autosave-active', true);
export const showEmptyActive = localStore('ve-show-empty-active', true);
