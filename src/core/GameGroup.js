import BaseObject from './BaseObject';
import SmashMap from '../util/SmashMap';

/**
 * GameGroup provides lifecycle functionality (GameObjects in it are destroy()ed
 * when it is destroy()ed), as well as manager registration (see registerManager).
 *
 * GameGroups are unique because they don't require an owningGroup to
 * be initialize()ed.
 */

export default class GameGroup extends BaseObject {

  constructor() {
    super();
    this._items = [];
    this._managers = new SmashMap();
  }

  /**
   * Does this GameGroup directly contain the specified object?
   */

  contains(object) {
    return (object.owningGroup === this);
  }

  getGameObjectAt(index) {
    return this._items[index];
  }

  initialize() {
    // Groups can stand alone so don't do the _owningGroup check in the parent class.
    // If no owning group, add to the global list for debug purposes.
    //if (this.owningGroup === null) {
      // todo add root group error
      // owningGroup = Game._rootGroup;
    //}
  }

  destroy() {
    super.destroy();

    // Wipe the items.
    while (this.length) {
      this.getGameObjectAt(this.length - 1).destroy();
    }

    for (var i = this._managers.length - 1; i >= 0; i--) {
      var key = this._managers.getKeyAt(i);
      var value = this._managers.getValueAt(i);
      if (value && value.destroy) { value.destroy(); }
      this._managers.remove(key);
    }
  }

  noteRemove(object) {
    // Get it out of the list.
    var idx = this._items.indexOf(object);
    if (idx === -1) {
      throw new Error('Can\'t find GameObject in GameGroup! Inconsistent group membership!');
    }
    this._items.splice(idx, 1);
  }

  noteAdd(object) {
    this._items.push(object);
  }

  /**
   * Add a manager, which is used to fulfill dependencies for the specified
   * name. If the 'manager' implements has an initialize() method, then
   * initialize() is called at this time. When the GameGroup's destroy()
   * method is called, then destroy() is called on the manager if it
   * has this method.
   */

  registerManager(clazz, instance) {
    this._managers.put(clazz, instance);
    instance.owningGroup = this;
    if (instance.initialize) {
      instance.initialize();
    }
    return instance;
  }

  /**
   * Get a previously registered manager.
   */

  getManager(clazz) {
    var res = this._managers.get(clazz);
    if (!res) {
      if (this.owningGroup) {
        return this.owningGroup.getManager(clazz);
      } else {
        throw new Error('Can\'t find manager ' + clazz + '!');
      }
    }
    return res;
  }

  /**
   * Return the GameObject at the specified index.
   */

  lookup(name) {
    for (var i = 0, len = this._items.length; i < len; i++) {
      if (this._items[i].name === name) {
        return this._items[i];
      }
    }

    //Logger.error(GameGroup, 'lookup', 'lookup failed! GameObject by the name of ' + name + ' does not exist');

    return null;
  }


  /**
   * How many GameObjects are in this group?
   */

  get length() {
    return this._items.length;
  }

}
