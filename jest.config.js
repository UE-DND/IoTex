export default {
	preset: 'ts-jest/presets/default-esm',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests'],
	testMatch: ['**/*.test.ts', '**/*.spec.ts'],
	collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	coverageProvider: 'v8',
	silent: false,
	verbose: true,
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	extensionsToTreatAsEsm: ['.ts'],
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				useESM: true,
				tsconfig: {
					module: 'ESNext',
					moduleResolution: 'Node',
					esModuleInterop: true,
					isolatedModules: true,
					types: ['node', 'jest'],
				},
			},
		],
	},
	// 设置环境变量以控制日志级别
	setupFiles: ['<rootDir>/tests/setup.ts'],
};
