SmashJS.util.Map = function() {
  this.keys = [];
  this.values = [];
};

SmashJS.util.Map.prototype.constructor = SmashJS.util.Map;

SmashJS.util.Map.prototype.put = function(key, value) {
  var index = this.keys.indexOf(key);
  if (index === -1) {
    this.keys.push(key);
    this.values.push(value);
  }
  else {
    this.values[index] = value;
  }
};

SmashJS.util.Map.prototype.get = function(key) {
  var index = this.keys.indexOf(key);
  return index !== -1 ? this.values[index] : null;
};

SmashJS.util.Map.prototype.remove = function(key) {
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

SmashJS.util.Map.prototype.getKeyAt = function(index) {
  return this.keys[index];
};

SmashJS.util.Map.prototype.getValueAt = function(index) {
  return this.values[index];
};

SmashJS.util.Map.prototype.removeAll = function() {
  this.keys.length = 0;
  this.values.length = 0;
};


Object.defineProperty(SmashJS.util.Map.prototype, "length", {
  get: function() { return this.keys.length; }
});
