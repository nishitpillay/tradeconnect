const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const sharedPackageRoot = path.resolve(workspaceRoot, 'packages', 'shared');
const config = getDefaultConfig(projectRoot);

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.watchFolders = [sharedPackageRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;

// Force axios to use its browser build instead of the Node.js build
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/axios/dist/browser/axios.cjs'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
