import GameComponent from '../core/GameComponent';
import TimeManager from './TimeManager';

/**
 * Base class for components that need to perform actions every frame. This
 * needs to be subclassed to be useful.
 */

export default class AnimatedComponent extends GameComponent {

  constructor() {
    super();

    // The update priority for this component. Higher numbered priorities have
    // OnFrame called before lower priorities.
    this.updatePriority = 0;

    this._registerForUpdates = true;
    this._isRegisteredForUpdates = false;
  }

  onFrame() {
    this.applyBindings();
  }

  onAdd() {
    super.onAdd();
    this.timeManager = this.owner.getManager(TimeManager);
    // This causes the component to be registered if it isn't already.
    this.registerForUpdates = this.registerForUpdates;
  }

  onRemove() {
    // Make sure we are unregistered.
    this.registerForUpdates = false;
    super.onRemove();
  }

  /**
   * Set to register/unregister for frame updates.
   */

  get registerForUpdates() {
    return this._registerForUpdates;
  }

  set registerForUpdates(value) {
    this._registerForUpdates = value;

    if (!this.timeManager) {
      return;
    }

    if (this._registerForUpdates && !this._isRegisteredForUpdates) {
      // Need to register.
      this._isRegisteredForUpdates = true;
      this.timeManager.addAnimatedObject(this, this.updatePriority);
    } else if (!this._registerForUpdates && this._isRegisteredForUpdates) {
      // Need to unregister.
      this._isRegisteredForUpdates = false;
      this.timeManager.removeAnimatedObject(this);
    }
  }

}
