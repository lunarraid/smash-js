var GameComponent = require("../core/GameComponent.js");
var TimeManager = require("./TimeManager.js");

/**
 * Base class for components that need to perform actions every frame. This
 * needs to be subclassed to be useful.
 */

var AnimatedComponent = function() {
  GameComponent.call(this);

  // The update priority for this component. Higher numbered priorities have
  // OnFrame called before lower priorities.
  this.updatePriority = 0;

  this._registerForUpdates = true;
  this._isRegisteredForUpdates = false;
};

AnimatedComponent.prototype = Object.create(GameComponent.prototype);

AnimatedComponent.prototype.constructor = AnimatedComponent;

AnimatedComponent.prototype.onFrame = function() {
  this.applyBindings();
};

AnimatedComponent.prototype.onAdd = function() {
  GameComponent.prototype.onAdd.call(this);
  this.timeManager = this.owner.getManager(TimeManager);
  // This causes the component to be registered if it isn't already.
  this.registerForUpdates = this.registerForUpdates;
};

AnimatedComponent.prototype.onRemove = function() {
  // Make sure we are unregistered.
  this.registerForUpdates = false;
  GameComponent.prototype.onRemove.call(this);
};

/**
 * Set to register/unregister for frame updates.
 */

Object.defineProperty(AnimatedComponent.prototype, "registerForUpdates", {

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

module.exports = AnimatedComponent;
