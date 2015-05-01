/**
 * Base class for components that need to perform actions every frame. This
 * needs to be subclassed to be useful.
 */

SmashJS.AnimatedComponent = function() {
  SmashJS.GameComponent.call(this);

  // The update priority for this component. Higher numbered priorities have
  // OnFrame called before lower priorities.
  this.updatePriority = 0;

  this._registerForUpdates = true;
  this._isRegisteredForUpdates = false;
};

SmashJS.AnimatedComponent.prototype = Object.create(SmashJS.GameComponent.prototype);

SmashJS.AnimatedComponent.prototype.constructor = SmashJS.AnimatedComponent;

SmashJS.AnimatedComponent.prototype.onFrame = function() {
  this.applyBindings();
};

SmashJS.AnimatedComponent.prototype.onAdd = function() {
  SmashJS.GameComponent.prototype.onAdd.call(this);
  this.timeManager = this.owner.getManager(SmashJS.TimeManager);
  // This causes the component to be registerd if it isn't already.
  this.registerForUpdates = this.registerForUpdates;
};

SmashJS.AnimatedComponent.prototype.onRemove = function() {
  // Make sure we are unregistered.
  this.registerForUpdates = false;
  SmashJS.GameComponent.prototype.onRemove.call(this);
};

/**
 * Set to register/unregister for frame updates.
 */

Object.defineProperty(SmashJS.AnimatedComponent.prototype, "registerForUpdates", {

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
      this.timeManager.addAnimatedObject(this, this.updatePriority);
    }
    else if(!this._registerForUpdates && this._isRegisteredForUpdates)
    {
      // Need to unregister.
      this._isRegisteredForUpdates = false;
      this.timeManager.removeAnimatedObject(this);
    }
  }

});
