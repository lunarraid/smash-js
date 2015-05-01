/**
 * Internal class used by Entity to service property lookups.
 */

SmashJS.Property.PropertyInfo = function() {
  this.object = null;
  this.field = null;
};

SmashJS.Property.PropertyInfo.prototype.constructor = SmashJS.Property.PropertyInfo;

SmashJS.Property.PropertyInfo.prototype.getValue = function() {
  if (this.field) {
    return this.object[this.field];
  } else {
    return this.object;
  }
};

SmashJS.Property.PropertyInfo.prototype.setValue = function(value) {
  this.object[this.field] = value;
};

SmashJS.Property.PropertyInfo.prototype.clear = function() {
  this.object = null;
  this.field = null;
};