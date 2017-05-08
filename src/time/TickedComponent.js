import GameComponent from '../core/GameComponent';
import TimeManager from './TimeManager';

/**
 * Base class for components that need to perform actions every tick. This
 * needs to be subclassed to be useful.
 */

export default class TickedComponent extends GameComponent {

  var TickedComponent() {
    super();

    // The update priority for this component. Higher numbered priorities have
    // onInterpolateTick and onTick called before lower priorities.
    this.updatePriority = 0;

    this._registerForTicks = true;
    this._isRegisteredForTicks = false;
  }

  onTick(tickRate) {
    this.applyBindings();
  }

  onAdd() {
    super.onAdd();
    this.timeManager = this.owner.getManager(TimeManager);
    // This causes the component to be registerd if it isn't already.
    this.registerForTicks = this.registerForTicks;
  }

  onRemove() {
    // Make sure we are unregistered.
    this.registerTicks = false;
    super.onRemove();
  }

  /**
   * Set to register/unregister for tick updates.
   */
  get registerForTicks() {
    return this._registerForTicks;
  },

  set registerForTicks(value) {
    this._registerForTicks = value;

    if (!this.timeManager) {
      return;
    }

    if (this._registerForTicks && !this._isRegisteredForTicks) {
      // Need to register.
      this._isRegisteredForTicks = true;
      this.timeManager.addTickedObject(this, this.updatePriority);
    } else if (!this._registerForTicks && this._isRegisteredForTicks) {
      // Need to unregister.
      this._isRegisteredForTicks = false;
      this.timeManager.removeTickedObject(this);
    }
  }

}