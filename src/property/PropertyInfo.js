/**
 * Internal class used by Entity to service property lookups.
 */

 export default class PropertyInfo {

  constructor() {
    this.object = null;
    this.field = null;
  }

  getValue() {
    return this.field ? this.object[this.field] : this.object;
  }

  setValue(value) {
    this.object[this.field] = value;
  }

  clear() {
    this.object = null;
    this.field = null;
  }

}