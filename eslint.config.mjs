import path from 'node:path';
import {fileURLToPath} from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import stylistic from '@stylistic/eslint-plugin';
import {FlatCompat} from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const javascriptFiles = ['Resources/Public/JavaScript/**/*.js', 'eslint.config.mjs'];
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends(
    'eslint:recommended',
    'plugin:wc/recommended',
    'plugin:lit/recommended',
  ).map(config => ({...config, files: javascriptFiles})),
  {
    ...stylistic.configs.recommended,
    files: javascriptFiles,
  },
  {
    files: javascriptFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2023,
        ModuleStateStorage: 'readonly',
        TYPO3: 'readonly',
      },
    },
    rules: {
      '@stylistic/operator-linebreak': ['error', 'before', {overrides: {'=': 'after', '?': 'after'}}],
      '@stylistic/quotes': ['error', 'single', {avoidEscape: true, allowTemplateLiterals: 'avoidEscape'}],
      '@stylistic/brace-style': ['error', '1tbs', {allowSingleLine: true}],
      '@stylistic/indent': ['error', 2],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/object-curly-spacing': ['error', 'never'],
      'no-unused-vars': ['error', {args: 'none'}],
      'semi': 'off',
      'wc/no-self-class': 'off',
    },
    settings: {
      wc: {
        elementBaseClasses: ['LitElement'],
      },
    },
  },
];
