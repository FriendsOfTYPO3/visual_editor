import '@typo3/visual-editor/Frontend/components/ve-reset-button.mjs';
import '@typo3/visual-editor/Frontend/components/ve-editable-input.mjs';
import '@typo3/visual-editor/Frontend/components/ve-editable-rich-text.mjs';
import '@typo3/visual-editor/Frontend/components/ve-content-element.mjs';
import '@typo3/visual-editor/Frontend/components/ve-column.mjs';
import '@typo3/visual-editor/Frontend/components/ve-save-button.mjs';
import '@typo3/visual-editor/Frontend/components/ve-drag-handle.mjs';
import '@typo3/visual-editor/Frontend/components/ve-drop-zone.mjs';
import '@typo3/visual-editor/Frontend/components/ve-icon.mjs';
import '@typo3/visual-editor/Frontend/components/ve-iframe-popup.mjs';
import {sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging.mjs';
import {highlight, reset} from "@typo3/visual-editor/Frontend/spotlight-overlay.mjs";
import { spotlightActive} from "@typo3/visual-editor/Shared/stores.js";

if (window.location.hash === '#ve-close') {
  sendMessage('closeModal');
  // this closes the window as it was a _target="_blank" opened window from the edit button (eg: editable: link)
  window.close();
}

const element = document.createElement('ve-save-button');
document.body.appendChild(element);

(function spotlight() {
  const setSpotlight = () => {
    if (spotlightActive.get()) {
      highlight('ve-editable-input, ve-editable-rich-text');
    } else {
      reset();
    }
  };
  spotlightActive.addEventListener('currentWindowChange', setSpotlight);

  setSpotlight();
})();

if (window.veInfo) {
  sendMessage('pageChanged', window.veInfo.pageId);
}
