/**
 * Base class for most game functionality. Contained in a GameObject.
 *
 * Provides a generic data binding system as well as callbacks when
 * the component is added to or removed from a GameObject.
 */

SmashJS.GameComponent = function() {
  this.bindings = [];
  this._safetyFlag = false;
  this._name = "";
  this._owner = null;
};

SmashJS.GameComponent.prototype.isGameComponent = true;

/**
 * Components include a powerful data binding system. You can set up
 * rules indicating fields to load from other parts of the game, then
 * apply the data bindings using the applyBindings() method. If you don't
 * use them, bindings have no overhead.
 *
 * @param fieldName Name of a field on this object to copy data to.
 * @param propertyReference A reference to a value on another component,
 *                          GameObject, or other part of the system.
 *                          Usually "@componentName.fieldName".
 */

SmashJS.GameComponent.prototype.addBinding = function(fieldName, propertyReference) {
  this.bindings.push(fieldName + "||" + propertyReference);
};

/**
 * Remove a binding previously added with addBinding. Call with identical
 * parameters.
 */

SmashJS.GameComponent.prototype.removeBinding = function(fieldName, propertyReference) {
  var binding = fieldName + "||" + propertyReference;
  var idx = this.bindings.indexOf(binding);
  if (idx === -1) {
    return;
  }
  this.bindings.splice(idx, 1);
};

/**
 * Loop through bindings added with addBinding and apply them. Typically
 * called at start of onTick or onFrame handler.
 */

SmashJS.GameComponent.prototype.applyBindings = function() {
  if (!this.propertyManager) {
    throw new Error("Couldn't find a PropertyManager instance");
  }

  for (var i = 0; i < this.bindings.length; i++) {
    this.propertyManager.applyBinding(this, this.bindings[i]);
  }
};

SmashJS.GameComponent.prototype.doAdd = function() {
  this.propertyManager = this.owner.getManager(SmashJS.PropertyManager);
  this._safetyFlag = false;
  this.onAdd();
  if (this._safetyFlag === false) {
    throw new Error("You forget to call onAdd() on supr in an onAdd override.");
  }
};

SmashJS.GameComponent.prototype.doRemove = function() {
  this._safetyFlag = false;
  this.onRemove();
  if (this._safetyFlag === false) {
    throw new Error("You forget to call onRemove() on supr in an onRemove handler.");
  }
};

/**
 * Called when component is added to a GameObject. Do component setup
 * logic here.
 */

SmashJS.GameComponent.prototype.onAdd = function() {
  this._safetyFlag = true;
};

/**
 * Called when component is removed frmo a GameObject. Do component
 * teardown logic here.
 */

SmashJS.GameComponent.prototype.onRemove = function() {
  this._safetyFlag = true;
};

SmashJS.GameComponent.prototype.constructor = SmashJS.GameComponent;

Object.defineProperty(SmashJS.GameComponent.prototype, "name", {

  get: function() {
    return this._name;
  },

  set: function(value) {
    if (this._owner) {
      throw new Error("Already added to GameObject, can't change name of GameComponent.");
    }
    this._name = value;
  }

});

/**
 * What GameObject contains us, if any?
 */

Object.defineProperty(SmashJS.GameComponent.prototype, "owner", {

  get: function() {
    return this._owner;
  }

});