// react-native-reanimated's mock still pulls in the real native worklets init chain,
// which has no jest story yet (brand-new package split). Stub every export as a no-op
// so the mock's own top-level init calls don't throw.
module.exports = new Proxy(
  {
    runOnJS: fn => fn,
    runOnUI: fn => fn,
    makeShareableCloneRecursive: value => value,
    serializableMappingCache: new WeakMap(),
  },
  {
    get: (target, prop) => (prop in target ? target[prop] : () => undefined),
  },
);
