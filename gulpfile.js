
// - Requires
var gulp = require('gulp'),
    gutil = require('gulp-util'),
    jade = require('gulp-jade'),
    concat = require('gulp-concat'),
    scss = require('gulp-sass'),
    refresh = require('gulp-livereload'),
    lrServer = require('tiny-lr')(),
    minifyCSS = require('gulp-minify-css'),
    embedlr = require('gulp-embedlr'),
    prefix = require('gulp-autoprefixer');


// - Constants
var srcDir = './src/',
    bowerDir = './bower_components/',
    jadeFiles = [
      srcDir+'/index.jade'
    ],
    scssFiles = [
      bowerDir+'/normalize.css/normalize.css',
      srcDir+'/index.scss'
    ],
    buildDir = './',
    lrPort = 35729;


// - Steps
gulp.task('html', function() {
  gulp.src(jadeFiles)
      .pipe(jade({}))
      .pipe(embedlr({
        src: 'http://localhost:' + lrPort + '/livereload.js?snipver=1'
      }))
      .pipe(gulp.dest(buildDir))
      .pipe(refresh(lrServer));
});

gulp.task('css', function() {
  gulp.src(scssFiles)
      .pipe(scss().on('error', gutil.log))
      .pipe(prefix())
      //.pipe(minifyCSS())
      .pipe(concat('index.css'))
      .pipe(gulp.dest(buildDir))
      .pipe(refresh(lrServer));
});

gulp.task('server', function(next) {
  var connect = require('connect');
  connect()
    .use(connect.static(buildDir))
    .listen(process.env.PORT || 8000, next);
});


// - Tasks
gulp.task('default', ['server', 'html', 'css'], function() {
  gulp.watch(scssFiles, ['css'] );
  gulp.watch(jadeFiles, ['html']);
});
