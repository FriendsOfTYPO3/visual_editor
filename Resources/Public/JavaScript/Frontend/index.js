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
import {initializeNavigationInterception} from '@typo3/visual-editor/Frontend/initialize-navigation-interception';
import {initializeSaveHandling} from '@typo3/visual-editor/Frontend/initialize-save-handling';
import {initializeSpotlightHandling} from '@typo3/visual-editor/Frontend/initialize-spotlight-handling';
import {initializeImageHandling} from '@typo3/visual-editor/Frontend/initialize-image-handling';
import {initializeScrollPositionSyncAndSave} from '@typo3/visual-editor/Frontend/scroll-position-sync';
import {initializeIframeLoadingSignal} from '@typo3/visual-editor/Frontend/initialize-iframe-loading-signal';
import {Idiomorph} from 'idiomorph';

if (window.location.hash === '#ve-close') {
  sendMessage('closeModal');
  // this closes the window as it was a _target="_blank" opened window from the edit button (eg: editable: link)
  window.close();
}

if (window.veInfo) {
  sendMessage('pageChanged', window.veInfo);
}

initializeSpotlightHandling();
initializeIframeLoadingSignal();
initializeSaveHandling();
initializeNavigationInterception();
initializeImageHandling();
initializeScrollPositionSyncAndSave();

window.testIdiomorph = async () => {
  console.time('testIdiomorph');
  const response = await fetch(window.location.href);
  const html = await response.text();
  const parser = new DOMParser();
  const newStateDocument = parser.parseFromString(html, 'text/html');
  await Idiomorph.morph(
    document.body,
    newStateDocument.body,
    {
      callbacks: {
        beforeAttributeUpdated: (attributeName, node, mutationType) => {
          // is lit-element:
          if ('constructor' in node && 'getPropertyOptions' in node.constructor) {
            if (node.constructor.getPropertyOptions(attributeName).reflect) {
              // if reflect is true, than the lit element can handle changing attributes:
              return true;
            }
            // if not, than the change will do nothing:
            return false;
          }
          return true;
        },
        beforeNodeMorphed: (oldNode, newNode) => {
          if (
            'parentNode' in oldNode
            && 'tagName' in oldNode.parentNode
            && oldNode.parentNode.tagName.toLowerCase() === 've-editable-rich-text') {
            return false;
          }

          return true;
        },
      },
    },
  );
  console.timeEnd('testIdiomorph');
};
