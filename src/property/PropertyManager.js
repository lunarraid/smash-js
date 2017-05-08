var PropertyInfo from './PropertyInfo';
var ComponentPlugin from './ComponentPlugin';

export default class PropertyManager {

  constructor() {
    this.propertyPlugins = {};
    this.parseCache = {};
    this.cachedPi = new PropertyInfo();
    this.bindingCache = {};
    // Set up default plugins.
    this.registerPropertyType('@', new ComponentPlugin());
  }

  registerPropertyType(prefix, plugin) {
    this.propertyPlugins[prefix] = plugin;
  }

  findProperty(scope, property, providedInfo) {
    if (property === null || property.length === 0) {
      return null;
    }

    // See if it is cached...
    if (!this.parseCache[property]) {
      // Parse and store it.
      this.parseCache[property] = [property.charAt(0)].concat(property.substr(1).split('.'));
    }

    // Either errored or cached at this point.

    // Awesome, switch off the type...
    var cached = this.parseCache[property];
    var plugin = this.propertyPlugins[cached[0]];
    if (!plugin) {
      throw ('Unknown prefix '' + cached[0] + '' in '' + property + ''.');
    }

    // Let the plugin do its thing.
    plugin.resolve(scope, cached, providedInfo);

    return providedInfo;
  }

  applyBinding(scope, binding) {
    // Cache parsing if possible.
    if (!this.bindingCache[binding]) {
      this.bindingCache[binding] = binding.split('||');
    }

    // Now do the mapping.
    var bindingCached = this.bindingCache[binding];
    var newValue = this.findProperty(scope, bindingCached[1], this.cachedPi).getValue();
    if (scope[bindingCached[0]] !== newValue) {
      scope[bindingCached[0]] = newValue;
    }};

  getProperty(scope, property, defaultValue) {
    // Look it up.
    var resPi = this.findProperty(scope, property, this.cachedPi);

    // Get value or return default.
    if (resPi) {
      return resPi.getValue();
    } else {
      return defaultValue;
    }
  }

  setProperty(scope, property, value) {
    // Look it up.
    var resPi = this.findProperty(scope, property, this.cachedPi);

    // Abort if not found, can't set nothing!
    if (resPi === null) {
      return;
    }
    resPi.setValue(value);
  }

}
