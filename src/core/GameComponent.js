import PropertyManager from '../property/PropertyManager';

/**
 * Base class for most game functionality. Contained in a GameObject.
 *
 * Provides a generic data binding system as well as callbacks when
 * the component is added to or removed from a GameObject.
 */

export default class GameComponent {

  constructor() {
    this.bindings = [];
    this._safetyFlag = false;
    this._name = '';
    this._owner = null;
  }


  /**
   * Components include a powerful data binding system. You can set up
   * rules indicating fields to load from other parts of the game, then
   * apply the data bindings using the applyBindings() method. If you don't
   * use them, bindings have no overhead.
   *
   * @param fieldName Name of a field on this object to copy data to.
   * @param propertyReference A reference to a value on another component,
   *                          GameObject, or other part of the system.
   *                          Usually '@componentName.fieldName'.
   */

  addBinding(fieldName, propertyReference) {
    this.bindings.push(fieldName + '||' + propertyReference);
  }

  /**
   * Remove a binding previously added with addBinding. Call with identical
   * parameters.
   */

  removeBinding(fieldName, propertyReference) {
    var binding = fieldName + '||' + propertyReference;
    var idx = this.bindings.indexOf(binding);
    if (idx === -1) {
      return;
    }
    this.bindings.splice(idx, 1);
  }

  /**
   * Loop through bindings added with addBinding and apply them. Typically
   * called at start of onTick or onFrame handler.
   */

  applyBindings() {
    if (!this.propertyManager) {
      throw new Error('Couldn\'t find a PropertyManager instance');
    }

    for (var i = 0, len = this.bindings.length; i < len; i++) {
      this.propertyManager.applyBinding(this, this.bindings[i]);
    }
  }

  doAdd() {
    this.propertyManager = this.owner.getManager(PropertyManager);
    this._safetyFlag = false;
    this.onAdd();
    if (this._safetyFlag === false) {
      throw new Error('You forget to call onAdd() on super in an onAdd override.');
    }
  }

  doRemove() {
    this._safetyFlag = false;
    this.onRemove();
    if (this._safetyFlag === false) {
      throw new Error('You forget to call onRemove() on super in an onRemove handler.');
    }
  }

  /**
   * Called when component is added to a GameObject. Do component setup
   * logic here.
   */

  onAdd() {
    this._safetyFlag = true;
  }

  /**
   * Called when component is removed frmo a GameObject. Do component
   * teardown logic here.
   */

  onRemove() {
    this._safetyFlag = true;
  }

  get name() {
    return this._name;
  }

  set name(value) {
    if (this._owner) {
      throw new Error('Already added to GameObject, can\'t change name of GameComponent.');
    }
    this._name = value;
  }

  /**
   * What GameObject contains us, if any?
   */

  get owner() {
    return this._owner;
  }

}

GameComponent.prototype.isGameComponent = true;
