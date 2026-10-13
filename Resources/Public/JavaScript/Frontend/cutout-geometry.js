/**
 * Geometry shared by the spotlight cut-outs and the hover frame of a content element,
 * so the frame hugs exactly what the spotlight cuts out.
 */

/** Space between a field and the left and right edge of its cut-out. */
export const CUTOUT_PADDING_INLINE = 8;

/** Space between a field and the top and bottom edge of its cut-out. */
export const CUTOUT_PADDING_BLOCK = 6;

/** Corner radius of a cut-out and of the hover frame. */
export const CUTOUT_RADIUS = 5;

/** The editable elements that get a cut-out. */
export const FIELD_SELECTOR = 've-editable-text, ve-editable-rich-text, img[data-veedit]';
