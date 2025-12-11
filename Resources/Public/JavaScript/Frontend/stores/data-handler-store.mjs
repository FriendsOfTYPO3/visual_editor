import {getObjectLeafCount} from "@andersundsehr/editara/Shared/get-object-leaf-count.mjs";

/**
 * @method addEventListener(type: 'change', listener: (event: CustomEvent<{data: Object, cmd Object}>) => void): void
 */
class DataHandlerStore extends EventTarget {

  #data = {};
  #initialData = {};
  #cmd = {};
  #oldDetail = {};

  get data() {
    return structuredClone(this.#data);
  }

  get initialData() {
    return structuredClone(this.#initialData);
  }

  get cmd() {
    return structuredClone(this.#cmd);
  }


  get changesCount() {
    return getObjectLeafCount(this.data) + this.getCmdChanges();
  }

  /**
   * @param {string} table
   * @param {number} uid
   * @param {string} field
   * @param {string} value
   * @return {void}
   */
  setInitialData(table, uid, field, value) {
    this.#initialData[table] = this.#initialData[table] || {};
    this.#initialData[table][uid] = this.#initialData[table][uid] || {};
    this.#initialData[table][uid][field] = value;
    this.updateAndNotify();
  }

  /**
   * @param {string} table
   * @param {number} uid
   * @param {string} field
   * @param {string} value
   * @return {void}
   */
  setData(table, uid, field, value) {
    this.#data[table] = this.#data[table] || {};
    this.#data[table][uid] = this.#data[table][uid] || {};
    this.#data[table][uid][field] = value;
    this.updateAndNotify();
  }

  /**
   * @param {string} table
   * @param {number} uid
   * @param {'move'|'copy'|'delete'} action
   * @param {any} value
   * @return {void}
   */
  setCmd(table, uid, action, value) {
    this.#cmd[table] = this.#cmd[table] || {};
    this.#cmd[table][uid] = this.#cmd[table][uid] || {};
    this.#cmd[table][uid][action] = value;
    this.updateAndNotify();
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

    this.#data = {};
    this.#cmd = {};
    this.updateAndNotify();
    this.dispatchEvent(new CustomEvent('change', {detail: {data: this.data, cmd: this.cmd}}));
  }

  updateAndNotify() {
    // remove everything from #data that is equal to initialData
    this.#removeStaleData();

    const detail = {data: this.data, cmd: this.cmd};

    const oldDetail = this.#oldDetail;
    this.#oldDetail = detail;
    if (JSON.stringify(oldDetail) === JSON.stringify(this.#oldDetail)) {
      return;
    }
    this.dispatchEvent(new CustomEvent('change', {detail}));
  }

  #removeStaleData() {
    for (const table in this.#data) {
      for (const uid in this.#data[table]) {
        for (const fieldName in this.#data[table][uid]) {
          if (this.#initialData[table] &&
            this.#initialData[table][uid] &&
            this.#initialData[table][uid][fieldName] === this.#data[table][uid][fieldName]) {
            delete this.#data[table][uid][fieldName];
          }
        }
        if (Object.keys(this.#data[table][uid]).length === 0) {
          delete this.#data[table][uid];
        }
      }
      if (Object.keys(this.#data[table]).length === 0) {
        delete this.#data[table];
      }
    }
  }

  /**
   * @param {string} table
   * @param {number} uid
   * @param {string} field
   * @return {boolean}
   */
  hasChangedData(table, uid, field) {
    return !!(this.#data[table] && this.#data[table][uid] && this.#data[table][uid][field]);
  }

  getCmdChanges() {
    // count all actions in cmd
    let count = 0;
    for (const table in this.#cmd) {
      for (const uid in this.#cmd[table]) {
        for (const action in this.#cmd[table][uid]) {
          count++;
        }
      }
    }
    return count;
  }
}

export const dataHandlerStore = new DataHandlerStore;
