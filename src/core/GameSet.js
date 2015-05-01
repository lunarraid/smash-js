/**
 * GameSet provides safe references to one or more GameObjects. When the
 * referenced GameObjects are destroy()ed, then they are automatically removed
 * from any GameSets.
 */

SmashJS.GameSet = function() {
  SmashJS.BaseObject.call(this);
  this.items = [];
};

SmashJS.GameSet.prototype = Object.create(SmashJS.BaseObject.prototype);

SmashJS.GameSet.prototype.constructor = SmashJS.GameSet;

/**
 * Add a GameObject to the set.
 */

SmashJS.GameSet.prototype.add = function(object) {
  this.items.push(object);
  object.noteSetAdd(this);
};

/**
 * Remove a GameObject from the set.
 */

SmashJS.GameSet.prototype.remove = function(object) {
  var idx = this.items.indexOf(object);
  if (idx === -1) {
    throw "Requested GameObject is not in this GameSet.";
  }
  this.items.splice(idx, 1);
  object.noteSetRemove(this);
};

/**
 * Does this GameSet contain the specified object?
 */

SmashJS.GameSet.prototype.contains = function(object) {
  return this.items.indexOf(object) !== -1;
};

/**
 * Return the object at the specified index of the set.
 */

SmashJS.GameSet.prototype.getGameObjectAt = function(index) {
  return this.items[index];
};


/**
 * How many objects are in the set?
 */

Object.defineProperty(SmashJS.GameSet.prototype, "length", {

  get: function() {
    return this.items.length;
  }

});