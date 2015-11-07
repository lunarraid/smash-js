var SmashJS = SmashJS || {};

SmashJS.util = {};

SmashJS.util.Map = function() {
  this.keys = [];
  this.values = [];
};

SmashJS.util.Map.prototype.constructor = SmashJS.util.Map;

SmashJS.util.Map.prototype.put = function(key, value) {
  var index = this.keys.indexOf(key);
  if (index === -1) {
    this.keys.push(key);
    this.values.push(value);
  }
  else {
    this.values[index] = value;
  }
};

SmashJS.util.Map.prototype.get = function(key) {
  var index = this.keys.indexOf(key);
  return index !== -1 ? this.values[index] : null;
};

SmashJS.util.Map.prototype.remove = function(key) {
  var index = this.keys.indexOf(key);
  if (index !== -1) {
    var lastKey = this.keys.pop();
    var lastValue = this.values.pop();
    if (index !== this.keys.length) {
      this.keys[index] = lastKey;
      this.values[index] = lastValue;
    }
  }
};

SmashJS.util.Map.prototype.getKeyAt = function(index) {
  return this.keys[index];
};

SmashJS.util.Map.prototype.getValueAt = function(index) {
  return this.values[index];
};

SmashJS.util.Map.prototype.removeAll = function() {
  this.keys.length = 0;
  this.values.length = 0;
};


Object.defineProperty(SmashJS.util.Map.prototype, "length", {
  get: function() { return this.keys.length; }
});


/**
 * This class is based on the PriorityQueue class from as3ds, and as such
 * must include this notice:
 *
 * DATA STRUCTURES FOR GAME PROGRAMMERS
 * Copyright (c) 2007 Michael Baczynski, http://www.polygonal.de
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * A priority queue to manage prioritized data.
 * The implementation is based on the heap structure.
 *
 * <p>This implementation is based on the as3ds PriorityHeap.</p>
 */

/**
 * Initializes a priority queue with a given size.
 *
 * @param size The size of the priority queue.
 */

SmashJS.util.SimplePriorityQueue = function(size) {
  this._size = size + 1;
  this._heap = new Array(this._size);
  this._posLookup = new SmashJS.util.Map();
  this._count = 0;
};

SmashJS.util.SimplePriorityQueue.prototype.constructor = SmashJS.util.SimplePriorityQueue;


/**
 * Enqueues a prioritized item.
 *
 * @param obj The prioritized data.
 * @return False if the queue is full, otherwise true.
 */

SmashJS.util.SimplePriorityQueue.prototype.enqueue = function(obj) {
  if (this._count + 1 < this._size) {
    this._count++;
    this._heap[this._count] = obj;
    this._posLookup.put(obj, this._count);
    this.walkUp(this._count);
    return true;
  }
  return false;
};

/**
 * Dequeues and returns the front item.
 * This is always the item with the highest priority.
 *
 * @return The queue's front item or null if the heap is empty.
 */

SmashJS.util.SimplePriorityQueue.prototype.dequeue = function() {
  if (this._count >= 1) {
    var o = this._heap[1];
    this._posLookup.remove(o);

    this._heap[1] = this._heap[this._count];
    this.walkDown(1);

    this._heap[this._count] = null;
    this._count--;
    return o;
  }
  return null;
};

/**
 * Reprioritizes an item.
 *
 * @param obj         The object whose priority is changed.
 * @param newPriority The new priority.
 * @return True if the repriorization succeeded, otherwise false.
 */

SmashJS.util.SimplePriorityQueue.prototype.reprioritize = function(obj, newPriority) {
  if (!this._posLookup.get(obj)) {
    return false;
  }

  var oldPriority = obj.priority;
  obj.priority = newPriority;
  var pos = this._posLookup.get(obj);

  if (newPriority > oldPriority) {
    this.walkUp(pos);
  } else {
    this.walkDown(pos);
  }

  return true;
};

/**
 * Removes an item.
 *
 * @param obj The item to remove.
 * @return True if removal succeeded, otherwise false.
 */

SmashJS.util.SimplePriorityQueue.prototype.remove = function(obj) {
  if (this._count >= 1) {
    var pos = this._posLookup.get(obj);

    var o = this._heap[pos];
    this._posLookup.remove(o);

    this._heap[pos] = this._heap[this._count];

    this.walkDown(pos);

    this._heap[this._count] = null;
    this._posLookup.remove(this._count);
    this._count--;
    return true;
  }

  return false;
};

SmashJS.util.SimplePriorityQueue.prototype.contains = function(obj) {
  return this._posLookup.get(obj) !== null;
};

SmashJS.util.SimplePriorityQueue.prototype.clear = function() {
  this._heap = new Array(this._size);
  this._posLookup = new Map();
  this._count = 0;
};

SmashJS.util.SimplePriorityQueue.prototype.isEmpty = function() {
  return this._count === 0;
};

SmashJS.util.SimplePriorityQueue.prototype.toArray = function() {
  return this._heap.slice(1, this._count + 1);
};

/**
 * Prints out a string representing the current object.
 *
 * @return A string representing the current object.
 */

SmashJS.util.SimplePriorityQueue.prototype.toString = function() {
  return "[SimplePriorityQueue, size=" + _size +"]";
};

/**
 * Prints all elements (for debug/demo purposes only).
 */

SmashJS.util.SimplePriorityQueue.prototype.dump = function() {
  if (this._count === 0) {
    return "SimplePriorityQueue (empty)";
  }

  var s = "SimplePriorityQueue\n{\n";
  var k = this._count + 1;
  for (var i = 1; i < k; i++) {
    s += "\t" + this._heap[i] + "\n";
  }
  s += "\n}";
  return s;
};

SmashJS.util.SimplePriorityQueue.prototype.walkUp = function(index) {
  var parent = index >> 1;
  var parentObj;

  var tmp = this._heap[index];
  var p = tmp.priority;

  while (parent > 0)
  {
      parentObj = this._heap[parent];

      if (p - parentObj.priority > 0) {
          this._heap[index] = parentObj;
          this._posLookup.put(parentObj, index);

          index = parent;
          parent >>= 1;
      }
      else break;
  }

  this._heap[index] = tmp;
  this._posLookup.put(tmp, index);
};

SmashJS.util.SimplePriorityQueue.prototype.walkDown = function(index) {
  var child = index << 1;
  var childObj;

  var tmp = this._heap[index];
  var p = tmp.priority;

  while (child < this._count) {

    if (child < this._count - 1) {
      if (this._heap[child].priority - this._heap[child + 1].priority < 0) {
        child++;
      }
    }

    childObj = this._heap[child];

    if (p - childObj.priority < 0) {
      this._heap[index] = childObj;
      this._posLookup.put(childObj, index);

      this._posLookup.put(tmp, child);

      index = child;
      child <<= 1;
    }
    else break;
  }
  this._heap[index] = tmp;
  this._posLookup.put(tmp, index);
};

/**
 * The front item or null if the heap is empty.
 */

Object.defineProperty(SmashJS.util.SimplePriorityQueue.prototype, "front", {

  get: function() {
    return this._heap[1];
  }

});

/**
 * The maximum capacity.
 */

Object.defineProperty(SmashJS.util.SimplePriorityQueue.prototype, "maxSize", {

  get: function() {
    return this._size;
  }

});


Object.defineProperty(SmashJS.util.SimplePriorityQueue.prototype, "size", {

  get: function() {
    return this._count;
  }

});

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

SmashJS.BaseObject = function(name) {
  this._active = false;
  this._owningGroup = null;
  this._sets = [];
  this._name = name || "";
};

SmashJS.BaseObject.prototype.isBaseObject = true;

// Internal
SmashJS.BaseObject.prototype.noteSetAdd = function(set) {
  this._sets.push(set);
};

// Internal
SmashJS.BaseObject.prototype.noteSetRemove = function(set) {
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

SmashJS.BaseObject.prototype.initialize = function() {
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

SmashJS.BaseObject.prototype.destroy = function() {
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

SmashJS.BaseObject.prototype.constructor = SmashJS.BaseObject;

/**
 * Name of the GameObject. Used for dynamic lookups and debugging.
 */

Object.defineProperty(SmashJS.BaseObject.prototype, "name", {

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

Object.defineProperty(SmashJS.BaseObject.prototype, "sets", {

  get: function() {
    return this._sets;
  }

});

/**
 * The GameGroup that contains us. All GameObjects must be in a GameGroup,
 * and the owningGroup has to be set before calling initialize().
 */

Object.defineProperty(SmashJS.BaseObject.prototype, "owningGroup", {

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

/**
 * Container class for GameComponent. Most game objects are made by
 * instantiating GameObject and filling it with one or more GameComponent
 * instances.
 */

SmashJS.GameObject = function(name) {
  SmashJS.BaseObject.call(this, name);

  // By having a broadcast Signal object on each GameObject, components
  // can easily send notifications to others without hard coupling
  this.broadcast = new SmashJS.Signal();

  this._deferring = true;
  this._components = {};
};

SmashJS.GameObject.prototype = Object.create(SmashJS.BaseObject.prototype);

SmashJS.GameObject.prototype.constructor = SmashJS.GameObject;

SmashJS.GameObject.prototype.doInitialize = function(component) {
  component._owner = this;
  component.doAdd();
};

/**
 * Add a component to the GameObject. Subject to the deferring flag,
 * the component will be initialized immediately.
 */

SmashJS.GameObject.prototype.addComponent = function(component, name) {
  if (name) {
    component.name = name;
  }

  if (!component.name) {
    throw "Can't add component with no name.";
  }

  // Stuff in dictionary.
  this._components[component.name] = component;

  // Set component owner.
  component._owner = this;

  // Directly set field
  if (this[component.name] === undefined) {
    this[component.name] = component;
  }

  // Defer or add now.
  if (this._deferring) {
    this._components["!" + component.name] = component;
  } else {
    this.doInitialize(component);
  }

  return component;
};

/**
 * Remove a component from this game object.
 */

SmashJS.GameObject.prototype.removeComponent = function(component) {
  if (component.owner !== this) {
    throw "Tried to remove a component that does not belong to this GameGameObject.";
  }

  if (this[component.name] === component) {
    this[component.name] = null;
  }

  this._components[component.name] = null;
  delete this._components[component.name];
  component.doRemove();
  component._owner = null;
};

/**
 * Look up a component by name.
 */

SmashJS.GameObject.prototype.lookupComponent = function(name) {
  return this._components[name];
};

/**
 * Get a fresh Vector with references to all the components in this
 * game object.
 */

SmashJS.GameObject.prototype.getAllComponents = function() {
  var out = [];
  for (var key in this._components) {
    out.push(this._components[key]);
  }
  return out;
};

/**
 * Initialize the game object! This is done in a couple of stages.
 *
 * First, the BaseObject initialization is performed.
 * Second, we look for any components in public vars on the GameObject.
 * This allows you to get at them directly instead of
 * doing lookups. If we find any, we add them to the game object.
 * Third, we turn off the deferring flag, so any components you've added
 * via addComponent get initialized.
 * Finally, we call applyBindings to make sure we have the latest data
 * for any registered data bindings.
 */

SmashJS.GameObject.prototype.initialize = function() {
  SmashJS.BaseObject.prototype.initialize.call(this);

  // Look for un-added members.
  for (var key in this)
  {
    var nc = this[key];

    // Only consider components.
    if (!nc || !nc.isGameComponent) {
      continue;
    }

    // Don't double initialize.
    if (nc.owner !== null) {
      continue;
    }

    // OK, add the component.

    if (nc.name && nc.name !== key) {
      throw new Error( "GameComponent has name '" + nc.name + "' but is set into field named '" + key + "', these need to match!" );
    }

    nc.name = key;
    this.addComponent(nc);
  }

  // Stop deferring and let init happen.
  this.deferring = false;

  // Propagate bindings on everything.
  for (var key2 in this._components) {
    if (!this._components[key2].propertyManager) {
      throw new Error("Failed to inject component properly.");
    }
    this._components[key2].applyBindings();
  }
};

/**
 * Removes any components on this game object, then does normal GameObject
 * destruction (ie, remove from any groups or sets).
 */

SmashJS.GameObject.prototype.destroy = function() {
  for (var key in this._components) {
    this.removeComponent(this._components[key]);
  }
  this.broadcast.removeAll();
  SmashJS.BaseObject.prototype.destroy.call(this);
};

SmashJS.GameObject.prototype.getManager = function(clazz) {
  return this.owningGroup.getManager(clazz);
};

/**
 * Get a value from this game object in a data driven way.
 * @param property Property string to look up, ie "@componentName.fieldName"
 * @param defaultValue A default value to return if the desired property is absent.
 */

SmashJS.GameObject.prototype.getProperty = function(property, defaultValue) {
  return this.getManager(SmashJS.PropertyManager).getProperty(this, property, defaultValue);
};

/**
 * Set a value on this game object in a data driven way.
 * @param property Property string to look up, ie "@componentName.fieldName"
 * @param value Value to set if the property is found.
 */

SmashJS.GameObject.prototype.setProperty = function(property, value) {
  this.getManager(SmashJS.PropertyManager).setProperty(this, property, value);
};

/**
 * If true, then components that are added aren't registered until
 * deferring is set to false. This is used when you are adding a lot of
 * components, or you are adding components with cyclical dependencies
 * and need them to all be present on the GameObject before their
 * onAdd methods are called.
 */

Object.defineProperty(SmashJS.GameObject.prototype, "deferring", {

  get: function() {
    return this._deferring;
  },

  set: function(value) {
    if (this._deferring && value === false) {
      // Loop as long as we keep finding deferred stuff, the
      // dictionary delete operations can mess up ordering so we have
      // to check to avoid missing stuff. This is a little lame but
      // our previous implementation involved allocating lots of
      // temporary helper objects, which this avoids, so there you go.
      var foundDeferred = true;

      while (foundDeferred) {
        foundDeferred = false;

        // Initialize deferred components.
        for (var key in this._components) {
          // Normal entries just have alphanumeric.
          if (key.charAt(0) !== "!") {
            continue;
          }

          // It's a deferral, so init it...
          this.doInitialize(this._components[key]);

          // ... and nuke the entry.
          this._components[key] = null;
          delete this._components[key];

          // Indicate we found stuff so keep looking. Otherwise
          // we may miss some.
          foundDeferred = true;
        }
      }
    }

    this._deferring = value;
  }

});

/**
 * GameGroup provides lifecycle functionality (GameObjects in it are destroy()ed
 * when it is destroy()ed), as well as manager registration (see registerManager).
 *
 * GameGroups are unique because they don't require an owningGroup to
 * be initialize()ed.
 */

SmashJS.GameGroup = function() {
  SmashJS.BaseObject.call(this);
  this._items = [];
  this._managers = new SmashJS.util.Map();
};

SmashJS.GameGroup.prototype = Object.create(SmashJS.BaseObject.prototype);

SmashJS.GameGroup.prototype.constructor = SmashJS.GameGroup;

/**
 * Does this GameGroup directly contain the specified object?
 */

SmashJS.GameGroup.prototype.contains = function(object) {
  return (object.owningGroup === this);
};

SmashJS.GameGroup.prototype.getGameObjectAt = function(index) {
  return this._items[index];
};

SmashJS.GameGroup.prototype.initialize = function() {
  // Groups can stand alone so don't do the _owningGroup check in the parent class.
  // If no owning group, add to the global list for debug purposes.
  //if (this.owningGroup === null) {
    // todo add root group error
    // owningGroup = Game._rootGroup;
  //}
};

SmashJS.GameGroup.prototype.destroy = function() {
  SmashJS.BaseObject.prototype.destroy.call(this);

  // Wipe the items.
  while (this.length) {
    this.getGameObjectAt(this.length-1).destroy();
  }

  for (var i = this._managers.length - 1; i >= 0; i--) {
    var key = this._managers.getKeyAt(i);
    var value = this._managers.getValueAt(i);
    if (value && value.destroy) { value.destroy(); }
    this._managers.remove(key);
  }
};

SmashJS.GameGroup.prototype.noteRemove = function(object) {
  // Get it out of the list.
  var idx = this._items.indexOf(object);
  if (idx == -1) {
    throw new Error("Can't find GameObject in GameGroup! Inconsistent group membership!");
  }
  this._items.splice(idx, 1);
};

SmashJS.GameGroup.prototype.noteAdd = function(object) {
  this._items.push(object);
};

/**
 * Add a manager, which is used to fulfill dependencies for the specified
 * name. If the "manager" implements has an initialize() method, then
 * initialize() is called at this time. When the GameGroup's destroy()
 * method is called, then destroy() is called on the manager if it
 * has this method.
 */

SmashJS.GameGroup.prototype.registerManager = function(clazz, instance) {
  this._managers.put(clazz, instance);
  instance.owningGroup = this;
  if (instance.initialize) {
    instance.initialize();
  }
  return instance;
};

/**
 * Get a previously registered manager.
 */

SmashJS.GameGroup.prototype.getManager = function(clazz) {
  var res = this._managers.get(clazz);
  if (!res) {
    if (this.owningGroup) {
      return this.owningGroup.getManager(clazz);
    } else {
      throw new Error("Can't find manager " + clazz + "!");
    }
  }
  return res;
};

/**
 * Return the GameObject at the specified index.
 */

SmashJS.GameGroup.prototype.lookup = function(name) {
  for (var i = 0; i < this._items.length; i++) {
    if (this._items[i].name === name) {
      return this._items[i];
    }
  }

  //Logger.error(GameGroup, "lookup", "lookup failed! GameObject by the name of " + name + " does not exist");

  return null;
};


/**
 * How many GameObjects are in this group?
 */

Object.defineProperty(SmashJS.GameGroup.prototype, "length", {

  get: function() {
    return this._items.length;
  }

});

/**
 * GameSet provides safe references to one or more GameObjects. When the
 * referenced GameObjects are destroy()ed, then they are automatically removed
 * from any GameSets.
 */

SmashJS.GameSet = function() {
  SmashJS.BaseObject.call(this);
  this.items = [];
};

SmashJS.GameSet.prototype = Object.create(SmashJS.BaseObject.prototype);

SmashJS.GameSet.prototype.constructor = SmashJS.GameSet;

/**
 * Add a GameObject to the set.
 */

SmashJS.GameSet.prototype.add = function(object) {
  this.items.push(object);
  object.noteSetAdd(this);
};

/**
 * Remove a GameObject from the set.
 */

SmashJS.GameSet.prototype.remove = function(object) {
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

SmashJS.GameSet.prototype.contains = function(object) {
  return this.items.indexOf(object) !== -1;
};

/**
 * Return the object at the specified index of the set.
 */

SmashJS.GameSet.prototype.getGameObjectAt = function(index) {
  return this.items[index];
};


/**
 * How many objects are in the set?
 */

Object.defineProperty(SmashJS.GameSet.prototype, "length", {

  get: function() {
    return this.items.length;
  }

});

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

/**
 * Custom event broadcaster
 * <br />- inspired by Robert Penner's AS3 Signals.
 * @name Signal
 * @author Miller Medeiros
 * @constructor
 */

SmashJS.Signal = function() {

  /**
   * @type Array.<SignalBinding>
   * @private
   */
  this._bindings = [];
  this._prevParams = null;

  // enforce dispatch to aways work on same context (#47)
  var self = this;
  this.dispatch = function() {
    SmashJS.Signal.prototype.dispatch.apply(self, arguments);
  };

};


SmashJS.Signal.prototype = {

  /**
  * Signals Version Number
  * @type String
  * @const
  */
  VERSION : '::VERSION_NUMBER::',

  /**
  * If Signal should keep record of previously dispatched parameters and
  * automatically execute listener during `add()`/`addOnce()` if Signal was
  * already dispatched before.
  * @type boolean
  */
  memorize : false,

  /**
  * @type boolean
  * @private
  */
  _shouldPropagate : true,

  /**
  * If Signal is active and should broadcast events.
  * <p><strong>IMPORTANT:</strong> Setting this property during a dispatch will only affect the next dispatch, if you want to stop the propagation of a signal use `halt()` instead.</p>
  * @type boolean
  */
  active : true,

  /**`
  * @param {Function} listener
  * @param {boolean} isOnce
  * @param {Object} [listenerContext]
  * @param {Number} [priority]
  * @return {SignalBinding}
  * @private
  */
  _registerListener : function (listener, isOnce, listenerContext, priority) {

    var prevIndex = this._indexOfListener(listener, listenerContext),
        binding;

    if (prevIndex !== -1) {
        binding = this._bindings[prevIndex];
        if (binding.isOnce() !== isOnce) {
            throw new Error('You cannot add'+ (isOnce? '' : 'Once') +'() then add'+ (!isOnce? '' : 'Once') +'() the same listener without removing the relationship first.');
        }
    } else {
        binding = new SmashJS.SignalBinding(this, listener, isOnce, listenerContext, priority);
        this._addBinding(binding);
    }

    if(this.memorize && this._prevParams){
        binding.execute(this._prevParams);
    }

    return binding;
  },

  /**
  * @param {SignalBinding} binding
  * @private
  */
  _addBinding : function (binding) {
    //simplified insertion sort
    var n = this._bindings.length;
    do { --n; } while (this._bindings[n] && binding._priority <= this._bindings[n]._priority);
    this._bindings.splice(n + 1, 0, binding);
  },

  /**
  * @param {Function} listener
  * @return {number}
  * @private
  */
  _indexOfListener : function (listener, context) {
    var n = this._bindings.length,
        cur;
    while (n--) {
        cur = this._bindings[n];
        if (cur._listener === listener && cur.context === context) {
            return n;
        }
    }
    return -1;
  },

  /**
  * Check if listener was attached to Signal.
  * @param {Function} listener
  * @param {Object} [context]
  * @return {boolean} if Signal has the specified listener.
  */
  has : function (listener, context) {
    return this._indexOfListener(listener, context) !== -1;
  },

  /**
  * Add a listener to the signal.
  * @param {Function} listener Signal handler function.
  * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
  * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
  * @return {SignalBinding} An Object representing the binding between the Signal and listener.
  */
  add : function (listener, listenerContext, priority) {
    this.validateListener(listener, 'add');
    return this._registerListener(listener, false, listenerContext, priority);
  },

  /**
  * Add listener to the signal that should be removed after first execution (will be executed only once).
  * @param {Function} listener Signal handler function.
  * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
  * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
  * @return {SignalBinding} An Object representing the binding between the Signal and listener.
  */
  addOnce : function (listener, listenerContext, priority) {
    this.validateListener(listener, 'addOnce');
    return this._registerListener(listener, true, listenerContext, priority);
  },

  /**
  * Remove a single listener from the dispatch queue.
  * @param {Function} listener Handler function that should be removed.
  * @param {Object} [context] Execution context (since you can add the same handler multiple times if executing in a different context).
  * @return {Function} Listener handler function.
  */
  remove : function (listener, context) {
    this.validateListener(listener, 'remove');

    var i = this._indexOfListener(listener, context);
    if (i !== -1) {
        this._bindings[i]._destroy(); //no reason to a SignalBinding exist if it isn't attached to a signal
        this._bindings.splice(i, 1);
    }
    return listener;
  },

  /**
  * Remove all listeners from the Signal.
  */
  removeAll : function () {
    var n = this._bindings.length;
    while (n--) {
        this._bindings[n]._destroy();
    }
    this._bindings.length = 0;
  },

  /**
  * @return {number} Number of listeners attached to the Signal.
  */
  getNumListeners : function () {
    return this._bindings.length;
  },

  /**
  * Stop propagation of the event, blocking the dispatch to next listeners on the queue.
  * <p><strong>IMPORTANT:</strong> should be called only during signal dispatch, calling it before/after dispatch won't affect signal broadcast.</p>
  * @see Signal.prototype.disable
  */
  halt : function () {
    this._shouldPropagate = false;
  },

  /**
  * Dispatch/Broadcast Signal to all listeners added to the queue.
  * @param {...*} [params] Parameters that should be passed to each handler.
  */
  dispatch : function (params) {
    if (! this.active) {
        return;
    }

    var paramsArr = Array.prototype.slice.call(arguments),
        n = this._bindings.length,
        bindings;

    if (this.memorize) {
        this._prevParams = paramsArr;
    }

    if (! n) {
        //should come after memorize
        return;
    }

    bindings = this._bindings.slice(); //clone array in case add/remove items during dispatch
    this._shouldPropagate = true; //in case `halt` was called before dispatch or during the previous dispatch.

    //execute all callbacks until end of the list or until a callback returns `false` or stops propagation
    //reverse loop since listeners with higher priority will be added at the end of the list
    do { n--; } while (bindings[n] && this._shouldPropagate && bindings[n].execute(paramsArr) !== false);
  },

  validateListener : function(listener, fnName) {
    if (typeof listener !== 'function') {
        throw new Error( 'listener is a required param of {fn}() and should be a Function.'.replace('{fn}', fnName) );
    }
  },

  /**
  * Forget memorized arguments.
  * @see Signal.memorize
  */
  forget : function(){
    this._prevParams = null;
  },

  /**
  * Remove all bindings from signal and destroy any reference to external objects (destroy Signal object).
  * <p><strong>IMPORTANT:</strong> calling any method on the signal instance after calling dispose will throw errors.</p>
  */
  dispose : function () {
    this.removeAll();
    delete this._bindings;
    delete this._prevParams;
  },

  /**
  * @return {string} String representation of the object.
  */
  toString : function () {
    return '[Signal active:'+ this.active +' numListeners:'+ this.getNumListeners() +']';
  }

};

// SignalBinding -------------------------------------------------
//================================================================

/**
* Object that represents a binding between a Signal and a listener function.
* <br />- <strong>This is an internal constructor and shouldn't be called by regular users.</strong>
* <br />- inspired by Joa Ebert AS3 SignalBinding and Robert Penner's Slot classes.
* @author Miller Medeiros http://millermedeiros.github.com/js-signals/
* @constructor
* @internal
* @name SignalBinding
* @param {Signal} signal Reference to Signal object that listener is currently bound to.
* @param {Function} listener Handler function bound to the signal.
* @param {boolean} isOnce If binding should be executed just once.
* @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
* @param {Number} [priority] The priority level of the event listener. (default = 0).
*/

SmashJS.SignalBinding = function(signal, listener, isOnce, listenerContext, priority) {

  /**
   * Handler function bound to the signal.
   * @type Function
   * @private
   */
  this._listener = listener;

  /**
   * If binding should be executed just once.
   * @type boolean
   * @private
   */
  this._isOnce = isOnce;

  /**
   * Context on which listener will be executed (object that should represent the `this` variable inside listener function).
   * @memberOf SignalBinding.prototype
   * @name context
   * @type Object|undefined|null
   */
  this.context = listenerContext;

  /**
   * Reference to Signal object that listener is currently bound to.
   * @type Signal
   * @private
   */
  this._signal = signal;

  /**
   * Listener priority
   * @type Number
   * @private
   */
  this._priority = priority || 0;
};

SmashJS.SignalBinding.prototype = {

  /**
   * If binding is active and should be executed.
   * @type boolean
   */
  active : true,

  /**
   * Default parameters passed to listener during `Signal.dispatch` and `SignalBinding.execute`. (curried parameters)
   * @type Array|null
   */
  params : null,

  /**
   * Call listener passing arbitrary parameters.
   * <p>If binding was added using `Signal.addOnce()` it will be automatically removed from signal dispatch queue, this method is used internally for the signal dispatch.</p>
   * @param {Array} [paramsArr] Array of parameters that should be passed to the listener
   * @return {*} Value returned by the listener.
   */
  execute : function (paramsArr) {
    var handlerReturn, params;
    if (this.active && !!this._listener) {
      params = this.params? this.params.concat(paramsArr) : paramsArr;
      handlerReturn = this._listener.apply(this.context, params);
      if (this._isOnce) {
          this.detach();
      }
    }
    return handlerReturn;
  },

  /**
   * Detach binding from signal.
   * - alias to: mySignal.remove(myBinding.getListener());
   * @return {Function|null} Handler function bound to the signal or `null` if binding was previously detached.
   */
  detach : function () {
    return this.isBound()? this._signal.remove(this._listener, this.context) : null;
  },

  /**
   * @return {Boolean} `true` if binding is still bound to the signal and have a listener.
   */
  isBound : function () {
    return (!!this._signal && !!this._listener);
  },

  /**
   * @return {boolean} If SignalBinding will only be executed once.
   */
  isOnce : function () {
    return this._isOnce;
  },

  /**
   * @return {Function} Handler function bound to the signal.
   */
  getListener : function () {
    return this._listener;
  },

  /**
   * @return {Signal} Signal that listener is currently bound to.
   */
  getSignal : function () {
    return this._signal;
  },

  /**
   * Delete instance properties
   * @private
   */
  _destroy : function () {
    delete this._signal;
    delete this._listener;
    delete this.context;
  },

  /**
   * @return {string} String representation of the object.
   */
  toString : function () {
    return '[SignalBinding isOnce:' + this._isOnce +', isBound:'+ this.isBound() +', active:' + this.active + ']';
  }

};


SmashJS.Property = SmashJS.Property || {};

SmashJS.Property.ComponentPlugin = function() {
  this.fieldResolver = new SmashJS.Property.FieldPlugin();
};

SmashJS.Property.ComponentPlugin.prototype.resolve = function(context, cached, propertyInfo) {
  // Context had better be an entity.
  var entity;
  if (context.isBaseObject) {
      entity = context;
  } else if (context.isGameComponent) {
      entity = context.owner;
  } else {
      throw "Can't find entity to do lookup!";
  }

  // Look up the component.
  var component = entity.lookupComponent(cached[1]);

  if (cached.length > 2) {
      // Look further into the object.
      this.fieldResolver.resolveFull(component, cached, propertyInfo, 2);
  } else {
    propertyInfo.object = component;
    propertyInfo.field = null;
  }
};

SmashJS.Property.ComponentPlugin.prototype.constructor = SmashJS.Property.ComponentPlugin;


SmashJS.Property.FieldPlugin = function() {};

SmashJS.Property.FieldPlugin.prototype.resolve = function(context, cached, propertyInfo) {
  var walk = context;
  for (var i = 0; i < cached.length - 1; i++) {
    walk = walk[cached[i]];
  }

  propertyInfo.object = walk;
  propertyInfo.field = cached[cached.length - 1];
};

SmashJS.Property.FieldPlugin.prototype.resolveFull = function(context, cached, propertyInfo, arrayOffset) {
  if ( arrayOffset === undefined ) {
    arrayOffset = 0;
  }
  var walk = context;
  for (var i = arrayOffset; i < cached.length - 1; i++) {
    walk = walk[cached[i]];
  }

  propertyInfo.object = walk;
  propertyInfo.field = cached[cached.length - 1];
};

SmashJS.Property.FieldPlugin.prototype.constructor = SmashJS.Property.FieldPlugin;

/**
 * Internal class used by Entity to service property lookups.
 */

SmashJS.Property.PropertyInfo = function() {
  this.object = null;
  this.field = null;
};

SmashJS.Property.PropertyInfo.prototype.constructor = SmashJS.Property.PropertyInfo;

SmashJS.Property.PropertyInfo.prototype.getValue = function() {
  if (this.field) {
    return this.object[this.field];
  } else {
    return this.object;
  }
};

SmashJS.Property.PropertyInfo.prototype.setValue = function(value) {
  this.object[this.field] = value;
};

SmashJS.Property.PropertyInfo.prototype.clear = function() {
  this.object = null;
  this.field = null;
};

SmashJS.PropertyManager = function() {
  this.propertyPlugins = {};
  this.parseCache = {};
  this.cachedPi = new SmashJS.Property.PropertyInfo();
  this.bindingCache = {};
  // Set up default plugins.
  this.registerPropertyType("@", new SmashJS.Property.ComponentPlugin());
};

SmashJS.PropertyManager.prototype.constructor = SmashJS.PropertyManager;

SmashJS.PropertyManager.prototype.registerPropertyType = function(prefix, plugin) {
  this.propertyPlugins[prefix] = plugin;
};

SmashJS.PropertyManager.prototype.findProperty = function(scope, property, providedInfo) {
  if (property === null || property.length === 0) {
    return null;
  }

  // See if it is cached...
  if (!this.parseCache[property]) {
    // Parse and store it.
    this.parseCache[property] = [property.charAt(0)].concat(property.substr(1).split("."));
  }

  // Either errored or cached at this point.

  // Awesome, switch off the type...
  var cached = this.parseCache[property];
  var plugin = this.propertyPlugins[cached[0]];
  if (!plugin) {
    throw ("Unknown prefix '" + cached[0] + "' in '" + property + "'.");
  }

  // Let the plugin do its thing.
  plugin.resolve(scope, cached, providedInfo);

  return providedInfo;
};

SmashJS.PropertyManager.prototype.applyBinding = function(scope, binding) {
  // Cache parsing if possible.
  if (!this.bindingCache[binding]) {
    this.bindingCache[binding] = binding.split("||");
  }

  // Now do the mapping.
  var bindingCached = this.bindingCache[binding];
  var newValue = this.findProperty(scope, bindingCached[1], this.cachedPi).getValue();
  if (scope[bindingCached[0]] !== newValue) {
    scope[bindingCached[0]] = newValue;
  }};

SmashJS.PropertyManager.prototype.getProperty = function(scope, property, defaultValue) {
  // Look it up.
  var resPi = this.findProperty(scope, property, this.cachedPi);

  // Get value or return default.
  if (resPi) {
    return resPi.getValue();
  } else {
    return defaultValue;
  }
};

SmashJS.PropertyManager.prototype.setProperty = function(scope, property, value) {
  // Look it up.
  var resPi = this.findProperty(scope, property, this.cachedPi);

  // Abort if not found, can't set nothing!
  if (resPi === null) {
    return;
  }
  resPi.setValue(value);
};

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

  var animDT = deltaTime * 0.001;

  for(var i = 0; i < this.animatedObjects.length; i++) {
    var animatedObject = this.animatedObjects[i];
    if (animatedObject) {
      animatedObject.listener.onFrame(animDT);
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