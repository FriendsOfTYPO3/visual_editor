import {getObjectLeafCount} from '../../Shared/get-object-leaf-count.js';

/**
 * @method addEventListener(type: 'change', listener: (event: CustomEvent<{scope: 'field'|'table'|'global', kind: 'data'|'initial'|'metadata'|'invalid'|'cmd'|'saved', table?: string, uid?: number, field?: string}>) => void): void
 */
class DataHandlerStore extends EventTarget {
  #data = {};
  #initialData = {};
  #cmdArray = [];
  #cmdMetadata = [];
  #fieldMetadata = {};
  #invalidFields = {};

  get data() {
    return structuredClone(this.#data);
  }

  get initialData() {
    return structuredClone(this.#initialData);
  }

  get cmdArray() {
    return structuredClone(this.#cmdArray);
  }

  get cmdMetadata() {
    return structuredClone(this.#cmdMetadata);
  }

  get fieldMetadata() {
    return structuredClone(this.#fieldMetadata);
  }

  get invalidFields() {
    return structuredClone(this.#invalidFields);
  }

  get changesCount() {
    return getObjectLeafCount(this.#data) + this.getCmdChanges();
  }

  get invalidCount() {
    let count = 0;
    for (const tables of Object.values(this.#invalidFields)) {
      for (const fields of Object.values(tables)) {
        count += Object.keys(fields).length;
      }
    }
    return count;
  }

  /**
   * @param {string} table
   * @param {number} uid
   * @param {string} field
   * @param {any} value
   * @param {Object} [metadata]
   * @return {void}
   */
  setInitialData(table, uid, field, value, metadata = undefined) {
    if (metadata !== undefined) {
      this.#fieldMetadata[table] = this.#fieldMetadata[table] || {};
      this.#fieldMetadata[table][uid] = this.#fieldMetadata[table][uid] || {};
      this.#fieldMetadata[table][uid][field] = structuredClone(metadata);
    }

    if (this.#initialData[table]?.[uid]?.[field] === value) {
      return;
    }

    this.#initialData[table] = this.#initialData[table] || {};
    this.#initialData[table][uid] = this.#initialData[table][uid] || {};
    this.#initialData[table][uid][field] = value;

    if (this.#data[table]?.[uid]?.[field] === value) {
      this.#deleteDataField(table, uid, field);
    }

    this.#dispatchChange({scope: 'field', kind: 'initial', table, uid, field});
  }

  /**
   * @param {string} table
   * @param {number} uid
   * @param {string} field
   * @param {Object} metadata
   * @param {boolean} dispatchChange
   * @return {void}
   */
  setFieldMetadata(table, uid, field, metadata, dispatchChange = true) {
    const currentMetadata = this.#fieldMetadata[table]?.[uid]?.[field] || {};
    const nextMetadata = {...currentMetadata, ...structuredClone(metadata)};
    if (JSON.stringify(currentMetadata) === JSON.stringify(nextMetadata)) {
      return;
    }

    this.#fieldMetadata[table] = this.#fieldMetadata[table] || {};
    this.#fieldMetadata[table][uid] = this.#fieldMetadata[table][uid] || {};
    this.#fieldMetadata[table][uid][field] = nextMetadata;
    if (dispatchChange) {
      this.#dispatchChange({scope: 'field', kind: 'metadata', table, uid, field});
    }
  }

  /**
   * @param {string} recordKey
   * @param {number} order
   * @param {boolean} dispatchChange
   * @return {void}
   */
  updateFieldMetadataOrder(recordKey, order, dispatchChange = true) {
    if (!Number.isFinite(order)) {
      return;
    }

    let hasChanged = false;
    for (const records of Object.values(this.#fieldMetadata)) {
      for (const fields of Object.values(records)) {
        for (const metadata of Object.values(fields)) {
          if (metadata.recordKey === recordKey && metadata.order !== order) {
            metadata.order = order;
            hasChanged = true;
          }
        }
      }
    }
    if (hasChanged && dispatchChange) {
      this.#dispatchChange({scope: 'global', kind: 'metadata'});
    }
  }

  /**
   * @param {string} table
   * @param {number} uid
   * @param {string} field
   * @param {any} value
   * @return {void}
   */
  setData(table, uid, field, value) {
    if (this.#data[table]?.[uid]?.[field] === value) {
      return;
    }

    if (this.#data[table]?.[uid]?.[field] === undefined && this.#initialData[table]?.[uid]?.[field] === value) {
      return;
    }

    this.#data[table] = this.#data[table] || {};
    this.#data[table][uid] = this.#data[table][uid] || {};
    this.#data[table][uid][field] = value;

    if (this.#initialData[table]?.[uid]?.[field] === value) {
      this.#deleteDataField(table, uid, field);
    }

    this.#dispatchChange({scope: 'field', kind: 'data', table, uid, field});
  }

  /**
   * @param {string} table
   * @param {number} uid
   * @param {'move'|'copy'|'delete'} action
   * @param {any} value
   * @param {Object} [metadata]
   * @return {void}
   */
  addCmd(table, uid, action, value, metadata = {}) {
    this.#cmdArray.push({
      [table]: {
        [uid]: {
          [action]: value,
        },
      },
    });
    this.#cmdMetadata.push({...structuredClone(metadata), action});
    this.#dispatchChange({scope: 'table', kind: 'cmd', table, uid});
  }

  markSaved() {
    // deep merge data into initialData:
    for (const table in this.#data) {
      for (const uid in this.#data[table]) {
        for (const fieldName in this.#data[table][uid]) {
          this.#initialData[table][uid][fieldName] = this.#data[table][uid][fieldName];
        }
      }
    }
    this.reset();
  }

  reset() {
    this.#data = {};
    this.#cmdArray = [];
    this.#cmdMetadata = [];
    this.#invalidFields = {};
    this.#dispatchChange({scope: 'global', kind: 'saved'});
  }

  /**
   * @param {string} table
   * @param {number} uid
   * @param {string} field
   * @return {boolean}
   */
  hasChangedData(table, uid, field) {
    return !!(this.#data[table] !== undefined && this.#data[table][uid] !== undefined && this.#data[table][uid][field] !== undefined);
  }

  /**
   * @param {string} table
   * @param {number} uid
   * @param {string} field
   * @param {boolean} hasErrors
   * @return {void}
   */
  setInvalid(table, uid, field, hasErrors) {
    hasErrors = hasErrors ? true : undefined;
    const currentValue = this.#invalidFields[table]?.[uid]?.[field];

    if (currentValue === hasErrors) {
      return;
    }

    if (!hasErrors) {
      if (currentValue === undefined) {
        return;
      }

      delete this.#invalidFields[table][uid][field];
      if (Object.keys(this.#invalidFields[table][uid]).length === 0) {
        delete this.#invalidFields[table][uid];
      }
      if (Object.keys(this.#invalidFields[table]).length === 0) {
        delete this.#invalidFields[table];
      }
    } else {
      this.#invalidFields[table] = this.#invalidFields[table] || {};
      this.#invalidFields[table][uid] = this.#invalidFields[table][uid] || {};
      this.#invalidFields[table][uid][field] = hasErrors;
    }

    this.#dispatchChange({scope: 'field', kind: 'invalid', table, uid, field});
  }

  getCmdChanges() {
    return this.#cmdArray.length;
  }

  /**
   * @param {string} table
   * @return {boolean}
   */
  hasChangesIn(table) {
    if (this.#data[table] !== undefined) {
      return true;
    }
    return this.#cmdArray.findIndex(cmd => cmd[table] !== undefined) !== -1;
  }

  #dispatchChange(detail) {
    this.dispatchEvent(new CustomEvent('change', {detail}));
  }

  #deleteDataField(table, uid, field) {
    if (this.#data[table]?.[uid]?.[field] === undefined) {
      return;
    }

    delete this.#data[table][uid][field];
    if (Object.keys(this.#data[table][uid]).length === 0) {
      delete this.#data[table][uid];
    }
    if (Object.keys(this.#data[table]).length === 0) {
      delete this.#data[table];
    }
  }
}

export const dataHandlerStore = new DataHandlerStore();
