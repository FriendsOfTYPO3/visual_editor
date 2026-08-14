function getNestedValue(object, table, uid, field) {
  return object?.[table]?.[uid]?.[field];
}

function hasNestedValue(object, table, uid, field) {
  return Object.hasOwn(object?.[table]?.[uid] ?? {}, field);
}

function getRecordKey(metadata, table, uid) {
  if (metadata?.recordKey) {
    return metadata.recordKey;
  }
  if (metadata?.scrollPositionId) {
    return metadata.scrollPositionId;
  }
  if (metadata?.fieldPositionId?.includes(':')) {
    return metadata.fieldPositionId.slice(0, metadata.fieldPositionId.lastIndexOf(':'));
  }
  return `${table}:${uid}`;
}

function getStableUid(recordKey, fallbackUid) {
  const value = recordKey.slice(recordKey.indexOf(':') + 1);
  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? numericValue : fallbackUid;
}

function getFieldKind(metadata) {
  if (metadata.hidden || metadata.kind === 'visibility') {
    return 'visibility';
  }
  return ['richText', 'rich-text'].includes(metadata.kind) ? 'richText' : 'text';
}

function normalizeLanguage(language, fallbackId, fallbackOrder) {
  const languageId = language?.languageId ?? language?.id ?? fallbackId;
  return {
    languageId,
    languageTitle: language?.languageTitle ?? language?.title ?? String(languageId),
    languageOrder: language?.languageOrder ?? language?.order ?? fallbackOrder,
  };
}

function getLanguageMap(editorStates, languages) {
  const languageMap = new Map();
  [...(languages ?? [])].forEach((language, index) => {
    const normalized = normalizeLanguage(language, index, index);
    languageMap.set(String(normalized.languageId), normalized);
  });
  [...editorStates].forEach(([languageId, state], index) => {
    if (!languageMap.has(String(languageId))) {
      languageMap.set(String(languageId), normalizeLanguage(state, languageId, index));
    }
  });
  return languageMap;
}

function forEachField(object, callback) {
  for (const [table, records] of Object.entries(object ?? {})) {
    for (const [uid, fields] of Object.entries(records ?? {})) {
      for (const [field, value] of Object.entries(fields ?? {})) {
        callback(table, uid, field, value);
      }
    }
  }
}

function forEachCommand(command, callback) {
  for (const [table, records] of Object.entries(command ?? {})) {
    for (const [uid, actions] of Object.entries(records ?? {})) {
      for (const [action, value] of Object.entries(actions ?? {})) {
        callback(table, uid, action, value);
      }
    }
  }
}

/**
 * Builds the display model for all pending editor changes.
 *
 * @param {Map<number, Object>} editorStates
 * @param {Array<{id?: number, title?: string, order?: number, languageId?: number, languageTitle?: string, languageOrder?: number}>} languages
 * @return {{count: number, records: Object[]}}
 */
export function buildChangeOverview(editorStates, languages = []) {
  const languageMap = getLanguageMap(editorStates, languages);
  const stateEntries = [...editorStates].map(([languageId, state], index) => ({
    language: languageMap.get(String(languageId)) ?? normalizeLanguage(state, languageId, index),
    state,
  })).sort((left, right) => left.language.languageOrder - right.language.languageOrder);
  const records = new Map();
  let sequence = 0;

  const ensureRecord = (recordKey, table, uid, metadata = {}) => {
    if (!records.has(recordKey)) {
      records.set(recordKey, {
        key: recordKey,
        table,
        uid: getStableUid(recordKey, Number.isNaN(Number(uid)) ? uid : Number(uid)),
        label: metadata.recordLabel ?? metadata.recordType ?? `${table} ${uid}`,
        fields: new Map(),
        actions: [],
        fieldOrder: Number.POSITIVE_INFINITY,
        actionOrder: Number.POSITIVE_INFINITY,
        moveOrder: null,
        sequence: sequence++,
      });
    }
    const record = records.get(recordKey);
    if (metadata.recordLabel) {
      record.label = metadata.recordLabel;
    }
    return record;
  };

  const addField = (state, language, table, uid, fieldName, metadata = {}) => {
    const recordKey = getRecordKey(metadata, table, uid);
    const record = ensureRecord(recordKey, table, uid, metadata);
    const fieldKey = metadata.fieldPositionId ?? `${recordKey}:${fieldName}`;
    const fieldOrder = Number.isFinite(metadata.order) ? metadata.order : record.fields.size;
    if (!record.fields.has(fieldKey)) {
      record.fields.set(fieldKey, {
        key: fieldKey,
        label: metadata.fieldLabel ?? fieldName,
        kind: getFieldKind(metadata),
        order: fieldOrder,
        languages: new Map(),
        sequence: record.fields.size,
      });
    }
    const field = record.fields.get(fieldKey);
    const hasChange = hasNestedValue(state.data, table, uid, fieldName);
    const before = getNestedValue(state.initialData, table, uid, fieldName);
    const current = hasChange ? getNestedValue(state.data, table, uid, fieldName) : before;
    const invalidValue = getNestedValue(state.invalidFields, table, uid, fieldName);
    const validationErrors = Array.isArray(invalidValue) ? invalidValue : (metadata.validationErrors ?? []);
    field.languages.set(String(language.languageId), {
      ...language,
      uid: Number.isNaN(Number(uid)) ? uid : Number(uid),
      before,
      current,
      changed: hasChange && !Object.is(before, current),
      invalid: Boolean(invalidValue),
      validationErrors,
      fieldPositionId: metadata.fieldPositionId ?? fieldKey,
      scrollPositionId: metadata.scrollPositionId ?? recordKey,
    });
    field.order = Math.min(field.order, fieldOrder);
    record.fieldOrder = Math.min(record.fieldOrder, fieldOrder);
  };

  for (const {language, state} of stateEntries) {
    forEachField(state.fieldMetadata, (table, uid, fieldName, metadata) => {
      addField(state, language, table, uid, fieldName, metadata);
    });
    forEachField(state.data, (table, uid, fieldName) => {
      if (!hasNestedValue(state.fieldMetadata, table, uid, fieldName)) {
        addField(state, language, table, uid, fieldName);
      }
    });

    (state.cmdArray ?? []).forEach((command, commandIndex) => {
      const metadata = state.cmdMetadata?.[commandIndex] ?? {};
      forEachCommand(command, (table, uid, action, value) => {
        const recordKey = getRecordKey(metadata, table, uid);
        const record = ensureRecord(recordKey, table, uid, metadata);
        const actionOrder = Number.isFinite(metadata.order) ? metadata.order : record.actions.length;
        record.actions.push({
          action,
          ...language,
          from: metadata.sourceLabel ?? metadata.from ?? null,
          to: metadata.targetLabel ?? metadata.to ?? null,
          scrollPositionId: metadata.scrollPositionId ?? recordKey,
          order: actionOrder,
          value,
          metadata: {...metadata},
        });
        record.actionOrder = Math.min(record.actionOrder, actionOrder);
        if (action === 'move') {
          record.moveOrder = actionOrder;
        }
      });
    });
  }

  let count = 0;
  const normalizedRecords = [...records.values()].map((record) => {
    const deleteAction = record.actions.findLast(({action}) => action === 'delete');
    if (deleteAction) {
      count++;
      return {
        key: record.key,
        table: record.table,
        uid: record.uid,
        label: record.label,
        order: deleteAction.order,
        fields: [],
        actions: [deleteAction],
        sequence: record.sequence,
      };
    }

    const fields = [...record.fields.values()].map(field => ({
      key: field.key,
      label: field.label,
      kind: field.kind,
      order: field.order,
      languages: [...field.languages.values()].sort((left, right) => left.languageOrder - right.languageOrder),
      sequence: field.sequence,
    })).filter(field => field.languages.some(language => language.changed))
      .sort((left, right) => left.order - right.order || left.sequence - right.sequence)
      .map(({sequence: _sequence, ...field}) => field);
    count += fields.reduce((sum, field) => sum + field.languages.filter(language => language.changed).length, 0);
    count += record.actions.length;
    return {
      key: record.key,
      table: record.table,
      uid: record.uid,
      label: record.label,
      order: record.moveOrder ?? (Number.isFinite(record.fieldOrder) ? record.fieldOrder : record.actionOrder),
      fields,
      actions: record.actions,
      sequence: record.sequence,
    };
  }).filter(record => record.fields.length > 0 || record.actions.length > 0)
    .sort((left, right) => left.order - right.order || left.sequence - right.sequence)
    .map(({sequence: _sequence, ...record}) => record);

  return {count, records: normalizedRecords};
}
