import Modal from '@typo3/backend/modal.js';

console.log('%cEditara middleFrameScript init', 'color: green; font-size: 10px;');

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

    top.addEventListener("message", (event) => {
        if (event.data.command !== 'editaraCloseModal') {
            return;
        }
        modal.hideModal();

        // remove listener after use
        top.removeEventListener("message", this);

        // reload all child iframes:
        reloadAllChildFrames();
    });
}

top.addEventListener("message", (event) => {
    if (event.data.command === 'editaraOpenModal') {
        openIframeModal(event.data.src, event.data.title || '', event.data.size || undefined);
    }
    if (event.data.command === 'editaraReloadFrames') {
        reloadAllChildFrames();
    }
});
