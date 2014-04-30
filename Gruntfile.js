

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        paths: {
            src: {
                app: {
                    clinic: 'src/clinic.js',
                    chw: 'src/chw.js',
                    personal: 'src/personal.js'
                },
                clinic: [
                    'src/index.js',
                    'src/utils.js',
                    '<%= paths.src.app.clinic %>',
                    'src/init.js'
                ],
                chw: [
                    'src/index.js',
                    'src/utils.js',
                    '<%= paths.src.app.chw %>',
                    'src/init.js'
                ],
                personal: [
                    'src/index.js',
                    'src/utils.js',
                    '<%= paths.src.app.personal %>',
                    'src/init.js'
                ],
                all: [
                    'src/**/*.js'
                ]
            },
            dest: {
                clinic: 'go-app-clinic.js',
                chw: 'go-app-chw.js',
                personal: 'go-app-personal.js'
            },
            test: {
                clinic: [
                    'test/setup.js',
                    'src/utils.js',
                    '<%= paths.src.app.clinic %>',
                    'test/clinic.test.js'
                ],
                chw: [
                    'test/setup.js',
                    'src/utils.js',
                    '<%= paths.src.app.chw %>',
                    'test/chw.test.js'
                ],
                personal: [
                    'test/setup.js',
                    'src/utils.js',
                    '<%= paths.src.app.personal %>',
                    'test/personal.test.js'
                ]
            }
        },

        jshint: {
            options: {jshintrc: '.jshintrc'},
            all: [
                'Gruntfile.js',
                '<%= paths.src.all %>'
            ]
        },
 
        watch: {
            src: {
                files: ['<%= paths.src.all %>'],
                tasks: ['build']
            }
        },

        concat: {
            clinic: {
                src: ['<%= paths.src.clinic %>'],
                dest: '<%= paths.dest.clinic %>'
            },
            chw: {
                src: ['<%= paths.src.chw %>'],
                dest: '<%= paths.dest.chw %>'
            },
            personal: {
                src: ['<%= paths.src.personal %>'],
                dest: '<%= paths.dest.personal %>'
            }
        },

        mochaTest: {
            options: {
                reporter: 'spec'
            },
            test_clinic: {
                src: ['<%= paths.test.clinic %>']
            },
            test_chw: {
                src: ['<%= paths.test.chw %>']
            },
            test_personal: {
                src: ['<%= paths.test.personal %>']
            }
        }
    });

    grunt.registerTask('test', [
        'jshint',
        'build',
        'mochaTest'
    ]);

    grunt.registerTask('build', [
        'concat',
    ]);

    grunt.registerTask('default', [
        'build',
        'test'
    ]);
};