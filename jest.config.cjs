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
	collectCoverageFrom: [
		'<rootDir>/src/**/*.ts',
		'!<rootDir>/src/assets/**',
	],
	coverageProvider: 'v8',
	coverageDirectory: '<rootDir>/coverage',
	coverageReporters: ['text', 'lcov', 'json-summary'],
	coverageThreshold: {
		global: {
			branches: 86,
			functions: 81,
			lines: 87,
			statements: 87,
		},
	},
};
