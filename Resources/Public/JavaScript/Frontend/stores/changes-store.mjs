/**
 * @method addEventListener(type: 'changes', listener: (event: CustomEvent<{changes: Object}>) => void): void
 */
class ChangesStore extends EventTarget {

    #initial = {};
    #changes = {};

    /**
     * @param table {string}
     * @param uid {number}
     * @param field {string}
     * @param value {string}
     * @param langSyncUid {number|null}
     * @return {void}
     */
    setInitial(table, uid, field, value, langSyncUid) {
        this.#initial[table] = this.#initial[table] || {};
        this.#initial[table][uid] = this.#initial[table][uid] || {};
        this.#initial[table][uid][field] = value;
        this.#initial[table][uid]['__languageSyncUid'] = langSyncUid;
    }

  /**
   *
   * @param table {string}
   * @param uid {number}
   * @param field {string}
   * @returns {boolean}
   */
    hasChanges(table, uid, field) {
        return !!(this.#changes[table] && this.#changes[table][uid] && this.#changes[table][uid][field]);
    }

    get initial() {
        return structuredClone(this.#initial);
    }

    get changes() {
        return structuredClone(this.#changes);
    }

    /**
     *
     * @param table {string}
     * @param uid {number}
     * @param field {string}
     * @param value {string}
     * @param langSyncUid {number|null}
     * @return {void}
     */
    set(table, uid, field, value, langSyncUid) {
        const oldChanges = structuredClone(this.#changes);
        this.#changes[table] = this.#changes[table] || {};
        this.#changes[table][uid] = this.#changes[table][uid] || {};
        this.#changes[table][uid][field] = value;
        if (this.#changes[table][uid][field] === this.#initial[table][uid][field]) {
            delete this.#changes[table][uid][field];
        }
        this.#changes[table][uid]['__languageSyncUid'] = langSyncUid;
        if (this.#changes[table][uid]['__languageSyncUid'] === this.#initial[table][uid]['__languageSyncUid']) {
            delete this.#changes[table][uid]['__languageSyncUid'];
        }
        if (Object.keys(this.#changes[table][uid]).length === 0) {
            delete this.#changes[table][uid];
        }
        if (Object.keys(this.#changes[table]).length === 0) {
            delete this.#changes[table];
        }

        if(JSON.stringify(oldChanges) === JSON.stringify(this.#changes)) {
            return;
        }
        this.dispatchEvent(new CustomEvent('changes', {detail: {changes: structuredClone(this.#changes)}}));
    }

    /**
     * @return {void}
     */
    reset() {
        this.#changes = {};
        this.dispatchEvent(new CustomEvent('changes', {detail: {changes: {}}}));
    }

  markSaved() {
    for (const table in this.#changes) {
      for (const uid in this.#changes[table]) {
        for (const fieldName in this.#changes[table][uid]) {
          const value = this.#changes[table][uid][fieldName];
          this.#initial[table] = this.#initial[table] || {};
          this.#initial[table][uid] = this.#initial[table][uid] || {};
          this.#initial[table][uid][fieldName] = value;
        }
      }
    }
    this.#changes = {};
    this.dispatchEvent(new CustomEvent('changes', {detail: {changes: {}}}));
  }
}

export const changesStore = new ChangesStore;
