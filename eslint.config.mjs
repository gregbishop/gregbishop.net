import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', '.astro/**', '.wrangler/**', 'src/data/banner.mjs'] },
  js.configs.recommended,
  { files: ['src/scripts/cli.js'], languageOptions: { globals: globals.browser } },
  { files: ['worker/**', 'src/**/*.mjs', 'src/**/*.js', 'scripts/**', 'tests/**', 'features/**', 'eslint.config.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { rules: { 'no-empty': ['error', { allowEmptyCatch: true }] } },
];
