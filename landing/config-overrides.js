const { aliasDangerous } = require('react-app-rewire-alias/lib/aliasDangerous');
const { getWebpackAlias } = require('@rocket-scripts/utils');
const path = require('path');

module.exports = {
  webpack: (config) => {
    config.module.rules = config.module.rules.map((rule) => {
      if (Array.isArray(rule.oneOf)) {
        return {
          ...rule,
          oneOf: [
            {
              test: /\.(graphql|gql)$/,
              exclude: /node_modules/,
              use: [require.resolve('raw-loader')],
            },
            {
              test: /\.(glsl|vs|fs|vert|frag)$/,
              exclude: /node_modules/,
              use: [
                require.resolve('raw-loader'),
                require.resolve('glslify-loader'),
              ],
            },
            ...rule.oneOf,
          ],
        };
      }

      return rule;
    });

    aliasDangerous({
      ...getWebpackAlias(path.resolve(__dirname, '../packages')),
      ...getWebpackAlias(path.resolve(__dirname, '../base')),
      ...getWebpackAlias(__dirname),
      env: path.join(__dirname, 'src/env.ts'),
    })(config);

    return config;
  },
  jest: (config) => {
    config.transform = {
      '\\.(graphql|gql)$': require.resolve(
        '@ssen/jest-transform/transform/text',
      ),
      ...config.transform,
    };

    config.modulePaths.push(
      '<rootDir>/src/',
      '<rootDir>/../base/src/',
      '<rootDir>/../packages/src/',
    );

    return config;
  },
};
