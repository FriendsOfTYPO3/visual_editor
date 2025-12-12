import '@andersundsehr/editara/Frontend/components/reset-button.mjs';
import '@andersundsehr/editara/Frontend/components/editable-input.mjs';
import '@andersundsehr/editara/Frontend/components/editable-rte.mjs';
import '@andersundsehr/editara/Frontend/components/editara-content-element.mjs';
import '@andersundsehr/editara/Frontend/components/editara-column.mjs';
import '@andersundsehr/editara/Frontend/components/editara-save-button.mjs';
import '@andersundsehr/editara/Frontend/components/editara-drag-handle.mjs';
import '@andersundsehr/editara/Frontend/components/editara-drop-zone.mjs';
import '@andersundsehr/editara/Frontend/components/editara-icon.mjs';
import '@andersundsehr/editara/Frontend/iframe-popup.mjs';
import {sendMessage} from '@andersundsehr/editara/Shared/iframe-messaging.mjs';
import {highlight, reset} from "@andersundsehr/editara/Frontend/spotlight-overlay.mjs";
import { spotlightActive} from "@andersundsehr/editara/Shared/local-store.js";

if (window.location.hash === '#editara-close') {
  sendMessage('closeModal');
  // this closes the window as it was a _target="_blank" opened window from the edit button (eg: editable: link)
  window.close();
}

const element = document.createElement('editara-save-button');
document.body.appendChild(element);

(function spotlight() {
  spotlightActive.addEventListener('currentWindowChange', () => {
    if (spotlightActive.get()) {
      highlight('.editara-focus');
    } else {
      reset();
    }
  });

  if (spotlightActive.get()) {
    highlight('.editara-focus');
  } else {
    reset();
  }
})();

if (window.editaraInfo) {
  sendMessage('pageChanged', window.editaraInfo.pageId);
}
