var gulp = require('gulp');
var browserify = require('gulp-browserify');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var del = require('del');

gulp.task('clean', function(cb) {
    del(['build'], cb);
});

gulp.task('lint', function() {
  return gulp.src('./src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('browserify', ['lint'], function() {
  return gulp.src('src/index.js')
    .pipe(browserify({
      insertGlobals: true
    }))
    .pipe(rename('SmashJS.js'))
    .pipe(gulp.dest('build'));
});

gulp.task('uglify', ['browserify'], function() {
  return gulp.src('build/SmashJS.js')
    .pipe(uglify())
    .pipe(rename('SmashJS.min.js'))
    .pipe(gulp.dest('build'));
});

gulp.task('default', ['clean', 'uglify']);