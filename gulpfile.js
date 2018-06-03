const gulp = require('gulp');
require('gulp-grunt')(gulp); // add all the gruntfile tasks to gulp
const plugins = require('gulp-load-plugins')({lazy:false});
const del = require('del');
const sass = require('gulp-sass');
const assign = require('lodash.assign');
const browserify = require('browserify');
const watchify = require('watchify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const mergeStream = require('merge-stream');
const minify = require('gulp-minify');
const htmlmin = require('gulp-htmlmin');


//Execute by default.
gulp.task('default', ['sass', 'js', 'grunt-create', 'copy', 'watch']);

//WATCH
gulp.task('watch', function () {
  gulp.watch(['resources/scss/*.scss'], ['sass']);
  gulp.watch(['resources/js/*.js'], ['js']);
  gulp.watch(['resources/img/favicon/*.*', 'resources/*.html', 'resources/sw.js', 'resources/manifest.json', 'resources/browserconfig.xml'],  ['copy']);

  Object.keys(jsBundles).forEach(function(key) {
    var b = jsBundles[key];
    b.on('update', function() {
      return bundle(b, key);
    });
  });
});

//CLEAN DIST
gulp.task('clean', function (done) {
  del(['dist'], done);
});

//COPY FILES
gulp.task('copy', function () {
  return mergeStream(
    gulp.src('resources/img/favicon/*.*').pipe(gulp.dest('dist/img/favicon/')),
    gulp.src('resources/manifest.json').pipe(gulp.dest('dist/')),
    gulp.src('resources/browserconfig.xml').pipe(gulp.dest('dist/')),
    gulp.src('resources/*.html')
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest('dist/'))
  );
});


//COMPILE SASS
gulp.task('sass', function () {
  return gulp.src('resources/sass/*.scss')
    .pipe(plugins.sass.sync().on('error', plugins.sass.logError))
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.sass({outputStyle: 'compressed'}))
    .pipe(plugins.sourcemaps.write('/'))
    .pipe(gulp.dest('dist/css'));
});


//Browserify
function createBundle(src) {
  if (!src.push) {
    src = [src];
  }

  var customOpts = {
    entries: src,
    debug: true
  };
  var opts = assign({}, watchify.args, customOpts);
  var b = watchify(browserify(opts));

  b.transform(babelify);

  b.on('log', plugins.util.log);
  return b;
}

function bundle(b, outputPath) {
  var splitPath = outputPath.split('/');
  var outputFile = splitPath[splitPath.length - 1];
  var outputDir = splitPath.slice(0, -1).join('/');

  return b.bundle()
    // log errors if they happen
    .on('error', plugins.util.log.bind(plugins.util, 'Browserify Error'))
    .pipe(source(outputFile))
    // optional, remove if you don't need to buffer file contents
    .pipe(buffer())
    // optional, remove if you dont want sourcemaps
    .pipe(plugins.sourcemaps.init({loadMaps: true})) // loads map from browserify file
       // Add transformation tasks to the pipeline here.
    .pipe(plugins.sourcemaps.write('./')) // writes .map file
    .pipe(minify({
        ext:{
            src:'-debug.js',
            min:'.js'
        }
    }))
    .pipe(gulp.dest(`dist/${outputDir}/`));
}

var jsBundles = {
  'js/bundle_main.js': createBundle('resources/js/main.js'),
  'js/bundle_restaurant.js': createBundle('resources/js/restaurant_info.js'),
  'sw.js': createBundle('sw.js'),
};

gulp.task('js', function () {
  return mergeStream.apply(null,
    Object.keys(jsBundles).map(function(key) {
      return bundle(jsBundles[key], key);
    })
  );
});
