import Modal from '@typo3/backend/modal.js';
import {onMessage, stopListeningMessages} from '@andersundsehr/editara/Shared/iframe-messaging.mjs';
import '@andersundsehr/editara/Backend/editara-backend-auto-save-button.mjs';
import '@andersundsehr/editara/Backend/editara-backend-save-button.mjs';
import '@andersundsehr/editara/Backend/editara-spotlight-toggle.mjs';
import {ModuleStateStorage} from '@typo3/backend/storage/module-state-storage.js';


function reloadAllChildFrames() {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    iframe.contentWindow.location.reload();
  });
}

/**
 *
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

onMessage('pageChanged', (pageId) => {

  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('id', pageId);
  window.history.pushState(null, '', newUrl);

  // set href of refresh button to new URL
  document.querySelector('[data-identifier="actions-refresh"]').parentNode.href = newUrl.toString();

  const newUrlTop = new URL(window.top.location.href);
  newUrlTop.searchParams.set('id', pageId);
  window.top.history.pushState(null, '', newUrlTop);

  // TODO for better usability we need to scroll to the newly selected page element
  ModuleStateStorage.update('web', pageId);
});
