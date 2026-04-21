import Notification from '@typo3/backend/notification.js';
import {lll} from "@typo3/core/lit-helper.js";

/**
 * @typedef {Record<string, Record<number, Record<string, boolean|number|string>>>} Data
 * @typedef {Record<string, Record<number, Record<'move'|'copy'|'delete', any>>>} Cmd
 * @param {Data} data
 * @param {Cmd[]} cmdArray
 * @returns {Promise<boolean>} returns false if something broke
 */
export async function useDataHandler(data = {}, cmdArray = []) {
  const response = await fetch(window.location.href, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Token': window.veInfo.token,
    },
    body: JSON.stringify({data, cmdArray}, null, 2),
  });

  if (response.ok) {
    return true;
  }

  let body = await response.text();

  // if response has json parse it and check if errorLog is included:
  if (response.headers.get('Content-Type')?.includes('application/json')) {
    const data = JSON.parse(body);
    if (data.errorLog) {
      for (const error of data.errorLog) {
        Notification.error(lll('save.failed'), error);
      }
      return false;
    }
    const pre = document.createElement("PRE");
    pre.innerText = JSON.stringify(data, null, 2);
    body = pre.outerHTML;
  }

  // TODO handle innerHTML differently, (maybe return json exception with message and details instead of whole HTML)
  document.body.innerHTML = body;
  throw new Error('Failed to save data');
}
