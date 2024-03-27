import { readFileSync } from 'node:fs';
import * as JSONC from 'jsonc-parser';
import { pathsToModuleNameMapper } from 'ts-jest';
// eslint-disable-next-line import/extensions
import preset from 'ts-jest/presets/index.js';

const tsconfig = JSONC.parse(readFileSync('./tsconfig.json', 'utf-8'));

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
	...preset.defaultsESM,
	moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
		useESM: true,
		prefix: '<rootDir>',
	}),

	testMatch: [
		'**/*.spec.ts',
	],
	clearMocks: true,
	restoreMocks: true,
	setupFilesAfterEnv: [
		'./src/__tests__/redirect-tmpdir.ts',
		'./src/__tests__/matchers.ts',
	],

	collectCoverage: true,
	collectCoverageFrom: [
		'./src/**/*.ts',
	],
	coveragePathIgnorePatterns: [
		'./src/main.ts',
		'/__tests__/',
	],
	coverageThreshold: {
		global: {
			lines: 100,
			branches: 100,
			functions: 100,
			statements: 100,
		},
	},
};
