var GameComponent = require("../core/GameComponent.js");
var TimeManager = require("./TimeManager.js");

/**
 * Base class for components that need to perform actions every tick. This
 * needs to be subclassed to be useful.
 */

var TickedComponent = function() {
  GameComponent.call(this);

  // The update priority for this component. Higher numbered priorities have
  // onInterpolateTick and onTick called before lower priorities.
  this.updatePriority = 0;

  this._registerForUpdates = true;
  this._isRegisteredForUpdates = false;
};

TickedComponent.prototype = Object.create(GameComponent.prototype);

TickedComponent.prototype.constructor = TickedComponent;

TickedComponent.prototype.onTick = function(tickRate) {
  this.applyBindings();
};

TickedComponent.prototype.onAdd = function() {
  GameComponent.prototype.onAdd.call(this);
  this.timeManager = this.owner.getManager(TimeManager);
  // This causes the component to be registerd if it isn't already.
  this.registerForTicks = this.registerForTicks;
};

TickedComponent.prototype.onRemove = function() {
  // Make sure we are unregistered.
  this.registerTicks = false;
  GameComponent.prototype.onRemove.call(this);
};

/**
 * Set to register/unregister for tick updates.
 */

Object.defineProperty(TickedComponent.prototype, "registerForTicks", {

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

module.exports = TickedComponent;