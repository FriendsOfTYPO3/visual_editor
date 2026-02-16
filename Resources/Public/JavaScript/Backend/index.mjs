import Modal from '@typo3/backend/modal.js';
import {onMessage, stopListeningMessages} from '@typo3/visual-editor/Shared/iframe-messaging.mjs';
import '@typo3/visual-editor/Backend/components/ve-auto-save-toggle.mjs';
import '@typo3/visual-editor/Backend/components/ve-backend-save-button.mjs';
import '@typo3/visual-editor/Backend/components/ve-spotlight-toggle.mjs';
import '@typo3/visual-editor/Backend/components/ve-show-empty-toggle.mjs';
import {ModuleStateStorage} from '@typo3/backend/storage/module-state-storage.js';


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
  window.location = href;
});

onMessage('pageChanged', ({pageId, languageId}) => {
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('id', pageId);
  if (languageId) {
    newUrl.searchParams.set('language', languageId);
  } else {
    newUrl.searchParams.delete('language');
  }
  window.history.pushState(null, '', newUrl);

  // set href of refresh button to new URL
  document.querySelector('[data-identifier="actions-refresh"]').parentNode.href = newUrl.toString();

  const newUrlTop = new URL(window.top.location.href);
  newUrlTop.searchParams.set('id', pageId);
  if (languageId) {
    newUrlTop.searchParams.set('language', languageId);
  } else {
    newUrlTop.searchParams.delete('language');
  }
  window.top.history.pushState(null, '', newUrlTop);

  ModuleStateStorage.update('web', pageId);
});
