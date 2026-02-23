/**
 * @typedef {Record<string, Record<number, Record<string, boolean|number|string>>>} Data
 * @typedef {Record<string, Record<number, Record<'move'|'copy'|'delete', any>>>} Cmd
 * @param {Data} data
 * @param {Cmd} cmd
 * @returns {Promise<void>}
 */
export async function useDataHandler(data = {}, cmd = {}) {
  const response = await fetch(window.location.href, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Token': window.veInfo.token,
    },
    body: JSON.stringify({data, cmd}, null, 2),
  });
  if (!response.ok) {
    document.body.innerHTML = await response.text();
    throw new Error('Failed to save data');
  }
}
