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
  const editorIframe = document.querySelector('iframe#visual-editor-iframe');
  if (editorIframe) {
    if (sendTo === 'parent') {
      return;
    }
    // we are the parent, send message to the iframe
    editorIframe.contentWindow.postMessage(message, '*');
  } else {
    if (sendTo === 'iframe') {
      return;
    }
    // we are the iframe, send message to the parent
    parent.postMessage(message, '*');
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
  messageListeners[`ve_${command}`] = messageListeners[`ve_${command}`] || [];
  messageListeners[`ve_${command}`].push(callback);
  if (!isMessageListenerInitialized) {
    isMessageListenerInitialized = true;

    window.addEventListener('message', (event) => {
      // TODO Security: validate origin
      if (messageListeners[event.data.command]) {
        for (const callback of messageListeners[event.data.command]) {
          callback(event.data.detail);
        }
      }
    });
  }
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
  onMessage(command, debouncedCallback);
}

/**
 * @template {keyof VECommandDetailMap} K
 * @param command {K}
 */
export function stopListeningMessages(command) {
  delete messageListeners[command];
}
