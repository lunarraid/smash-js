/**
 * The number of ticks that will happen every second.
 */

var TICKS_PER_SECOND = 60;

/**
 * The rate at which ticks are fired, in seconds.
 */

var TICK_RATE = 1 / TICKS_PER_SECOND;

/**
 * The rate at which ticks are fired, in milliseconds.
 */

var TICK_RATE_MS = TICK_RATE * 1000;

/**
 * The maximum number of ticks that can be processed in a frame.
 *
 * <p>In some cases, a single frame can take an extremely long amount of
 * time. If several ticks then need to be processed, a game can
 * quickly get in a state where it has so many ticks to process
 * it can never catch up. This is known as a death spiral.</p>
 *
 * <p>To prevent this we have a safety limit. Time is dropped so the
 * system can catch up in extraordinary cases. If your game is just
 * slow, then you will see that the ProcessManager can never catch up
 * and you will constantly get the "too many ticks per frame" warning,
 * if you have disableSlowWarning set to true.</p>
 */

var MAX_TICKS_PER_FRAME = 5;

/**
 * Helper class for internal use by ProcessManager. This is used to
 * track scheduled callbacks from schedule().
 */

var ScheduleEntry = function() {

  this.dueTime = 0;
  this.thisObject = null;
  this.callback = null;
  this.arguments = null;

};

Object.defineProperty(ScheduleEntry.prototype, "priority", {

  get: function() {
    return -dueTime;
  },

  set: function(value) {
    throw("Unimplemented");
  }

});

/**
 * The process manager manages all time related functionality in the engine.
 * It provides mechanisms for performing actions every frame, every tick, or
 * at a specific time in the future.
 *
 * <p>A tick happens at a set interval defined by the TICKS_PER_SECOND constant.
 * Using ticks for various tasks that need to happen repeatedly instead of
 * performing those tasks every frame results in much more consistent output.
 * However, for animation related tasks, frame events should be used so the
 * display remains smooth.</p>
 */

SmashJS.TimeManager = function() {
  this.deferredMethodQueue = [];
  this._virtualTime = 0;
  this._interpolationFactor = 0;
  this.timeScale = 1;
  this.lastTime = -1;
  this.elapsed = 0;
  this.animatedObjects = [];
  this.tickedObjects = [];
  this.needPurgeEmpty = false;
  this._platformTime = 0;
  this._frameCounter = 0;
  this.duringAdvance = false;
  this.thinkHeap = new SmashJS.util.SimplePriorityQueue(4096);

  /**
   * If true, disables warnings about losing ticks.
   */

  this.disableSlowWarning = true;

  /**
   * The scale at which time advances. If this is set to 2, the game
   * will play twice as fast. A value of 0.5 will run the
   * game at half speed. A value of 1 is normal.
   */

   this.timeScale = 1;
};

SmashJS.TimeManager.prototype.constructor = SmashJS.TimeManager;

SmashJS.TimeManager.prototype.initialize = function() {
  if (!this.started) {
    this.start();
  }
};

SmashJS.TimeManager.prototype.destroy = function() {
  if (this.started) {
    stop();
  }
};

/**
 * Starts the process manager. This is automatically called when the first object
 * is added to the process manager. If the manager is stopped manually, then this
 * will have to be called to restart it.
 */

SmashJS.TimeManager.prototype.start = function() {
  if (this.started) {
      //Logger.warn(this, "start", "The ProcessManager is already started.");
      return;
  }

  this.lastTime = -1.0;
  this.elapsed = 0.0;
  this.started = true;
};

/**
 * Stops the process manager. This is automatically called when the last object
 * is removed from the process manager, but can also be called manually to, for
 * example, pause the game.
 */

SmashJS.TimeManager.prototype.stop = function() {
  if (!this.started) {
    //Logger.warn(this, "stop", "The TimeManager isn't started.");
    return;
  }

  this.started = false;
};


/**
 * Schedules a function to be called at a specified time in the future.
 *
 * @param delay The number of milliseconds in the future to call the function.
 * @param thisObject The object on which the function should be called. This
 * becomes the 'this' variable in the function.
 * @param callback The function to call.
 * @param arguments The arguments to pass to the function when it is called.
 */

SmashJS.TimeManager.prototype.schedule = function(delay, thisObject, callback) {
  var args = Array.prototype.slice.call(arguments, 3);

  if (!this.started) {
    this.start();
  }

  var schedule = new ScheduleEntry();
  schedule.dueTime = this._virtualTime + delay;
  schedule.thisObject = thisObject;
  schedule.callback = callback;
  schedule.arguments = args;

  this.thinkHeap.enqueue(schedule);
};

/**
 * Registers an object to receive frame callbacks.
 *
 * @param object The object to add.
 * @param priority The priority of the object. Objects added with higher priorities
 * will receive their callback before objects with lower priorities. The highest
 * (first-processed) priority is Number.MAX_VALUE. The lowest (last-processed)
 * priority is -Number.MAX_VALUE.
 */

SmashJS.TimeManager.prototype.addAnimatedObject = function(object, priority) {
  if (priority === undefined) {
    priority = 0;
  }
  this.addObject(object, priority, this.animatedObjects);
};

/**
 * Registers an object to receive tick callbacks.
 *
 * @param object The object to add.
 * @param priority The priority of the object. Objects added with higher priorities
 * will receive their callback before objects with lower priorities. The highest
 * (first-processed) priority is Number.MAX_VALUE. The lowest (last-processed)
 * priority is -Number.MAX_VALUE.
 */

SmashJS.TimeManager.prototype.addTickedObject = function(object, priority) {
  if (priority === undefined) {
    priority = 0;
  }
  this.addObject(object, priority, this.tickedObjects);
};

/**
 * Queue an IQueuedObject for callback. This is a very cheap way to have a callback
 * happen on an object. If an object is queued when it is already in the queue, it
 * is removed, then added.
 */

SmashJS.TimeManager.prototype.queueObject = function(object) {
  // Assert if this is in the past.
  if (object.nextThinkTime < this._virtualTime) {
    throw new Error("Tried to queue something into the past, but no flux capacitor is present!");
  }

  if (this.thinkHeap.contains(object)) {
    this.thinkHeap.remove(object);
  }

  if (!this.thinkHeap.enqueue(object)) {
    //Logger.print(this, "Thinking queue length maxed out!");
  }
};

/**
 * Remove an IQueuedObject for consideration for callback. No error results if it
 * was not in the queue.
 */

SmashJS.TimeManager.prototype.dequeueObject = function(object) {
  if(this.thinkHeap.contains(object)) {
    this.thinkHeap.remove(object);
  }
};

/**
 * Unregisters an object from receiving frame callbacks.
 *
 * @param object The object to remove.
 */

SmashJS.TimeManager.prototype.removeAnimatedObject = function(object) {
  this.removeObject(object, this.animatedObjects);
};

/**
 * Unregisters an object from receiving tick callbacks.
 *
 * @param object The object to remove.
 */

SmashJS.TimeManager.prototype.removeTickedObject = function(object) {
  this.removeObject(object, this.tickedObjects);
};

/**
 * Deferred function callback - called back at start of processing for next frame. Useful
 * any time you are going to do setTimeout(someFunc, 1) - it's a lot cheaper to do it
 * this way.
 * @param method Function to call.
 * @param args Any arguments.
 */

SmashJS.TimeManager.prototype.callLater = function(context, method) {
  var args = Array.prototype.slice.call(arguments, 2);
  var dm = {
    context: context,
    method: method,
    args: args
  };
  deferredMethodQueue.push(dm);
};


/**
 * Internal function add an object to a list with a given priority.
 * @param object Object to add.
 * @param priority Priority; this is used to keep the list ordered.
 * @param list List to add to.
 */

SmashJS.TimeManager.prototype.addObject = function(object, priority, list) {
  // If we are in a tick, defer the add.
  if (this.duringAdvance) {
      throw new Error("Unimplemented!");
      //group.callLater(addObject, [ object, priority, list]);
  }

  if (!this.started) {
    this.start();
  }

  var position = -1;
  for (var i = 0; i < list.length; i++) {
    if(!list[i]) {
      continue;
    }

    if (list[i].listener === object) {
        //Logger.warn(object, "AddProcessObject", "This object has already been added to the process manager.");
        return;
    }

    if (list[i].priority < priority) {
        position = i;
        break;
    }
  }

  var processObject = {
    listener: object,
    priority: priority
  };

  if (position < 0 || position >= list.length) {
    list.push(processObject);
  } else {
    list.splice(position, 0, processObject);
  }
};

/**
 * Peer to addObject; removes an object from a list.
 * @param object Object to remove.
 * @param list List from which to remove.
 */

SmashJS.TimeManager.prototype.removeObject = function(object, list) {
  if (this.listenerCount == 1 && this.thinkHeap.size === 0) {
    this.stop();
  }

  for (var i = 0; i < list.length; i++) {
    if(!list[i]) {
      continue;
    }

    if (list[i].listener === object) {
      if (this.duringAdvance) {
          list[i] = null;
          this.needPurgeEmpty = true;
      } else {
          list.splice(i, 1);
      }

      return;
    }
  }

  //Logger.warn(object, "RemoveProcessObject", "This object has not been added to the process manager.");
};

/**
 * Main callback; this is called every frame and allows game logic to run.
 */

SmashJS.TimeManager.prototype.update = function() {

  if (!this.started) {
    return;
  }

  // Track current time.
  var currentTime = Date.now();
  if (this.lastTime < 0) {
    this.lastTime = currentTime;
    return;
  }

  // Bump the frame counter.
  this._frameCounter++;

  // Calculate time since last frame and advance that much.
  var deltaTime = (currentTime - this.lastTime) * this.timeScale;
  this.advance(deltaTime);

  // Note new last time.
  this.lastTime = currentTime;
};

SmashJS.TimeManager.prototype.advance = function(deltaTime, suppressSafety) {
  if (suppressSafety === undefined) {
    suppressSafety = false;
  }

  // Update platform time, to avoid lots of costly calls to Date.now().
  this._platformTime = Date.now();

  // Note virtual time we started advancing from.
  var startTime = this._virtualTime;

  // Add time to the accumulator.
  this.elapsed += deltaTime;

  // Perform ticks, respecting tick caps.
  var tickCount = 0;
  while (this.elapsed >= TICK_RATE_MS && (suppressSafety || tickCount < MAX_TICKS_PER_FRAME)) {
    this.fireTick();
    this.tickCount++;
  }

  // Safety net - don't do more than a few ticks per frame to avoid death spirals.
  if (this.tickCount >= MAX_TICKS_PER_FRAME && !suppressSafety && !disableSlowWarning)
  {
      // By default, only show when profiling.
      //Logger.warn(this, "advance", "Exceeded maximum number of ticks for frame (" + elapsed.toFixed() + "ms dropped) .");
  }

  // Make sure that we don't fall behind too far. This helps correct
  // for short-term drops in framerate as well as the scenario where
  // we are consistently running behind.
  this.elapsed = this.clamp(this.elapsed, 0, 300);

  // Make sure we don't lose time to accumulation error.
  // Not sure this gains us anything, so disabling -- BJG
  //_virtualTime = startTime + deltaTime;

  // We process scheduled items again after tick processing to ensure between-tick schedules are hit
  // Commenting this out because it can cause too-often calling of callLater methods. -- BJG
  // processScheduledObjects();

  // Update objects wanting OnFrame callbacks.
  this.duringAdvance = true;
  this._interpolationFactor = this.elapsed / TICK_RATE_MS;

  for(var i = 0; i < this.animatedObjects.length; i++) {
    var animatedObject = this.animatedObjects[i];
    if (animatedObject) {
      animatedObject.listener.onFrame();
    }
  }

  this.duringAdvance = false;

  // Purge the lists if needed.
  if (this.needPurgeEmpty) {
    this.needPurgeEmpty = false;

    for (var j = 0; j < this.animatedObjects.length; j++) {
      if (this.animatedObjects[j]) {
        continue;
      }

      this.animatedObjects.splice(j, 1);
      j--;
    }

    for (var k = 0; k < this.tickedObjects.length; k++) {
      if (this.tickedObjects[k]) {
        continue;
      }

      this.tickedObjects.splice(k, 1);
      k--;
    }
  }
};

SmashJS.TimeManager.prototype.fireTick = function() {
  // Ticks always happen on interpolation boundary.
  this._interpolationFactor = 0.0;

  // Process pending events at this tick.
  // This is done in the loop to ensure the correct order of events.
  this.processScheduledObjects();

  // Do the onTick callbacks
  duringAdvance = true;
  for (var j = 0; j < this.tickedObjects.length; j++) {
    var object = this.tickedObjects[j];
    if(!object) {
      continue;
    }
    object.listener.onTick(TICK_RATE);
  }
  this.duringAdvance = false;

  // Update virtual time by subtracting from accumulator.
  this._virtualTime += TICK_RATE_MS;
  this.elapsed -= TICK_RATE_MS;
};

SmashJS.TimeManager.prototype.processScheduledObjects = function() {
  // Do any deferred methods.
  var oldDeferredMethodQueue = this.deferredMethodQueue;
  if (oldDeferredMethodQueue.length > 0)
  {
    // Put a new array in the queue to avoid getting into corrupted
    // state due to more calls being added.
    this.deferredMethodQueue = [];

    for (var j = 0; j < oldDeferredMethodQueue.length; j++) {
      var curDM = oldDeferredMethodQueue[j];
      curDM.method.apply(curDM.context, curDM.args);
    }

    // Wipe the old array now we're done with it.
    oldDeferredMethodQueue.length = 0;
  }

  // Process any queued items.
  if (this.thinkHeap.size > 0) {
    while(this.thinkHeap.size > 0 && this.thinkHeap.front.priority >= -this._virtualTime) {
      var itemRaw = this.thinkHeap.dequeue();

      if (itemRaw.nextThinkTime) {
        // Check here to avoid else block that throws an error - empty callback
        // means it unregistered.
        if (itemRaw.nextThinkCallback) {
          itemRaw.nextThinkCallback.call(itemRaw.nextThinkContext);
        }
      } else if (itemRaw.callback) {
        itemRaw.callback.apply(itemRaw.thisObject, itemRaw.arguments);
      } else {
        throw "Unknown type found in thinkHeap.";
      }
    }
  }
};

SmashJS.TimeManager.prototype.clamp = function(v, min, max) {
  min = min || 0;
  max = max || 0;
  if (v < min) return min;
  if (v > max) return max;
  return v;
};

/**
 * Returns true if the process manager is advancing.
 */

Object.defineProperty(SmashJS.TimeManager.prototype, "isTicking", {

  get: function() {
    return this.started;
  }

});

/**
 * Used to determine how far we are between ticks. 0.0 at the start of a tick, and
 * 1.0 at the end. Useful for smoothly interpolating visual elements.
 */

Object.defineProperty(SmashJS.TimeManager.prototype, "interpolationFactor", {

  get: function() {
    return this._interpolationFactor;
  }

});

/**
 * The amount of time that has been processed by the process manager. This does
 * take the time scale into account. Time is in milliseconds.
 */

Object.defineProperty(SmashJS.TimeManager.prototype, "virtualTime", {

  get: function() {
    return this._virtualTime;
  }

});

/**
 * Current time reported by getTimer(), updated every frame. Use this to avoid
 * costly calls to getTimer(), or if you want a unique number representing the
 * current frame.
 */

Object.defineProperty(SmashJS.TimeManager.prototype, "platformTime", {

  get: function() {
    return this._platformTime;
  }

});

/**
 * Integer identifying this frame. Incremented by one for every frame.
 */

Object.defineProperty(SmashJS.TimeManager.prototype, "frameCounter", {

  get: function() {
    return this._frameCounter;
  }

});

Object.defineProperty(SmashJS.TimeManager.prototype, "msPerTick", {

  get: function() {
    return TICK_RATE_MS;
  }

});

/**
 * @return How many objects are depending on the TimeManager right now?
 */

Object.defineProperty(SmashJS.TimeManager.prototype, "listenerCount", {

  get: function() {
    return this.tickedObjects.length + this.animatedObjects.length;
  }

});