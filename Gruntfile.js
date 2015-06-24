module.exports = function(grunt) {
    require('jit-grunt')(grunt);
    grunt.initConfig({
        'less': {
            'development': {
                'options': {
                    'compress': true,
                    'yuicompress': true,
                    'optimization': 2
                },
                'files': {
                    'assets/css/styles.css': 'assets/less/styles.less'
                }
            }
        },
        'uglify': {
            'compressed': {
                'files': [{
                    'expand': true,
                    'src': '**/*.js',
                    'dest': 'assets/js',
                    'cwd': 'assets/js',
                    'ext': '.min.js'
                }],
                'options': {
                    'sourceMap': true
                }
            }
        },
        'autoprefixer': {
            'options': {
                'browsers': ['last 2 versions', 'ie 8', 'ie 9', '> 1%']
            },
            'main': {
                'expand': true,
                'flatten': true,
                'src': 'assets/css/*.css',
                'dest': 'assets/css/'
            }
        },
        'watch': {
            'less': {
                'files': ['assets/less/**/*.less'],
                'tasks': ['build:css'],
                'options': {
                    'nospawn': true
                }
            },
            'uglify': {
                'files': ['assets/js/**/*.js'],
                'tasks': ['build:js'],
                'options': {
                    'nospawn': true
                }
            }
        },
        'notify': {
            'less': {
                'options': {
                    'title': 'Task Complete (LESS)',
                    'message': 'LESS compiled and minified'
                },
            },
            'uglify': {
                'options': {
                    'title': 'Task Complete (JS)',
                    'message': 'JS compiled and minified'
                },
            }
        }
    });
    grunt.loadNpmTasks('grunt-notify');
    grunt.registerTask('default', ['watch']);
    grunt.registerTask('watch:css', ['watch:less']);
    grunt.registerTask('watch:js', ['watch:uglify']);
    grunt.registerTask('build', ['build:css', 'build:js']);
    grunt.registerTask('build:css', ['less', 'autoprefixer', 'notify:less']);
    grunt.registerTask('build:js', ['uglify', 'notify:uglify']);
};