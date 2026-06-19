const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['src/tests/**/*.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    languageOptions: {
      globals: { ...globals.node },
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/tests/**/*.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    languageOptions: {
      globals: { ...globals.node },
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': 'off',
      // no-undef is superseded by TypeScript for typed code
      'no-undef': 'off',
    },
  },
];
