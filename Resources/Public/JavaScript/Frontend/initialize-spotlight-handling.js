import {highlight, reset} from '@typo3/visual-editor/Frontend/spotlight-overlay';
import {spotlightActive} from '@typo3/visual-editor/Shared/local-stores';

export function initializeSpotlightHandling() {
  const setSpotlight = () => {
    if (spotlightActive.get()) {
      highlight('ve-editable-text, ve-editable-rich-text, .ck-editor__top, img[data-veedit]');
    } else {
      reset();
    }
  };

  spotlightActive.addEventListener('change', setSpotlight);
  setSpotlight();
}
