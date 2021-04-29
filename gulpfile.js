var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var devFiles = ['./nerdamer.core.js','./Algebra.js', './Calculus.js', './Solve.js', './Extra.js'];

gulp.task('concat_all', function() {
    return gulp.src(devFiles)
        .pipe(concat('all.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
  gulp.watch(devFiles, gulp.series('concat_all'));
}); 