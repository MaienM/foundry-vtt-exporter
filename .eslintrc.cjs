const mochaPlugin = require('eslint-plugin-mocha');

module.exports = {
	extends: [
		'@maienm/eslint-config',
	],
	rules: {
		'no-continue': 'off',
		'no-restricted-syntax': 'off',
		'generator-star-spacing': 'off',
		'jsdoc/require-yields': 'off',
		'@typescript-eslint/indent': 'off',
		'object-curly-newline': 'off',
		'unicorn/prefer-node-protocol': 'error',
	},
	overrides: [
		{
			files: [
				'src/**/*.spec.ts',
				'src/__tests__/**',
			],
			plugins: ['jest'],
			extends: [
				'plugin:jest/recommended',
			],
			rules: {
				// Disable mocha rules as we're not using mocha.
				...(Object.fromEntries(Object.keys(mochaPlugin.rules).map((key) => [`mocha/${key}`, 'off']))),
			},
		},
	],
};
