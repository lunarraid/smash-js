var SmashMap = function() {
  this.keys = [];
  this.values = [];
};

SmashMap.prototype.constructor = SmashMap;

SmashMap.prototype.put = function(key, value) {
  var index = this.keys.indexOf(key);
  if (index === -1) {
    this.keys.push(key);
    this.values.push(value);
  }
  else {
    this.values[index] = value;
  }
};

SmashMap.prototype.get = function(key) {
  var index = this.keys.indexOf(key);
  return index !== -1 ? this.values[index] : null;
};

SmashMap.prototype.remove = function(key) {
  var index = this.keys.indexOf(key);
  if (index !== -1) {
    var lastKey = this.keys.pop();
    var lastValue = this.values.pop();
    if (index !== this.keys.length) {
      this.keys[index] = lastKey;
      this.values[index] = lastValue;
    }
  }
};

SmashMap.prototype.getKeyAt = function(index) {
  return this.keys[index];
};

SmashMap.prototype.getValueAt = function(index) {
  return this.values[index];
};

SmashMap.prototype.removeAll = function() {
  this.keys.length = 0;
  this.values.length = 0;
};


Object.defineProperty(SmashMap.prototype, "length", {
  get: function() { return this.keys.length; }
});

module.exports = SmashMap;
