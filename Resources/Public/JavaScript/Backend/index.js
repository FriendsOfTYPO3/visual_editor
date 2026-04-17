import Modal from '@typo3/backend/modal.js';
import {onMessage, stopListeningMessages} from '@typo3/visual-editor/Shared/iframe-messaging';
import '@typo3/visual-editor/Backend/components/ve-auto-save-toggle';
import '@typo3/visual-editor/Backend/components/ve-backend-save-button';
import '@typo3/visual-editor/Backend/components/ve-spotlight-toggle';
import '@typo3/visual-editor/Backend/components/ve-show-empty-toggle';
import {pageChanged} from '@typo3/visual-editor/Backend/page-changed';
import {initializePageTreeSaveState} from '@typo3/visual-editor/Backend/initialize-page-tree-save-state';

initializePageTreeSaveState();

function reloadAllChildFrames() {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    iframe.contentWindow.location.reload();
  });
}

/**
 * @param src {string}
 * @param title {string}
 * @param size {'medium' | 'large' | 'full'}
 * @param type {'iframe' | 'ajax'}
 */
function openIframeModal(src, title = '', size = 'large', type = 'iframe') {
  const modal = Modal.advanced({
    type,
    title,
    content: src,
    size,
    staticBackdrop: true,
  });

  onMessage('closeModal', () => {
    modal.hideModal();

    // remove listener after use
    stopListeningMessages('closeModal');

    // reload all child iframes:
    reloadAllChildFrames();
  });
}

onMessage('openModal', (data) => openIframeModal(data.src, data.title || '', data.size || undefined, data.type || undefined));
onMessage('reloadFrames', () => reloadAllChildFrames());
onMessage('openInMiddleFrame', (href) => {
  const parsedHref = new URL(href, window.location.href);
  // keep the origin of the current window to avoid CORS issues in the Backend.
  parsedHref.protocol = window.location.protocol;
  parsedHref.host = window.location.host;

  window.location = parsedHref.href;
});

onMessage('pageChanged', (data) => pageChanged(data.pageId, data.languageId, data.routeArguments));
