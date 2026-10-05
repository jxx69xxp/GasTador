// ponytail: Google ML Kit ships no arm64 iOS-simulator slice, so it can't build for the Apple Silicon simulator.
// Receipt OCR is Android-only for now; iOS scan falls back to manual entry (lib/scan.ts).
// Re-enable for iOS (delete this block) when shipping to real iPhones, or switch iOS to Apple's Vision framework.
module.exports = {
  dependencies: {
    '@react-native-ml-kit/text-recognition': { platforms: { ios: null } },
  },
};
