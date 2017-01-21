
// gulp and utilities
import gulp from 'gulp'
import gutil from 'gulp-util'
import del from 'del'
import Sequence from 'run-sequence'
import watch from 'gulp-watch'
import lazypipe from 'lazypipe'

// script
import standard from 'gulp-standard'
import webpack from 'webpack'
import webpackConfig from './webpack.config.babel.js'

const sequence = Sequence.use(gulp)

// const inProduction = process.env.NODE_ENV === 'production' || process.argv.indexOf('-p') !== -1

let watchOpts = {
  readDelay: 500,
  verbose: true
}

const wpCompiler = webpack(webpackConfig)

function webpackTask (callback) {
  // run webpack
  wpCompiler.run(function (err, stats) {
    if (err) throw new gutil.PluginError('webpack', err)
    gutil.log('[webpack]\n', stats.toString({
      colors: true,
      hash: false,
      version: false,
      chunks: false,
      chunkModules: false
    }))
    callback()
  })
}

let lintPipe = lazypipe()
  .pipe(standard)
  .pipe(standard.reporter, 'default', { breakOnError: false })

// Cleanup task
gulp.task('clean', () => del([
  'app/build/'
]))

// Main tasks
gulp.task('webpack', webpackTask)
gulp.task('watch:webpack', () => {
  return watch(['src/js/**/*.js', 'src/style/**/*.css', 'src/shaders/**/*.glsl'], watchOpts, function () {
    return sequence('webpack')
  })
})

gulp.task('lint', () => {
  return gulp.src(['gulpfile.babel.js', 'webpack.config.babel.js', 'src/js/**/*.js']).pipe(lintPipe())
})
gulp.task('watch:lint', () => {
  return watch(['src/js/**/*.js', 'gulpfile.babel.js', 'webpack.config.babel.js'], watchOpts, function (file) {
    gulp.src(file.path).pipe(lintPipe())
  })
})

// Default task
gulp.task('default', (done) => {
  sequence('clean', 'lint', 'build', done)
})

gulp.task('build', (done) => {
  sequence('webpack', done)
})

// Watch task
gulp.task('watch', (done) => {
  sequence('default', ['watch:lint', 'watch:webpack'], done)
})
