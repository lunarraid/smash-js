SmashJS.Property.FieldPlugin = function() {};

SmashJS.Property.FieldPlugin.prototype.resolve = function(context, cached, propertyInfo) {
  var walk = context;
  for (var i = 0; i < cached.length - 1; i++) {
    walk = walk[cached[i]];
  }

  propertyInfo.object = walk;
  propertyInfo.field = cached[cached.length - 1];
};

SmashJS.Property.FieldPlugin.prototype.resolveFull = function(context, cached, propertyInfo, arrayOffset) {
  if ( arrayOffset === undefined ) {
    arrayOffset = 0;
  }
  var walk = context;
  for (var i = arrayOffset; i < cached.length - 1; i++) {
    walk = walk[cached[i]];
  }

  propertyInfo.object = walk;
  propertyInfo.field = cached[cached.length - 1];
};

SmashJS.Property.FieldPlugin.prototype.constructor = SmashJS.Property.FieldPlugin;