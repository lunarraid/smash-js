SmashJS.Property.ComponentPlugin = function() {
  this.fieldResolver = new SmashJS.Property.FieldPlugin();
};

SmashJS.Property.ComponentPlugin.prototype.resolve = function(context, cached, propertyInfo) {
  // Context had better be an entity.
  var entity;
  if (context.isBaseObject) {
      entity = context;
  } else if (context.isGameComponent) {
      entity = context.owner;
  } else {
      throw "Can't find entity to do lookup!";
  }

  // Look up the component.
  var component = entity.lookupComponent(cached[1]);

  if (cached.length > 2) {
      // Look further into the object.
      this.fieldResolver.resolveFull(component, cached, propertyInfo, 2);
  } else {
    propertyInfo.object = component;
    propertyInfo.field = null;
  }
};

SmashJS.Property.ComponentPlugin.prototype.constructor = SmashJS.Property.ComponentPlugin;
