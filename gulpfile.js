const fileinclude = require('gulp-file-include');
const markdown = require('markdown');
var runSequence = require('gulp4-run-sequence');
const gulp = require('gulp');

gulp.task('build', function (callback) {
    runSequence('build-pages', callback);
});

gulp.task('build-pages', function () {
    return gulp.src([
        '_pages/index.html',
        '_pages/tests.html',
        '_pages/viewer.html'
    ])
        .pipe(fileinclude({
            filters: {
                markdown: markdown.parse
            }
        }))
        .pipe(gulp.dest('./'));
});
