const path = require('path');
const webpack = require('webpack');

/** @type {import("next").NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^virtual:/,
      })
    );

    config.resolve.alias['@agent-native/core'] = path.resolve(
      __dirname,
      'src/lib/agent-native-mock.ts'
    );

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        child_process: false,
        net: false,
        tls: false,
      };

      config.resolve.alias = {
        ...config.resolve.alias,
        'better-sqlite3': false,
        'bindings': false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
