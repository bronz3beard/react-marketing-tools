import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', '.loop-out']),
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    // Build scripts run in Node; declare the two globals they use rather than pulling in a globals package.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  {
    // 0.4.x public types ship in dist/types/index.d.ts; fixing these rules would change the published
    // type declarations in a patch release. Remove this block when the 0.4 API is deleted (batch B6 / VS-07).
    files: ['lib/types/index.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  // Must stay last: turns off stylistic rules that Prettier owns.
  prettier,
])
