import '@typo3/visual-editor/Frontend/components/ve-reset-button';
import '@typo3/visual-editor/Frontend/components/ve-editable-text';
import '@typo3/visual-editor/Frontend/components/ve-editable-rich-text';
import '@typo3/visual-editor/Frontend/components/ve-content-element';
import '@typo3/visual-editor/Frontend/components/ve-content-area';
import '@typo3/visual-editor/Frontend/components/ve-save-button';
import '@typo3/visual-editor/Frontend/components/ve-drag-handle';
import '@typo3/visual-editor/Frontend/components/ve-drop-zone';
import '@typo3/visual-editor/Frontend/components/ve-icon';
import '@typo3/visual-editor/Frontend/components/ve-error';
import '@typo3/visual-editor/Frontend/components/ve-iframe-popup';
import {sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {highlight, reset} from '@typo3/visual-editor/Frontend/spotlight-overlay';
import {spotlightActive} from '@typo3/visual-editor/Shared/local-stores';
import {initSaveScrollPosition} from '@typo3/visual-editor/Frontend/init-save-scroll-position';
import {initializeCrossOriginNavigations} from '@typo3/visual-editor/Frontend/initializeCrossOriginNavigations';

if (window.location.hash === '#ve-close') {
  sendMessage('closeModal');
  // this closes the window as it was a _target="_blank" opened window from the edit button (eg: editable: link)
  window.close();
}

const element = document.createElement('ve-save-button');
document.body.appendChild(element);

(function () {
  const setSpotlight = () => {
    if (spotlightActive.get()) {
      highlight('ve-editable-text, ve-editable-rich-text, .ck-editor__top');
    } else {
      reset();
    }
  };
  spotlightActive.addEventListener('change', setSpotlight);

  setSpotlight();
})();

if (window.veInfo) {
  sendMessage('pageChanged', window.veInfo);
}

initSaveScrollPosition();
initializeCrossOriginNavigations();
