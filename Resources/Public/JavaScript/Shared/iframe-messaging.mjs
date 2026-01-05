export const isDirectMode = window.parent === window;


/**
 * @typedef {Object} VECommandDetailMap
 * @property openModal {{ src: string, title:string, size: 'medium' | 'large' | 'full', type: 'iframe' | 'ajax' }}
 * @property closeModal {null}
 * @property reloadFrames {null}
 * @property updateChangesCount {number}
 * @property doSave {null}
 * @property onSave {null}
 * @property saveEnded {null}
 * @property pageChanged {Boolean}
 * @property openInMiddleFrame {String}
 * @property change {Number}
 * @property localStoreChange {String}
 */

/**
 * @template {keyof VECommandDetailMap} K
 * @param command {K}
 * @param detail {VECommandDetailMap[K]}
 */
export function sendMessage(command, detail = null) {
  const message = {
    detail,
    command: `ve_${command}`,
  };
  top.postMessage(message, '*');
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

    top.addEventListener('message', (event) => {
      if (messageListeners[event.data.command]) {
        for(const callback of messageListeners[event.data.command]) {
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
