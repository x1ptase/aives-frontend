const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Expo SDK packages can have nested native dependencies (expo-asset, etc.).
// Keep the default hierarchical lookup within this standalone app.
config.resolver.nodeModulesPaths = [require('path').resolve(__dirname, 'node_modules')];
module.exports = config;
