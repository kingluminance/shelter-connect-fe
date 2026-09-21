module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    'react-native-gesture-handler/jestSetup',
    '@shopify/react-native-skia/jestSetup.js',
  ],
  moduleNameMapper: {
    '^react-native-reanimated$': 'react-native-reanimated/mock',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-worklets|react-native-screens|react-native-safe-area-context|@shopify/react-native-skia)/)',
  ],
};
