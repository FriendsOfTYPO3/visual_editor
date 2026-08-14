/**
 * @param {{table: string, uid: number, field: string, fieldPositionId?: string, name?: string, closest: Function}} editable
 * @param {'text'|'richText'} [kind]
 * @return {Object}
 */
export function getEditableChangeMetadata(editable, kind = 'text') {
  const recordMetadata = editable.closest('ve-content-element')?.changeMetadata || {};
  const fieldSuffix = `:${editable.field}`;
  const recordKey = recordMetadata.recordKey
    || (editable.fieldPositionId?.endsWith(fieldSuffix) ? editable.fieldPositionId.slice(0, -fieldSuffix.length) : `${editable.table}:${editable.uid}`);
  const editableOrder = [...document.querySelectorAll('ve-content-element, ve-editable-text, ve-editable-rich-text')].indexOf(editable);
  const order = editableOrder >= 0 ? editableOrder : recordMetadata.order;
  const name = editable.name || '';
  const labelSeparator = name.indexOf(': ');
  const recordLabel = labelSeparator >= 0 ? name.slice(0, labelSeparator) : '';
  const fieldLabel = labelSeparator >= 0 ? name.slice(labelSeparator + 2) : (name || editable.field);

  return {
    ...recordMetadata,
    recordKey,
    recordLabel: recordMetadata.recordLabel || recordLabel || recordKey,
    recordType: recordMetadata.recordType || editable.table,
    fieldLabel,
    fieldPositionId: editable.fieldPositionId || `${recordKey}:${editable.field}`,
    kind,
    hidden: false,
    ...(order >= 0 ? {order} : {}),
  };
}

/**
 * Keeps stored record and field positions aligned with the current DOM order.
 * The caller publishes the refreshed metadata with its next state change.
 *
 * @param {Object} dataHandlerStore
 * @return {void}
 */
export function refreshEditableChangeMetadataOrders(dataHandlerStore) {
  const elements = [...document.querySelectorAll('ve-content-element, ve-editable-text, ve-editable-rich-text')];
  elements.forEach((element, order) => {
    if (element.tagName.toLowerCase() === 've-content-element') {
      dataHandlerStore.updateFieldMetadataOrder(element.changeMetadata.recordKey, order, false);
      return;
    }
    dataHandlerStore.setFieldMetadata(element.table, element.uid, element.field, {order}, false);
  });
}
