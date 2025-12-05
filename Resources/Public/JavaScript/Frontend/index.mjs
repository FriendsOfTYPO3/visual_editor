import '@andersundsehr/editara/Frontend/reset-button.mjs';
import '@andersundsehr/editara/Frontend/translation-selector.mjs';
import '@andersundsehr/editara/Frontend/editable-input.mjs';
import '@andersundsehr/editara/Frontend/editable-rte.mjs';
import '@andersundsehr/editara/Frontend/components/editara-content-element.mjs';
import '@andersundsehr/editara/Frontend/components/editara-column.mjs';
import '@andersundsehr/editara/Frontend/editara-save-button.mjs';
import '@andersundsehr/editara/Frontend/components/editara-drag-handle.mjs';
import '@andersundsehr/editara/Frontend/components/editara-drop-zone.mjs';
import '@andersundsehr/editara/Frontend/iframe-popup.mjs';
import {onMessage, sendMessage} from '@andersundsehr/editara/Shared/iframe-messaging.mjs';
import {highlight, reset} from "@andersundsehr/editara/Frontend/spotlight-overlay.mjs";

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
