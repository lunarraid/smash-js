
/**
 * Base class for components that need to perform actions every tick. This
 * needs to be subclassed to be useful.
 */

SmashJS.TickedComponent = function() {
  SmashJS.GameComponent.call(this);

  // The update priority for this component. Higher numbered priorities have
  // onInterpolateTick and onTick called before lower priorities.
  this.updatePriority = 0;

  this._registerForUpdates = true;
  this._isRegisteredForUpdates = false;
};

SmashJS.TickedComponent.prototype = Object.create(SmashJS.GameComponent.prototype);

SmashJS.TickedComponent.prototype.constructor = SmashJS.TickedComponent;

SmashJS.TickedComponent.prototype.onTick = function(tickRate) {
  this.applyBindings();
};

SmashJS.TickedComponent.prototype.onAdd = function() {
  SmashJS.GameComponent.prototype.onAdd.call(this);
  this.timeManager = this.owner.getManager(SmashJS.TimeManager);
  // This causes the component to be registerd if it isn't already.
  this.registerForTicks = this.registerForTicks;
};

SmashJS.TickedComponent.prototype.onRemove = function() {
  // Make sure we are unregistered.
  this.registerTicks = false;
  SmashJS.GameComponent.prototype.onRemove.call(this);
};

/**
 * Set to register/unregister for tick updates.
 */

Object.defineProperty(SmashJS.TickedComponent.prototype, "registerForTicks", {

  get: function() {
    return this._registerForUpdates;
  },

  set: function(value) {
    this._registerForUpdates = value;

    if (!this.timeManager) {
      return;
    }

    if (this._registerForUpdates && !this._isRegisteredForUpdates)
    {
      // Need to register.
      this._isRegisteredForUpdates = true;
      this.timeManager.addTickedObject(this, this.updatePriority);
    }
    else if(!this._registerForUpdates && this._isRegisteredForUpdates)
    {
      // Need to unregister.
      this._isRegisteredForUpdates = false;
      this.timeManager.removeTickedObject(this);
    }
  }

});