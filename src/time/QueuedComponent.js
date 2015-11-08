var GameComponent = require("../core/GameComponent.js");
var TimeManager = require("./TimeManager.js");

/**
 * Base class for components which want to use think notifications.
 *
 * <p>"Think notifications" allow a component to specify a time and
 * callback function which should be called back at that time. In this
 * way you can easily build complex behavior (by changing which callback
 * you pass) which is also efficient (because it is only called when
 * needed, not every tick/frame). It is also light on the GC because
 * no allocations are required beyond the initial allocation of the
 * QueuedComponent.</p>
 */

var QueuedComponent = function() {
  GameComponent.call(this);
};

QueuedComponent.prototype = Object.create(GameComponent.prototype);

QueuedComponent.prototype.constructor = QueuedComponent;

/**
 * Schedule the next time this component should think.
 * @param nextCallback Function to be executed.
 * @param timeTillThink Time in ms from now at which to execute the function (approximately).
 */

QueuedComponent.prototype.think = function(nextContext, nextCallback, timeTillThink) {
  this.nextThinkContext = nextContext;
  this.nextThinkTime = this.timeManager.virtualTime + timeTillThink;
  this.nextThinkCallback = nextCallback;
  this.timeManager.queueObject(this);
};

QueuedComponent.prototype.unthink = function() {
  this.timeManager.dequeueObject(this);
};

QueuedComponent.prototype.onAdd = function() {
  GameComponent.prototype.onAdd.call(this);
  this.timeManager = this.owner.getManager(TimeManager);
  this.nextThinkContext = null;
  this.nextThinkCallback = null;
};

QueuedComponent.prototype.onRemove = function() {
  GameComponent.prototype.onRemove.call(this);
  // Do not allow us to be called back if we are still in the queue.
  this.nextThinkContext = null;
  this.nextThinkCallback = null;
};

Object.defineProperty(QueuedComponent.prototype, "priority", {

  get: function() {
    return -this.nextThinkTime;
  }

});

module.exports = QueuedComponent;