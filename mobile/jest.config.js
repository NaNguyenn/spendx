/**
 * Logic-only unit tests: pure functions that exist client-side (amount input
 * formatting, form validation, URL resolution). Component tests against mocked
 * APIs and simulator E2E are deliberately out of scope — see the spec's testing
 * decisions in issue #1.
 *
 * The jest-expo preset is what lets a tested helper import from react-native or
 * expo-* without exploding on an untransformed module.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
};
