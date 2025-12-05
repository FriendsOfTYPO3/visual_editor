import Modal from '@typo3/backend/modal.js';
import {onMessage, stopListeningMessages} from '@andersundsehr/editara/Shared/iframe-messaging.mjs';
import '@andersundsehr/editara/Backend/editara-backend-save-button.mjs';
import '@andersundsehr/editara/Backend/editara-spotlight-toggle.mjs';


console.log('%cEditara backend index.js init', 'color: green; font-size: 10px;');

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
 */
function openIframeModal(src, title = '', size = 'large') {
    const modal = Modal.advanced({
        type: 'iframe',
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

onMessage('openModal', (data) => openIframeModal(data.src, data.title || '', data.size || undefined));
onMessage('reloadFrames', () => reloadAllChildFrames());
