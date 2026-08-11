// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  // Formatting is Prettier's job (root .prettierrc, enforced by the pre-commit
  // hook) — this switches off the rules that would argue with it.
  prettierConfig,
  {
    ignores: [
      'dist/*',
      '.expo/*',
      // Generated from backend/openapi.json — see docs/adr/0007.
      'src/api/schema.d.ts',
    ],
  },
]);
