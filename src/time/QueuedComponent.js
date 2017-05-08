import GameComponent from '../core/GameComponent';
import TimeManager from './TimeManager';

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

export default class QueuedComponent extends GameComponent {

  /**
   * Schedule the next time this component should think.
   * @param nextCallback Function to be executed.
   * @param timeTillThink Time in ms from now at which to execute the function (approximately).
   */
  think(nextContext, nextCallback, timeTillThink) {
    this.nextThinkContext = nextContext;
    this.nextThinkTime = this.timeManager.virtualTime + timeTillThink;
    this.nextThinkCallback = nextCallback;
    this.timeManager.queueObject(this);
  }

  unthink() {
    this.timeManager.dequeueObject(this);
  }

  onAdd() {
    super.onAdd();
    this.timeManager = this.owner.getManager(TimeManager);
    this.nextThinkContext = null;
    this.nextThinkCallback = null;
  }

  onRemove() {
    // Do not allow us to be called back if we are still in the queue.
    this.nextThinkContext = null;
    this.nextThinkCallback = null;
    super.onRemove();
  }

  get priority() {
    return -this.nextThinkTime;
  }

}
