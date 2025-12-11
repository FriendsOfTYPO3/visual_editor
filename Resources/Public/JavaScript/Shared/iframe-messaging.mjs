export const isDirectMode = window.parent === window;


/**
 * @typedef {Object} EditaraCommandDetailMap
 * @property openModal {{ src: string, title:string, size: 'medium' | 'large' | 'full', type: 'iframe' | 'ajax' }}
 * @property closeModal {null}
 * @property reloadFrames {null}
 * @property updateChangesCount {number}
 * @property doSave {null}
 * @property onSave {null}
 * @property saveEnded {null}
 * @property spotlight {Boolean}
 * @property pageChanged {Boolean}
 * @property openInMiddleFrame {String}
 * @property change {Number}
 */

/**
 * @template {keyof EditaraCommandDetailMap} K
 * @param command {K}
 * @param detail {EditaraCommandDetailMap[K]}
 */
export function sendMessage(command, detail = null) {
  const message = {
    detail,
    command: `editara_${command}`,
  };
  top.postMessage(message, '*');
}

/**
 * @type {Partial<{[K in keyof EditaraCommandDetailMap]: array<(detail: EditaraCommandDetailMap[K]) => void>}>}
 */
const messageListeners = {};
let isMessageListenerInitialized = false;

/**
 * @template {keyof EditaraCommandDetailMap} K
 * @param command {K}
 * @param callback {(detail: EditaraCommandDetailMap[K]) => void}
 */
export function onMessage(command, callback) {
  messageListeners[`editara_${command}`] = messageListeners[`editara_${command}`] || [];
  messageListeners[`editara_${command}`].push(callback);
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
 * @template {keyof EditaraCommandDetailMap} K
 * @param command {K}
 * @param callback {(detail: EditaraCommandDetailMap[K]) => void}
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
 * @template {keyof EditaraCommandDetailMap} K
 * @param command {K}
 */
export function stopListeningMessages(command) {
  delete messageListeners[command];
}
