import base from '@arbendium/eslint-config-base';

export default [
	...base,
	{
		rules: {
			'no-underscore-dangle': 'off',
			'import/no-cycle': 'off'
		}
	},
	{
		files: ['*.js', 'bench/**', 'test/**'],
		rules: {
			'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
			'no-console': 'off',
			'no-underscore-dangle': 'off'
		}
	}
];
