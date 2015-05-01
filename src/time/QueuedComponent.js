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

SmashJS.QueuedComponent = function() {
  SmashJS.GameComponent.call(this);
};

SmashJS.QueuedComponent.prototype = Object.create(SmashJS.GameComponent.prototype);

SmashJS.QueuedComponent.prototype.constructor = SmashJS.QueuedComponent;

/**
 * Schedule the next time this component should think.
 * @param nextCallback Function to be executed.
 * @param timeTillThink Time in ms from now at which to execute the function (approximately).
 */

SmashJS.QueuedComponent.prototype.think = function(nextContext, nextCallback, timeTillThink) {
  this.nextThinkContext = nextContext;
  this.nextThinkTime = this.timeManager.virtualTime + timeTillThink;
  this.nextThinkCallback = nextCallback;
  this.timeManager.queueObject(this);
};

SmashJS.QueuedComponent.prototype.unthink = function() {
  this.timeManager.dequeueObject(this);
};

SmashJS.QueuedComponent.prototype.onAdd = function() {
  SmashJS.GameComponent.prototype.onAdd.call(this);
  this.timeManager = this.owner.getManager(SmashJS.TimeManager);
  this.nextThinkContext = null;
  this.nextThinkCallback = null;
};

SmashJS.QueuedComponent.prototype.onRemove = function() {
  SmashJS.GameComponent.prototype.onRemove.call(this);
  // Do not allow us to be called back if we are still
  // in the queue.
  this.nextThinkContext = null;
  this.nextThinkCallback = null;
};

Object.defineProperty(SmashJS.QueuedComponent.prototype, "priority", {

  get: function() {
    return -this.nextThinkTime;
  }

});