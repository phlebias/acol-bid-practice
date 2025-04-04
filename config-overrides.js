const webpack = require('webpack');

module.exports = function override(config, env) {
  config.plugins.push(
    new webpack.DefinePlugin({
      'window.ADMIN_ENABLED': JSON.stringify(false)
    })
  );
  return config;
}