import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import testingLibrary from 'eslint-plugin-testing-library';
import tanstackQuery from '@tanstack/eslint-plugin-query';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'testing-library': testingLibrary,
      '@tanstack/query': tanstackQuery,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@tanstack/query/exhaustive-deps': 'error',
      // SDD FE §2.1: dilarang axios — semua HTTP lewat lib/http.ts → apiFetch().
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'axios', message: "Dilarang pakai axios. Pakai apiFetch() dari '@/lib/http'." }],
        },
      ],
      // SDD FE §7.1: dilarang hex literal di komponen — token saja.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "Literal[value=/#[0-9a-fA-F]{3,8}\\b/], TemplateElement[value.cooked=/#[0-9a-fA-F]{3,8}\\b/]",
          message: 'Dilarang hex literal. Pakai token dari theme/tokens.css.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'test/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      ...testingLibrary.configs.react.rules,
    },
  }
);
