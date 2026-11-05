/**
 * @typedef {{label: string, value: string}} AppearanceItem
 * @typedef {{value: string, items: AppearanceItem[]}} ResolvedAppearanceField
 */

/**
 * Asks the backend for the items of the fields like the edit form of the backend would show them.
 * The unsaved values are sent, because the items can depend on the other values of the record.
 * A value that is not allowed any more comes back reset.
 * Fields that the editor does not see in the edit form are missing in the answer.
 *
 * @param {{table: string, uid: number, pageId: number, fields: string[], values: Record<string, string>}} payload
 * @param {AbortSignal} signal
 * @return {Promise<Record<string, ResolvedAppearanceField>>}
 */
export async function fetchAppearanceItems(payload, signal) {
  const response = await fetch(TYPO3.settings.ajaxUrls.visual_editor_appearance_items, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Could not load the items of the appearance fields: ${response.status}`);
  }

  return (await response.json()).fields;
}
