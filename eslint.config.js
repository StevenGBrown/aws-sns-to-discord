import { includeIgnoreFile } from '@eslint/compat'
import eslintJs from '@eslint/js'
import { defineConfig } from 'eslint/config'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import eslintPluginSecurity from 'eslint-plugin-security'
import typescriptEslint from 'typescript-eslint'
import * as path from 'node:path'

/**
 * @see https://eslint.org/docs/latest/use/configure/
 */
export default defineConfig(
  // https://eslint.org
  eslintJs.configs.recommended,

  // https://typescript-eslint.io
  typescriptEslint.configs.strictTypeChecked,
  typescriptEslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowAny: false, allowBoolean: false, allowNullish: false },
      ],
    },
  },

  // https://github.com/eslint-community/eslint-plugin-security
  eslintPluginSecurity.configs.recommended,

  // https://github.com/prettier/eslint-plugin-prettier
  // This goes last to allow the plugin to override other configs
  eslintPluginPrettierRecommended,

  // Ignores
  {
    ignores: [
      // Config files
      '.*rc.js',
      '*.config.js',
    ],
  },
  includeIgnoreFile(path.resolve(import.meta.dirname, '.gitignore'))
)
