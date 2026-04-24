import {sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';

export function initializeImageHandling() {
  const images = document.querySelectorAll('img[data-veedit]');
  for (const image of images) {
    if (!(image instanceof HTMLImageElement)) {
      continue;
    }

    image.addEventListener('click', (e) => {
      const data = JSON.parse(image.dataset.veedit);
      if (!data.editUrl) {
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();

      if (!data.url) {
        // We are in TYPO3 13 and need to open the url directly
        sendMessage('openInMiddleFrame', data.editUrl);
        return;
      }
      const tag = document.createElement('typo3-backend-contextual-record-edit-trigger');
      tag.setAttribute('url', data.url);
      tag.setAttribute('edit-url', data.editUrl);
      tag.click();
    });
  }
}
