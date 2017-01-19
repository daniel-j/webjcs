
import path from 'path'
import webpack from 'webpack'

let inProduction = process.env.NODE_ENV === 'production' || process.argv.indexOf('-p') !== -1

const bundleWebConfig = {
  entry: {
    web: './src/js/editor.js',
    loader: './src/js/loader.js'
  },

  output: {
    path: path.join(__dirname, '/'),
    filename: './app/build/[name].js'
  },

  target: 'web',

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          sourceMaps: true,
          presets: ['es2015']
        }
      },
      {
        test: /\.styl$/,
        loader: ['raw-loader', 'stylus-loader']
      },
      {
        test: /\.glsl$/,
        loader: 'webpack-glsl-loader'
      }
    ]
  },

  resolve: {
    extensions: ['.js', '.json', '.styl'],
    modules: [
      path.resolve('./src'),
      'node_modules'
    ],
    alias: {
      fs: require.resolve('./src/js/false.js'),
      electron: require.resolve('./src/js/false.js')
    }
  },

  plugins: [

  ],
  devtool: inProduction ? undefined : 'source-map'
}

const bundleElectronConfig = {
  entry: {
    background: './src/js/background.js',
    electron: './src/js/editor.js'
  },

  output: {
    path: path.join(__dirname, '/'),
    filename: './app/build/[name].js'
  },

  target: 'electron',

  node: {
    __dirname: false,
    __filename: false
  },

  module: {
    rules: [
      {
        test: /\.styl$/,
        loader: ['raw-loader', 'stylus-loader']
      },
      {
        test: /\.glsl$/,
        loader: 'webpack-glsl-loader'
      }
    ]
  },

  resolve: {
    extensions: ['.js', '.json', '.styl'],
    modules: [
      path.resolve('./src'),
      'node_modules'
    ]
  },

  plugins: [
    new webpack.IgnorePlugin(/^\.\/components\/menu$/),
    new webpack.IgnorePlugin(/\/data\/.*?\.(j2l|j2t)$/)
  ],
  devtool: inProduction ? undefined : 'source-map'
}

const configs = [bundleWebConfig, bundleElectronConfig]

if (inProduction) {
  bundleWebConfig.plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false,
      screw_ie8: true
    },
    comments: false,
    mangle: {
      screw_ie8: true
    },
    screw_ie8: true,
    sourceMap: false
  }))

  bundleElectronConfig.module.rules.push({
    test: /\.js$/,
    loader: 'babel-loader',
    // exclude: /node_modules/,
    options: {
      sourceMaps: false,
      presets: ['babili']
    }
  })
}

configs.forEach((c) => {
  if (inProduction) {
    c.plugins.push(new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }))
  }
  c.plugins.push(new webpack.DefinePlugin({
    WEBJCS_VERSION: JSON.stringify(require('./package.json').version),
    WEBGL_INSPECTOR: process.env.WEBGL_INSPECTOR === '1'
  }))
})

export default configs
