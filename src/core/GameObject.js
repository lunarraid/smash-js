import BaseObject from './BaseObject';
import PropertyManager from '../property/PropertyManager';
import Signal from './Signal';

/**
 * Container class for GameComponent. Most game objects are made by
 * instantiating GameObject and filling it with one or more GameComponent
 * instances.
 */

export default class GameObject extends BaseObject {

  constructor(name) {
    super(name);

    // By having a broadcast Signal object on each GameObject, components
    // can easily send notifications to others without hard coupling
    this.broadcast = new Signal();

    this._deferring = true;
    this._components = {};
  }

  doInitialize(component) {
    component._owner = this;
    component.doAdd();
  }

  /**
   * Add a component to the GameObject. Subject to the deferring flag,
   * the component will be initialized immediately.
   */

  addComponent(component, name) {
    if (name) {
      component.name = name;
    }

    if (!component.name) {
      throw 'Can\'t add component with no name.';
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
      this._components['!' + component.name] = component;
    } else {
      this.doInitialize(component);
    }

    return component;
  }

  /**
   * Remove a component from this game object.
   */

  removeComponent(component) {
    if (component.owner !== this) {
      throw 'Tried to remove a component that does not belong to this GameGameObject.';
    }

    if (this[component.name] === component) {
      this[component.name] = null;
    }

    this._components[component.name] = null;
    delete this._components[component.name];
    component.doRemove();
    component._owner = null;
  }

  /**
   * Look up a component by name.
   */

  lookupComponent(name) {
    return this._components[name];
  }

  /**
   * Get a fresh Array with references to all the components in this
   * game object.
   */

  getAllComponents() {
    var out = [];
    for (var key in this._components) {
      out.push(this._components[key]);
    }
    return out;
  }

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

  initialize() {
    super.initialize();

    // Look for un-added members.
    for (let key in this) {
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
        throw new Error( 'GameComponent has name '' + nc.name + '' but is set into field named '' + key + '', these need to match!' );
      }

      nc.name = key;
      this.addComponent(nc);
    }

    // Stop deferring and let init happen.
    this.deferring = false;

    // Propagate bindings on everything.
    for (let key in this._components) {
      if (!this._components[key].propertyManager) {
        throw new Error('Failed to inject component properly.');
      }
      this._components[key].applyBindings();
    }
  }

  /**
   * Removes any components on this game object, then does normal GameObject
   * destruction (ie, remove from any groups or sets).
   */

  destroy() {
    for (var key in this._components) {
      this.removeComponent(this._components[key]);
    }
    this.broadcast.removeAll();
    this.destroy();
  }

  getManager(clazz) {
    return this.owningGroup.getManager(clazz);
  }

  /**
   * Get a value from this game object in a data driven way.
   * @param property Property string to look up, ie '@componentName.fieldName'
   * @param defaultValue A default value to return if the desired property is absent.
   */

  getProperty(property, defaultValue) {
    return this.getManager(PropertyManager).getProperty(this, property, defaultValue);
  }

  /**
   * Set a value on this game object in a data driven way.
   * @param property Property string to look up, ie '@componentName.fieldName'
   * @param value Value to set if the property is found.
   */

  setProperty(property, value) {
    this.getManager(PropertyManager).setProperty(this, property, value);
  }

  /**
   * If true, then components that are added aren't registered until
   * deferring is set to false. This is used when you are adding a lot of
   * components, or you are adding components with cyclical dependencies
   * and need them to all be present on the GameObject before their
   * onAdd methods are called.
   */

  get deferring() {
    return this._deferring;
  }

  set deferring(value) {
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
          if (key.charAt(0) !== '!') {
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

}
