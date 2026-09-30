import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/', '**/out/', '**/dist/', 'prototypes/', 'tooling/tests/fixtures/'],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat['recommended-latest'],
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: {
        project: [
          './tsconfig.json',
          './app/tsconfig.node.json',
          './app/tsconfig.web.json',
          './packages/*/tsconfig.json',
          './plugins/*/tsconfig.json',
          './templates/*/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
);
