var BaseObject = require("./BaseObject.js");

/**
 * GameSet provides safe references to one or more GameObjects. When the
 * referenced GameObjects are destroy()ed, then they are automatically removed
 * from any GameSets.
 */

var GameSet = function() {
  BaseObject.call(this);
  this.items = [];
};

GameSet.prototype = Object.create(BaseObject.prototype);

GameSet.prototype.constructor = GameSet;

/**
 * Add a GameObject to the set.
 */

GameSet.prototype.add = function(object) {
  this.items.push(object);
  object.noteSetAdd(this);
};

/**
 * Remove a GameObject from the set.
 */

GameSet.prototype.remove = function(object) {
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

GameSet.prototype.contains = function(object) {
  return this.items.indexOf(object) !== -1;
};

/**
 * Return the object at the specified index of the set.
 */

GameSet.prototype.getGameObjectAt = function(index) {
  return this.items[index];
};


/**
 * How many objects are in the set?
 */

Object.defineProperty(GameSet.prototype, "length", {

  get: function() {
    return this.items.length;
  }

});

module.exports = GameSet;