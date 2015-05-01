var gulp = require('gulp');
var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var notify = require('gulp-notify');
var del = require('del');

gulp.task('clean', function(cb) {
    del(['build'], cb)
});

gulp.task('build', function() {
  return gulp.src([
      './src/SmashJS.js',
      './src/util/Util.js',
      './src/util/Map.js',
      './src/util/SimplePriorityQueue.js',
      './src/core/BaseObject.js',
      './src/core/GameObject.js',
      './src/core/GameGroup.js',
      './src/core/GameSet.js',
      './src/core/GameComponent.js',
      './src/core/Signal.js',
      './src/core/SignalBinding.js',
      './src/property/Property.js',
      './src/property/ComponentPlugin.js',
      './src/property/FieldPlugin.js',
      './src/property/PropertyInfo.js',
      './src/property/PropertyManager.js',
      './src/time/TimeManager.js',
      './src/time/TickedComponent.js',
      './src/time/AnimatedComponent.js',
      './src/time/QueuedComponent.js'
    ])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(concat('SmashJS.js', { newLine: '\n\n' }))
    .pipe(gulp.dest('./build/'))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest('./build/'))
    .pipe(notify({ message: 'Scripts task complete' }));
});

gulp.task('default', ['clean'], function() {
    gulp.start('build');
});