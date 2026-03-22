/* eslint-env node */
/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/spec'],
	testMatch: ['**/*.spec.ts'],
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
};
