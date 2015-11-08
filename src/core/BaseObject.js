/**
* Base class for things that have names, lifecycles, and exist in a GameSet or
* GameGroup.
*
* To use a GameObject:
*
* 1. Instantiate one. (var foo = new GameGroup();)
* 2. Set the owning group. (foo.owningGroup = rootGroup;)
* 3. Call initialize(). (foo.initialize();)
* 4. Use the object!
* 5. When you're done, call destroy(). (foo.destroy();)
*/

var BaseObject = function(name) {
  this._active = false;
  this._owningGroup = null;
  this._sets = [];
  this._name = name || "";
};

BaseObject.prototype.isBaseObject = true;

// Internal
BaseObject.prototype.noteSetAdd = function(set) {
  this._sets.push(set);
};

// Internal
BaseObject.prototype.noteSetRemove = function(set) {
  var idx = this._sets.indexOf(set);
    if(idx == -1) {
      throw new Error("Tried to remove BaseObject from a GameSet it didn't know it was in!");
    }
    this._sets.splice(idx, 1);
};

/**
 * Called to initialize the GameObject. The GameObject must be in a GameGroup
 * before calling this (ie, set owningGroup).
 */

BaseObject.prototype.initialize = function() {
  // Error if not in a group.
  if (this._owningGroup === null) {
    throw new Error("Can't initialize a BaseObject without an owning GameGroup!");
  }
  this._active = true;
};

/**
 * Called to destroy the GameObject: remove it from sets and groups, and do
 * other end of life cleanup.
 */

BaseObject.prototype.destroy = function() {
  // Remove from sets.
  while (this._sets.length > 0) {
    this._sets[this._sets.length-1].remove(this);
  }

  // Remove from owning group.
  if (this._owningGroup) {
    this._owningGroup.noteRemove(this);
    this._owningGroup = null;
  }

  this._active = false;
};

BaseObject.prototype.constructor = BaseObject;

/**
 * Name of the GameObject. Used for dynamic lookups and debugging.
 */

Object.defineProperty(BaseObject.prototype, "name", {

  get: function() {
    return this._name;
  },

  set: function(value) {
    if (this._active && this._owningGroup) {
      throw new Error("Cannot change BaseObject name after initialize() is called and while in a GameGroup.");
    }
    this._name = value;
  }

});

/**
 * What GameSets reference this GameObject?
 */

Object.defineProperty(BaseObject.prototype, "sets", {

  get: function() {
    return this._sets;
  }

});

/**
 * The GameGroup that contains us. All GameObjects must be in a GameGroup,
 * and the owningGroup has to be set before calling initialize().
 */

Object.defineProperty(BaseObject.prototype, "owningGroup", {

  get: function() {
    return this._owningGroup;
  },

  set: function(value) {
    if (!value) {
      throw new Error("A BaseObject must always be in a GameGroup.");
    }

    if (this._owningGroup) {
      this._owningGroup.noteRemove(this);
    }

    this._owningGroup = value;
    this._owningGroup.noteAdd(this);
  }

});

module.exports = BaseObject;