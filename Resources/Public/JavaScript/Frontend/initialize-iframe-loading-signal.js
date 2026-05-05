import {sendMessage} from '@typo3/visual-editor/Shared/iframe-messaging';

export function initializeIframeLoadingSignal() {
  let hasSentLoadingStarted = false;
  const sendLoadingStarted = () => {
    if (hasSentLoadingStarted) {
      return;
    }
    hasSentLoadingStarted = true;
    sendMessage('iframeLoadingStarted', null, 'parent');
  };

  window.addEventListener('pagehide', sendLoadingStarted, {once: true});
  window.addEventListener('beforeunload', sendLoadingStarted, {once: true});
}
