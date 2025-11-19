export const isDirectMode = window.parent === window;


/**
 * @typedef {Object} EditaraCommandDetailMap
 * @property openModal {{ src: string, title:string, size: 'medium' | 'large' | 'full' }}
 * @property closeModal {null}
 * @property reloadFrames {null}
 * @property updateChangesCount {number}
 * @property doSave {null}
 * @property onSave {null}
 * @property saveEnded {null}
 * @property spotlight {Boolean}
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

const messageListeners = {};
let isMessageListenerInitialized = false;

/**
 * @template {keyof EditaraCommandDetailMap} K
 * @param command {K}
 * @param callback {(detail: EditaraCommandDetailMap[K]) => void}
 */
export function onMessage(command, callback) {
  messageListeners[`editara_${command}`] = callback;
  if (!isMessageListenerInitialized) {
    isMessageListenerInitialized = true;

    top.addEventListener('message', (event) => {
      console.log('Received message:', event.data);
      if (messageListeners[event.data.command]) {
        messageListeners[event.data.command](event.data.detail);
      }
    });
  }
}

/**
 * @template {keyof EditaraCommandDetailMap} K
 * @param command {K}
 */
export function stopListeningMessages(command) {
  delete messageListeners[command];
}
