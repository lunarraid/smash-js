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