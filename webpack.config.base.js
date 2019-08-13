const CopyWebpackPlugin = require('copy-webpack-plugin')
const Path = require('path')

module.exports = {
  entry: './src/index.ts',
  output: {
    ecmaVersion: 5, // Google Apps Script doesn't support ES2015+ syntax
    path: Path.join(__dirname, 'build'),
    libraryTarget: 'this'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: Path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        use: ['babel-loader', 'eslint-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json', '.ts']
  },
  plugins: [
    new CopyWebpackPlugin(['./static/_.js', './src/appsscript.json'])
  ]
}
