const baseConfig = require('./webpack.config.base.js')
const merge = require('webpack-merge')

module.exports = (env) => merge(baseConfig,
  env ? require(`./webpack.config.${env}.js`) : {})
