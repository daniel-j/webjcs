
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
  devtool: 'source-map',
  uglifyable: true
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
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          sourceMaps: !inProduction,
          presets: inProduction ? ['node7', 'babili'] : ['node7']
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
    ]
  },

  plugins: [
    new webpack.IgnorePlugin(/^\.\/components\/menu$/),
    new webpack.IgnorePlugin(/\/data\/.*?\.(j2l|j2t)$/)
  ],
  devtool: 'source-map',
  uglifyable: false
}

export default [bundleWebConfig, bundleElectronConfig]
