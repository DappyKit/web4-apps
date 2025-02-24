import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'

export default tseslint.config(
    {ignores: ['dist', 'coverage', '**/*.css', '**/*.css.map']},
    // Frontend configuration
    {
        settings: { react: { version: '18.3' } },
        extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                project: ['./tsconfig.app.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            react,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,
            'object-curly-spacing': ["error", "always"],
            "indent": ["error", 2],
            'react-refresh/only-export-components': [
                'warn',
                {allowConstantExport: true},
            ],
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
        },
    },
    // Backend configuration
    {
        extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
        files: ['backend/**/*.ts'],
        ignores: ['backend/jest.config.ts'],
        languageOptions: {
            ecmaVersion: 2020,
            parserOptions: {
                project: ['./backend/tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            'object-curly-spacing': ["error", "always"],
            "indent": ["error", 2],
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
                'ignoreRestSiblings': true,
                'caughtErrors': 'none'
            }],
            '@typescript-eslint/no-misused-promises': ['error', {
                'checksVoidReturn': false
            }],
            '@typescript-eslint/restrict-template-expressions': ['error', {
                'allowNumber': true,
                'allowBoolean': true,
                'allowAny': false,
                'allowNullish': true,
            }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        },
    },
    // Config files configuration
    {
        extends: [js.configs.recommended],
        files: ['backend/jest.config.ts'],
        languageOptions: {
            ecmaVersion: 2020,
        },
    },
)
