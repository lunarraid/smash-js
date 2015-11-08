global.SmashJS = module.exports = {
  BaseObject: require("./core/BaseObject.js"),
  GameObject: require("./core/GameObject.js"),
  GameSet: require("./core/GameSet.js"),
  GameGroup: require("./core/GameGroup.js"),
  GameComponent: require("./core/GameComponent.js"),
  Signal: require("./core/Signal.js"),
  SignalBinding: require("./core/SignalBinding.js"),
  ComponentPlugin: require("./property/ComponentPlugin.js"),
  FieldPlugin: require("./property/FieldPlugin.js"),
  PropertyInfo: require("./property/PropertyInfo.js"),
  PropertyManager: require("./property/PropertyManager.js"),
  AnimatedComponent: require("./time/AnimatedComponent.js"),
  QueuedComponent: require("./time/QueuedComponent.js"),
  TickedComponent: require("./time/TickedComponent.js"),
  TimeManager: require("./time/TimeManager.js"),
  SimplePriorityQueue: require("./util/SimplePriorityQueue.js"),
  SmashMap: require("./util/SmashMap.js")
};