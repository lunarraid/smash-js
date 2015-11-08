/**
 * Internal class used by Entity to service property lookups.
 */

var PropertyInfo = function() {
  this.object = null;
  this.field = null;
};

PropertyInfo.prototype.constructor = PropertyInfo;

PropertyInfo.prototype.getValue = function() {
  if (this.field) {
    return this.object[this.field];
  } else {
    return this.object;
  }
};

PropertyInfo.prototype.setValue = function(value) {
  this.object[this.field] = value;
};

PropertyInfo.prototype.clear = function() {
  this.object = null;
  this.field = null;
};

module.exports = PropertyInfo;