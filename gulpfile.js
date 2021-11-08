var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
const ts = require('gulp-typescript')
const tsProject = ts.createProject('tsconfig.json');

var devFiles = ['./nerdamer.core.js','./Algebra.js', './Calculus.js', './Solve.js', './Extra.js'];

gulp.task('concat_all', function() {
    return gulp.src(devFiles)
        .pipe(concat('all.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./'));
});

gulp.task('build', function() {
    return tsProject.src()
        .pipe(tsProject())
        .js
        .pipe(concat('all.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./dist'));
});

gulp.task('watch', function() {
    gulp.watch(devFiles, gulp.series('concat_all'));
}); 