import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/hashes/**', '**/node_modules/**'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
  eslintConfigPrettier
);
