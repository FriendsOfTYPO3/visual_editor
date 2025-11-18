import './reset-button.js';
import './translation-selector.js';
import './editable-input.js';
import './editable-rte.js';
import './editara-area-brick.js';
import './editara-save-button.js';
import './iframe-popup.js';
import {highlight} from './spotlight-overlay.js';

if (window.location.hash === '#editara-close') {
    top.postMessage({command: "editaraCloseModal"}, '*');
    // this closes the window as it was a _target="_blank" opened window from the edit button (eg: editable: link)
    window.close();
}

console.log('%cEditara is running!', 'color: green; font-size: 20px; font-weight: bold;');

const element = document.createElement('editara-save-button');
document.body.appendChild(element);

if (window.parent === window) {
    console.log('%cEditara: in direct mode', 'color: red; font-size: 16px;');
} else {
    console.log('%cEditara: in iframe mode', 'color: orange; font-size: 16px;');
}

highlight('.editara-focus');
