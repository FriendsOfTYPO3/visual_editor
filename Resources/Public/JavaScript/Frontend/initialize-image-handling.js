import {sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';
import {lll} from "@typo3/core/lit-helper.js";

export function initializeImageHandling() {
  const images = document.querySelectorAll('img[data-veedit]');
  for (const image of images) {
    if (!(image instanceof HTMLImageElement)) {
      continue;
    }

    const data = JSON.parse(image.dataset.veedit);
    if (!data.editUrl) {
      return;
    }

    image.setAttribute('role', 'button');
    image.setAttribute('tabindex', '0');
    image.setAttribute('aria-label', lll('frontend.editImageButton'));
    const listener = (e) => {
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
    };
    image.addEventListener('click', listener);
    image.addEventListener('keydown', (e) => {
      if ((e.key !== 'Enter' && e.key !== ' ')) {
        return;
      }

      listener(e);
    });
  }
}
