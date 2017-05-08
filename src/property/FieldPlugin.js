export default class FieldPlugin {

  resolve(context, cached, propertyInfo, arrayOffset = 0) {
    var walk = context;
    var end = cached.length - 1;
    for (var i = arrayOffset; i < end; i++) {
      walk = walk[cached[i]];
    }
    propertyInfo.object = walk;
    propertyInfo.field = cached[end];
  }

}
