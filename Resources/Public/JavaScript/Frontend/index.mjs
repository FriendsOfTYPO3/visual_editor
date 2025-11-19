import './reset-button.mjs';
import './translation-selector.mjs';
import './editable-input.mjs';
import './editable-rte.mjs';
import './editara-area-brick.mjs';
import './editara-save-button.mjs';
import './iframe-popup.mjs';
import {onMessage, sendMessage} from '../Shared/iframe-messaging.mjs';
import {highlight, reset} from "./spotlight-overlay.mjs";

if (window.location.hash === '#editara-close') {
  sendMessage('closeModal');
  // this closes the window as it was a _target="_blank" opened window from the edit button (eg: editable: link)
  window.close();
}

const element = document.createElement('editara-save-button');
document.body.appendChild(element);

(function spotlight() {
  onMessage('spotlight', (active) => {
    if (active) {
      highlight('.editara-focus');
    } else {
      reset();
    }
  });
  const active = localStorage.getItem('editara-spotlight-active') === 'true';
  if (active) {
    highlight('.editara-focus');
  }
})();
