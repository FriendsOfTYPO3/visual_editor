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
    onMessage('localStoreChange', ({key, value}) => {
      if (key === this.key) {
        localStorage.setItem(this.key, JSON.stringify(value)); // save the updated value (as it could be from another origin)

        this.dispatchEvent(new Event('change'));
      }
    });
    onMessage('localStoreRequest', (requestedKey => {
      if (requestedKey === this.key) {
        sendMessage('localStoreChange', {key: this.key, value: this.get()}, 'iframe');
      }
    }));
    sendMessage('localStoreRequest', this.key, 'parent'); // parent might have a different value (set in another origin)
  }

  get() {
    return JSON.parse(localStorage.getItem(this.key));
  }

  set(value) {
    localStorage.setItem(this.key, JSON.stringify(value));
    this.dispatchEvent(new Event('change')); // for current window/tab
    sendMessage('localStoreChange', {key:this.key, value}); // for parent/iframe
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
