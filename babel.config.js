module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv', { moduleName: '@env' }],
    // reanimated plugin must stay last
    'react-native-reanimated/plugin',
  ],
};
