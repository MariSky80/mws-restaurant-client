module.exports = function(grunt) {

  grunt.initConfig({
    responsive_images: {
      large: {
        options: {
          engine: 'im',
          sizes: [{
            width: 800,
            suffix: '_large',
            quality: 80
          }]
        },
        files: [{
          expand: true,
          src: ['img/*.{gif,jpg,png}'],
          cwd: 'resources/',
          dest: 'dist/'
        }]
      },
      medium: {
        options: {
          engine: 'im',
          sizes: [{
            width: 512,
            suffix: '_medium',
            quality: 60
          }]
        },
        files: [{
          expand: true,
          src: ['img/*.{gif,jpg,png}'],
          cwd: 'resources/',
          dest: 'dist/'
        }]
      },
      small: {
        options: {
          engine: 'im',
          sizes: [{
            width: 380,
            suffix: '_small',
            quality: 30
          }]
        },
        files: [{
          expand: true,
          src: ['img/*.{gif,jpg,png}'],
          cwd: 'resources/',
          dest: 'dist/'
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-responsive-images');
  grunt.registerTask('create', ['responsive_images']);

};
