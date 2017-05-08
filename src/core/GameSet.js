import BaseObject from './BaseObject';

/**
 * GameSet provides safe references to one or more GameObjects. When the
 * referenced GameObjects are destroy()ed, then they are automatically removed
 * from any GameSets.
 */

export default class GameSet extends BaseObject {

  constructor() {
    super();
    this.items = [];
  }

  /**
   * Add a GameObject to the set.
   */

  add(object) {
    this.items.push(object);
    object.noteSetAdd(this);
  }

  /**
   * Remove a GameObject from the set.
   */

  remove(object) {
    var idx = this.items.indexOf(object);
    if (idx === -1) {
      throw "Requested GameObject is not in this GameSet.";
    }
    this.items.splice(idx, 1);
    object.noteSetRemove(this);
  }

  /**
   * Does this GameSet contain the specified object?
   */

  contains(object) {
    return this.items.indexOf(object) !== -1;
  }

  /**
   * Return the object at the specified index of the set.
   */

  getGameObjectAt(index) {
    return this.items[index];
  }

  /**
   * How many objects are in the set?
   */

  get length() {
    return this.items.length;
  }

}
