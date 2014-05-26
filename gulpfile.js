var gulp = require('gulp'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish'),
    concat = require('gulp-concat'),
    sass = require('gulp-sass'),
    bowerFiles = require('gulp-bower-files'),
    es = require('event-stream'),
    autoprefixer = require('gulp-autoprefixer'),
    inject = require('gulp-inject'),
    rimraf = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    open = require('open'),
    shell = require('gulp-shell'),
    watch = require('gulp-watch');


// Modules for webserver and livereload
var refresh = require('gulp-livereload'),
    lrserver = require('tiny-lr')(),
    express = require('express'),
    livereload = require('connect-livereload'),
    livereloadport = 35729,
    serverport = 5000;


var paths = {
    sass: 'app/styles/**/*.scss',
    css: 'app/styles/**/*.css',
    js: 'app/scripts/**/*.js',
    views: 'app/views/**/*.html',
    index: 'app/index.html'
};

// Set up an express server (not starting it yet)
var server = express();
server.use(livereload({port: livereloadport}));
server.use(express.static('./www'));


gulp.task('dev', ['build'], function() {
    server.listen(serverport);
    lrserver.listen(livereloadport);

    watch({ glob: [paths.css, paths.sass] }, ['styles.watch']);
    watch({ glob: paths.js },['scripts.watch']);
    watch({ glob: 'app/**/*.html' }, ['views']);

    setTimeout(function () {
        open("http://localhost:5000");
    }, 1000);

});

gulp.task('build', function () {
    runSequence('clean', ['styles', 'scripts', 'bower_components'], 'views');
});


gulp.task('clean', function () {
    return gulp.src('www/**/*', { read: false }).pipe(rimraf());
});

gulp.task('scripts', function() {
    return gulp.src(paths.js)
        .pipe(jshint())
        .pipe(jshint.reporter(stylish))
        .pipe(gulp.dest('www/scripts/'))
        .pipe(refresh(lrserver));
});

gulp.task('bower_components', function () {
    return gulp.src('bower_components/**/*.*')
        .pipe(gulp.dest('www/bower_components'))
        .pipe(refresh(lrserver));
})

gulp.task('styles', function() {
    return gulp.src(paths.css)
        .pipe(autoprefixer("last 2 versions", "> 1%", "ie 8"))
        .pipe(gulp.dest('www/styles/'))
        .pipe(refresh(lrserver));
});

gulp.task('views', function() {
    return runSequence('views.index', 'views.templates');
});

gulp.task('views.index', function () {
    gulp.src('app/index.html')
        .pipe(inject(gulp.src(['www/scripts/**/*.js', 'www/styles/**/*.css']),
            { ignorePath: '/www', addRootSlash: false }))
        .pipe(inject(bowerFiles({ read: false }),
            { starttag: '<!-- inject:lib:{{ext}} -->', addRootSlash: false }))
        .pipe(gulp.dest('www/'))
        .pipe(refresh(lrserver));
});

gulp.task('views.templates', function () {
    gulp.src(paths.views)
        .pipe(gulp.dest('www/views/'))
        .pipe(refresh(lrserver));
});

/* watch specific tasks */

// these exist because addition or removal of js/css files need
// to retrigger index.html injection. we don't want to re-build
// on every change, but we need to rebuild index.html for these.

gulp.task('scripts.watch', function () {
    return runSequence('scripts', 'views.index');
});

gulp.task('styles.watch', function () {
    return runSequence('styles', 'views.index');
});


/* mobile build and emulation emulation */

gulp.task('ios', function () {
    runSequence('build', 'ios.build');
});

// genymotion needs to have your vm running (or a device plugged in and ready to go)
// before you run this

gulp.task('android', function () {
    runSequence('build', 'android.build');
});

gulp.task('ios.build', shell.task(['ionic build ios', 'ionic emulate ios']));

gulp.task('android.build', shell.task(['ionic build android', 'ionic run android']));
