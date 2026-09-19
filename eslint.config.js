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
  // Must stay last: turns off stylistic rules that Prettier owns.
  prettier,
])
