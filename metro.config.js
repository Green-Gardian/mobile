const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for resolving modules with custom extensions
config.resolver.sourceExts.push('jsx');

// Add path mapping support
config.resolver.alias = {
  '@': path.resolve(__dirname, './'),
};

module.exports = config;
