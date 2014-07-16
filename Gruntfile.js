

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
                    personal: 'src/personal.js',
                    optout: 'src/optout.js',
                    smsinbound: 'src/smsinbound.js'
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
                optout: [
                    'src/index.js',
                    'src/utils.js',
                    '<%= paths.src.app.optout %>',
                    'src/init.js'
                ],
                smsinbound: [
                    'src/index.js',
                    'src/utils.js',
                    '<%= paths.src.app.smsinbound %>',
                    'src/init.js'
                ],
                all: [
                    'src/**/*.js'
                ]
            },
            dest: {
                clinic: 'go-app-clinic.js',
                chw: 'go-app-chw.js',
                personal: 'go-app-personal.js',
                optout: 'go-app-optout.js',
                smsinbound: 'go-app-smsinbound.js'
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
                ],
                optout: [
                    'test/setup.js',
                    'src/utils.js',
                    '<%= paths.src.app.optout %>',
                    'test/optout.test.js'
                ],
                smsinbound: [
                    'test/setup.js',
                    'src/utils.js',
                    '<%= paths.src.app.smsinbound %>',
                    'test/smsinbound.test.js'
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
            },
            optout: {
                src: ['<%= paths.src.optout %>'],
                dest: '<%= paths.dest.optout %>'
            },
            smsinbound: {
                src: ['<%= paths.src.smsinbound %>'],
                dest: '<%= paths.dest.smsinbound %>'
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
            },
            test_optout: {
                src: ['<%= paths.test.optout %>']
            },
            test_smsinbound: {
                src: ['<%= paths.test.smsinbound %>']
            }
        }
    });

    grunt.registerTask('test', [
        'jshint',
        'build',
        'mochaTest'
    ]);

    grunt.registerTask('build', [
        'concat'
    ]);

    grunt.registerTask('default', [
        'build',
        'test'
    ]);
};