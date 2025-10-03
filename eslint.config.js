import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
	{
		ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'docs/**'],
	},
	js.configs.all,
	...tseslint.configs.all,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			import: importPlugin,
		},
		settings: {
			'import/resolver': {
				typescript: {
					alwaysTryTypes: true,
					project: './tsconfig.json',
				},
			},
		},
		rules: {
			'@typescript-eslint/explicit-function-return-type': 'error',
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
			'@typescript-eslint/no-unsafe-return': 'error',
			'@typescript-eslint/no-unsafe-argument': 'error',
			'@typescript-eslint/strict-boolean-expressions': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/no-unnecessary-type-assertion': 'error',
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowNumber: true,
					allowBoolean: true,
					allowNullish: false,
				},
			],
			'@typescript-eslint/no-base-to-string': 'error',
			'@typescript-eslint/no-confusing-void-expression': 'error',
			'@typescript-eslint/prefer-readonly': 'error',
			'@typescript-eslint/prefer-readonly-parameter-types': 'off',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-unnecessary-condition': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					disallowTypeAnnotations: true,
				},
			],
			'@typescript-eslint/consistent-type-exports': [
				'error',
				{
					fixMixedExportsWithInlineTypeSpecifier: true,
				},
			],
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'default',
					format: ['camelCase'],
					leadingUnderscore: 'forbid',
					trailingUnderscore: 'forbid',
				},
				{
					selector: 'variable',
					format: ['camelCase', 'UPPER_CASE'],
				},
				{
					selector: 'typeLike',
					format: ['PascalCase'],
				},
				{
					selector: 'interface',
					format: ['PascalCase'],
					custom: {
						regex: '^I[A-Z]',
						match: false,
					},
				},
				{
					selector: 'enumMember',
					format: ['UPPER_CASE'],
				},
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/parameter-properties': [
				'error',
				{
					prefer: 'parameter-property',
				},
			],

			'no-console': ['error', { allow: ['warn', 'error'] }],
			'no-debugger': 'error',
			'no-alert': 'error',
			'no-var': 'error',
			'prefer-const': 'error',
			'prefer-arrow-callback': 'error',
			'arrow-body-style': ['error', 'as-needed'],
			'object-shorthand': ['error', 'always'],
			'prefer-template': 'error',
			'prefer-destructuring': [
				'error',
				{
					array: true,
					object: true,
				},
			],
			'no-magic-numbers': 'off',
			'@typescript-eslint/no-magic-numbers': [
				'error',
				{
					ignoreEnums: true,
					ignoreNumericLiteralTypes: true,
					ignoreReadonlyClassProperties: true,
					ignore: [0, 1, -1],
				},
			],
			'max-lines': [
				'error',
				{
					max: 500,
					skipBlankLines: true,
					skipComments: true,
				},
			],
			'max-lines-per-function': [
				'error',
				{
					max: 100,
					skipBlankLines: true,
					skipComments: true,
				},
			],
			complexity: ['error', 10],
			'max-depth': ['error', 4],
			'max-params': ['error', 4],
			'max-statements': ['error', 15],

			'import/no-unresolved': 'error',
			'import/named': 'error',
			'import/default': 'error',
			'import/namespace': 'error',
			'import/no-absolute-path': 'error',
			'import/no-self-import': 'error',
			'import/no-cycle': 'error',
			'import/no-useless-path-segments': 'error',
			'import/no-deprecated': 'warn',
			'import/no-mutable-exports': 'error',
			'import/first': 'error',
			'import/no-duplicates': 'error',
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
					'newlines-between': 'always',
					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
				},
			],
			'import/newline-after-import': 'error',

			'one-var': ['error', 'never'],
			'no-multiple-empty-lines': ['error', { max: 1 }],
			'padded-blocks': ['error', 'never'],
			'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],

			'max-len': 'off',
			indent: 'off',
			'@typescript-eslint/indent': 'off',
			quotes: 'off',
			'@typescript-eslint/quotes': 'off',
			semi: 'off',
			'@typescript-eslint/semi': 'off',
			'comma-dangle': 'off',
			'@typescript-eslint/comma-dangle': 'off',
			'space-before-function-paren': 'off',
			'@typescript-eslint/space-before-function-paren': 'off',

			'id-length': 'off',
			'no-ternary': 'off',
			'no-undefined': 'off',
			'sort-imports': 'off',
			'sort-keys': 'off',
			'capitalized-comments': 'off',
			'multiline-comment-style': 'off',
			'line-comment-position': 'off',
			'no-inline-comments': 'off',
			'func-style': 'off',
			'no-mixed-operators': 'off',
			'init-declarations': 'off',
			'@typescript-eslint/init-declarations': 'off',
			'max-statements-per-line': ['error', { max: 1 }],
			'one-var-declaration-per-line': ['error', 'always'],
			'func-names': ['error', 'as-needed'],
			'no-useless-return': 'error',
			'require-unicode-regexp': 'off',
			'prefer-named-capture-group': 'off',
		},
	},
	{
		files: ['**/*.test.ts', '**/*.spec.ts'],
		rules: {
			'@typescript-eslint/no-magic-numbers': 'off',
			'max-lines-per-function': 'off',
			'max-statements': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
	{
		files: ['**/*.config.js', 'eslint.config.js', 'jest.config.js'],
		languageOptions: {
			parserOptions: {
				project: false,
			},
		},
		rules: {
			'@typescript-eslint/no-var-requires': 'off',
			'@typescript-eslint/no-require-imports': 'off',
		},
	}
);
