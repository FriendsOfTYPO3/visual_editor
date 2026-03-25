export const isDirectMode = window.parent === window;


/**
 * @typedef {Object} VECommandDetailMap
 * @property openModal {{ src: String, title: String, size: 'medium' | 'large' | 'full', type: 'iframe' | 'ajax' }}
 * @property closeModal {null}
 * @property reloadFrames {null}
 * @property updateChangesCount {number}
 * @property doSave {null}
 * @property onSave {null}
 * @property saveEnded {{updatePageTree: boolean}}
 * @property pageChanged {{pageId: number, languageId: number}}
 * @property openInMiddleFrame {String}
 * @property change {Number}
 * @property localStoreChange {{key: String, value: any}}
 * @property localStoreRequest {String}
 */

/**
 * Returns the origin of the communication peer.
 * Parent side: derived from the iframe's src (supports cross-domain sites).
 * Child side: derived from document.referrer (the backend that loaded us).
 * @returns {string}
 */
function getPeerOrigin() {
  const editorIframe = document.querySelector('iframe#visual-editor-iframe');
  if (editorIframe) {
    return new URL(editorIframe.src, window.location.href).origin;
  }

  if (document.referrer) {
    const origin = new URL(document.referrer).origin;
    if (window.veInfo.allowedOrigins.includes(origin)) {
      return origin;
    }
  }

  return window.location.origin;
}

/**
 * @template {keyof VECommandDetailMap} K
 * @param command {K}
 * @param detail {VECommandDetailMap[K]}
 * @param sendTo {'parent' | 'iframe' | 'any'}
 */
export function sendMessage(command, detail = null, sendTo = 'any') {
  const message = {
    detail,
    command: `ve_${command}`,
  };
  const peerOrigin = getPeerOrigin();
  const editorIframe = document.querySelector('iframe#visual-editor-iframe');
  if (editorIframe) {
    if (sendTo === 'parent') {
      return;
    }
    editorIframe.contentWindow.postMessage(message, peerOrigin);
  } else {
    if (sendTo === 'iframe') {
      return;
    }
    parent.postMessage(message, peerOrigin);
  }
}

/**
 * @type {Partial<{[K in keyof VECommandDetailMap]: array<(detail: VECommandDetailMap[K]) => void>}>}
 */
const messageListeners = {};
let isMessageListenerInitialized = false;

/**
 * @template {keyof VECommandDetailMap} K
 * @param command {K}
 * @param callback {(detail: VECommandDetailMap[K]) => void}
 */
export function onMessage(command, callback) {
  const listenerKey = `ve_${command}`;

  messageListeners[listenerKey] = messageListeners[listenerKey] || [];
  messageListeners[listenerKey].push(callback);
  if (!isMessageListenerInitialized) {
    isMessageListenerInitialized = true;

    window.addEventListener('message', (event) => {
      if (event.origin !== getPeerOrigin()) {
        return;
      }
      const editorIframe = document.querySelector('iframe#visual-editor-iframe');
      const expectedSource = editorIframe ? editorIframe.contentWindow : window.parent;
      if (event.source !== expectedSource) {
        return;
      }
      if (messageListeners[event.data.command]) {
        for (const callback of messageListeners[event.data.command]) {
          callback(event.data.detail);
        }
      }
    });
  }

  return () => {
    const listeners = messageListeners[listenerKey];
    if (!listeners) {
      return;
    }

    const index = listeners.indexOf(callback);
    if (index === -1) {
      return;
    }

    listeners.splice(index, 1);
    if (listeners.length === 0) {
      delete messageListeners[listenerKey];
    }
  };
}

/**
 * @template {keyof VECommandDetailMap} K
 * @param command {K}
 * @param callback {(detail: VECommandDetailMap[K]) => void}
 * @param delay {number}
 */
export function onMessageDebounced(command, callback, delay = 300) {
  let timeoutId;
  const debouncedCallback = (detail) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(detail);
    }, delay);
  };
  const unsubscribe = onMessage(command, debouncedCallback);

  return () => {
    clearTimeout(timeoutId);
    unsubscribe();
  };
}

/**
 * @template {keyof VECommandDetailMap} K
 * @param command {K}
 */
export function stopListeningMessages(command) {
  delete messageListeners[`ve_${command}`];
}
