/**
 * Decides whether a content element should be visually hidden because the editor
 * turned off "Show hidden".
 *
 * Elements with an unsaved change to their hidden field stay visible so the editor
 * can still see and revert the change they just made.
 *
 * @param {{showHidden: boolean, isHidden: boolean, hasUnsavedHiddenChange: boolean}} params
 * @returns {boolean}
 */
export function shouldHideContentElement({showHidden, isHidden, hasUnsavedHiddenChange}) {
  if (showHidden || !isHidden) {
    return false;
  }

  if (hasUnsavedHiddenChange) {
    return false;
  }

  return true;
}
