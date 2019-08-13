const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
  mode: 'production',
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            properties: false // Prevent conversion of property accesses to dot notation that would lead to emission of reserved keywords
          },
          output: {
            keep_quoted_props: true // Prevent conversion of property accesses to dot notation that would lead to emission of reserved keywords
          }
        }
      })
    ]
  }
}
