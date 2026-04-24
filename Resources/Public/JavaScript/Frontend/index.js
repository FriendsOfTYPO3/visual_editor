import '@typo3/visual-editor/Frontend/components/ve-reset-button';
import '@typo3/visual-editor/Frontend/components/ve-editable-text';
import '@typo3/visual-editor/Frontend/components/ve-editable-rich-text';
import '@typo3/visual-editor/Frontend/components/ve-content-element';
import '@typo3/visual-editor/Frontend/components/ve-content-area';
import '@typo3/visual-editor/Frontend/components/ve-drag-handle';
import '@typo3/visual-editor/Frontend/components/ve-drop-zone';
import '@typo3/visual-editor/Frontend/components/ve-icon';
import '@typo3/visual-editor/Frontend/components/ve-error';
import '@typo3/visual-editor/Frontend/components/ve-iframe-popup';
import {sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {initSaveScrollPosition} from '@typo3/visual-editor/Frontend/init-save-scroll-position';
import {initializeCrossOriginNavigations} from '@typo3/visual-editor/Frontend/initialize-cross-origin-navigations';
import {initializeSaveHandling} from '@typo3/visual-editor/Frontend/initialize-save-handling';
import {initializeSpotlightHandling} from '@typo3/visual-editor/Frontend/initialize-spotlight-handling';
import {initializeImageHandling} from '@typo3/visual-editor/Frontend/initialize-image-handling';

if (window.location.hash === '#ve-close') {
  sendMessage('closeModal');
  // this closes the window as it was a _target="_blank" opened window from the edit button (eg: editable: link)
  window.close();
}

if (window.veInfo) {
  sendMessage('pageChanged', window.veInfo);
}

initializeSpotlightHandling();
initializeSaveHandling();
initSaveScrollPosition();
initializeCrossOriginNavigations();
initializeImageHandling();
