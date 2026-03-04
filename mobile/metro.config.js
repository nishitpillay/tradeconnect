const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);
const sharedDistEntry = path.resolve(__dirname, 'vendor/tradeconnect-shared/dist/index.js');

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Force axios to use its browser build instead of the Node.js build
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
      type: 'sourceFile',
    };
  }
  if (moduleName === '@tradeconnect/shared') {
    return {
      filePath: sharedDistEntry,
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
