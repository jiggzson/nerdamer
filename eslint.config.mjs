import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import perfectionist from 'eslint-plugin-perfectionist';

// Global ignores must be a standalone config object
export default tseslint.config(
	{
		ignores: ['**/*.config.js', '!**/eslint.config.js', 'dist/**', 'node_modules/**'],
	},

	eslint.configs.recommended,
	...tseslint.configs.recommended,

	// Source files
	{
		files: ['src/**/*.ts'],
		plugins: {
			perfectionist,
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'prefer-const': [
				'error',
				{
					ignoreReadBeforeAssign: true,
				},
			],
			'no-empty': ['error', { allowEmptyCatch: true }],
			curly: ['error', 'all'],
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

			// Perfectionist: import/export ordering
			'perfectionist/sort-imports': [
				'error',
				{
					type: 'natural',
					order: 'asc',
					groups: [
						'builtin',
						'external',
						'internal',
						'parent',
						'sibling',
						'index',
						'type',
					],
				},
			],
			'perfectionist/sort-exports': [
				'error',
				{
					type: 'natural',
					order: 'asc',
				},
			],

			// Perfectionist: class member ordering (statics first, then constructor, then the rest)
			'perfectionist/sort-classes': [
				'error',
				{
					type: 'natural',
					order: 'asc',
					groups: [
						'static-property',
						'protected-property',
						'private-property',
						'property',
						'constructor',
						'static-method',
						'protected-method',
						'private-method',
						'method',
					],
				},
			],
		},
	},

	// Spec / test files
	{
		files: ['spec/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
		languageOptions: {
			globals: globals.jasmine,
		},
	},
	{
		files: ['**/*.cjs'],
		languageOptions: {
			sourceType: 'commonjs',
			globals: {
				...globals.node,
				...globals.amd,
			},
		},
	}
);
