module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    'react-native-gesture-handler/jestSetup',
    '<rootDir>/jest.setup.js',
    '@shopify/react-native-skia/jestSetup.js',
  ],
  moduleNameMapper: {
    // The package's "react-native"/"module" exports point at an .mjs build the RN
    // Jest preset's transform regex doesn't match (js|ts|tsx only, no mjs) — point
    // Jest at its prebuilt CJS file instead rather than widening that shared regex.
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-async-storage|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-worklets|react-native-screens|react-native-safe-area-context|@shopify/react-native-skia|react-native-url-polyfill|lucide-react-native)/)',
  ],
};
