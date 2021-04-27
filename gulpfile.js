var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

gulp.task('concat_all', function() {
    return gulp.src(['./nerdamer.core.js','./Algebra.js', './Calculus.js', './Solve.js', './Extra.js'])
        .pipe(concat('all.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./'));
});