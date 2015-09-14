module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        uglify: {
            my_target: {
                files: {
                    'build/Algebra.min.js': ['Algebra.js'],
                    'build/Calculus.min.js': ['Calculus.js'],
                    'build/Solve.min.js': ['Solve.js'],
                    'build/Special.min.js': ['Special.js'],
                    'build/nerdamer.core.min.js': ['nerdamer.core.js'],
                    'build/all.min.js': ['nerdamer.core.js','Algebra.js','Calculus.js','Solve.js','Special.js']
                }
            }
        },
        qunit: {
            files: ['tests/test.html']
        }
    });

    // Load plugins
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Task to run tests
    grunt.registerTask('test', 'qunit');
    grunt.registerTask('build', 'uglify');
};
