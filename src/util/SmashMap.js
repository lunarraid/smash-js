export default class SmashMap {

  constructor() {
    this.keys = [];
    this.values = [];
  }

  put(key, value) {
    var index = this.keys.indexOf(key);
    if (index === -1) {
      this.keys.push(key);
      this.values.push(value);
    } else {
      this.values[index] = value;
    }
  }

  get(key) {
    var index = this.keys.indexOf(key);
    return index !== -1 ? this.values[index] : null;
  }

  remove(key) {
    var index = this.keys.indexOf(key);
    if (index !== -1) {
      var lastKey = this.keys.pop();
      var lastValue = this.values.pop();
      if (index !== this.keys.length) {
        this.keys[index] = lastKey;
        this.values[index] = lastValue;
      }
    }
  }

  getKeyAt(index) {
    return this.keys[index];
  }

  getValueAt(index) {
    return this.values[index];
  }

  removeAll() {
    this.keys.length = 0;
    this.values.length = 0;
  }

  get length() {
    return this.keys.length;
  }

}
