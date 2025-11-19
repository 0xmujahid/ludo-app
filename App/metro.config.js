// metro.config.js
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
module.exports = (async () => {
  // Get the default configuration from React Native
  const defaultConfig = await getDefaultConfig(__dirname);
  const {
    resolver: {sourceExts, assetExts},
  } = defaultConfig;

  // Custom configuration
  const customConfig = {
    transformer: {
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
      // The getTransformOptions can often be simplified or removed if defaults are fine.
      // Metro's default for inlineRequires is true in recent versions.
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true, // This is often the default, but doesn't hurt to specify
        },
      }),
    },
    resolver: {
      // Ensure PNGs and other image assets are still treated as assets
      assetExts: assetExts.filter(ext => ext !== 'svg'),
      // Add 'svg' to sourceExts so react-native-svg-transformer can process it
      sourceExts: [...sourceExts, 'svg'],
    },
  };

  return mergeConfig(defaultConfig, customConfig);
})();
