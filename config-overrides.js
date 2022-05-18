const webpack = require("webpack");

module.exports = function override(config, env) {
  config.resolve.fallback = {
    buffer: require.resolve("buffer/"),
  };
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    })
  );

  config.module.rules = [...config.module.rules];

  return config;
};
