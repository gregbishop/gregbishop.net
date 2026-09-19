import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', '.astro/**', '.wrangler/**'] },
  js.configs.recommended,
  { files: ['src/**/*.mjs', 'src/**/*.js', 'tests/**', 'features/**', 'eslint.config.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { rules: { 'no-empty': ['error', { allowEmptyCatch: true }] } },
];
