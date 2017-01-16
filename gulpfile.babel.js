
// gulp and utilities
import gulp from 'gulp'
import gutil from 'gulp-util'
import del from 'del'
import Sequence from 'run-sequence'
import watch from 'gulp-watch'
import lazypipe from 'lazypipe'
import filter from 'gulp-filter'

// script
import standard from 'gulp-standard'
import webpack from 'webpack'
import webpackConfig from './webpack.config.babel.js'

const sequence = Sequence.use(gulp)

const inProduction = process.env.NODE_ENV === 'production' || process.argv.indexOf('-p') !== -1

let watchOpts = {
  readDelay: 500,
  verbose: true
}

webpackConfig.forEach((c) => {
  if (inProduction) {
    delete c.devtool
    c.plugins.push(new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }))

    if (c.uglifyable) {
      c.plugins.push(new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
          screw_ie8: true
        },
        comments: false,
        mangle: {
          screw_ie8: true
        },
        screw_ie8: true,
        sourceMap: !!c.devtool
      }))
    }
  }
  c.plugins.push(new webpack.DefinePlugin({
    WEBJCS_VERSION: JSON.stringify(require('./package.json').version)
  }))
  delete c.uglifyable
})

const wpCompiler = webpack(webpackConfig)

function webpackTask (callback) {
  // run webpack
  wpCompiler.run(function (err, stats) {
    if (err) throw new gutil.PluginError('webpack', err)
    gutil.log('[webpack]', stats.toString({
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
  .pipe(filter, ['**/*', '!src/lib/**/*'])
  .pipe(standard)
  .pipe(standard.reporter, 'default', { breakOnError: false })

// Cleanup task
gulp.task('clean', () => del([
  'app/build/'
]))

// Main tasks
gulp.task('webpack', webpackTask)
gulp.task('watch:webpack', () => {
  return watch(['src/js/**/*.js', 'src/shaders/**/*.glsl'], watchOpts, function () {
    return sequence('webpack')
  })
})

gulp.task('lint', () => {
  return gulp.src(['gulpfile.babel.js', 'webpack.config.babel.js', 'src/**/*.js']).pipe(lintPipe())
})
gulp.task('watch:lint', () => {
  return watch(['src/**/*.js', 'gulpfile.babel.js', 'webpack.config.babel.js'], watchOpts, function (file) {
    gulp.src(file.path).pipe(lintPipe())
  })
})

// Default task
gulp.task('default', (done) => {
  sequence('clean', ['webpack', 'lint'], done)
})

// Watch task
gulp.task('watch', (done) => {
  sequence('default', ['watch:lint', 'watch:webpack'], done)
})
