/**
 * 单元测试：infrastructure/logger.ts
 */

import { createLogger } from '../../../src/infrastructure/logger.js';

describe('infrastructure/logger', () => {
	// 保存原始环境变量
	const originalLogLevel = process.env.LOG_LEVEL;

	beforeAll(() => {
		// 测试前清除 LOG_LEVEL 环境变量，使用测试中指定的级别
		delete process.env.LOG_LEVEL;
	});

	afterAll(() => {
		// 所有测试后恢复原始环境变量
		if (originalLogLevel !== undefined) {
			process.env.LOG_LEVEL = originalLogLevel;
		}
	});

	describe('createLogger', () => {
		let stdoutWrite: typeof process.stdout.write;
		let stderrWrite: typeof process.stderr.write;
		let stdoutOutput: string[];
		let stderrOutput: string[];

		beforeEach(() => {
			stdoutOutput = [];
			stderrOutput = [];

			// Mock stdout.write
			stdoutWrite = process.stdout.write;
			process.stdout.write = ((chunk: string): boolean => {
				stdoutOutput.push(chunk);
				return true;
			}) as typeof process.stdout.write;

			// Mock stderr.write
			stderrWrite = process.stderr.write;
			process.stderr.write = ((chunk: string): boolean => {
				stderrOutput.push(chunk);
				return true;
			}) as typeof process.stderr.write;
		});

		afterEach(() => {
			process.stdout.write = stdoutWrite;
			process.stderr.write = stderrWrite;
		});

		// 用例1：创建合法的 logger
		it('使用有效组件名创建 logger', () => {
			const logger = createLogger('TestComponent');
			expect(logger).toBeDefined();
			expect(logger.debug).toBeInstanceOf(Function);
			expect(logger.info).toBeInstanceOf(Function);
			expect(logger.warn).toBeInstanceOf(Function);
			expect(logger.error).toBeInstanceOf(Function);
		});

		// 用例2：component 为空字符串应抛出 TypeError
		it('空组件名抛出 TypeError', () => {
			expect(() => createLogger('')).toThrow(TypeError);
			expect(() => createLogger('')).toThrow(/non-empty string/);
		});

		// 用例3：component 为空白字符串应抛出 TypeError
		it('纯空白组件名抛出 TypeError', () => {
			expect(() => createLogger('   ')).toThrow(TypeError);
		});

		// 用例4：component 为非字符串应抛出 TypeError
		it('非字符串组件名抛出 TypeError', () => {
			expect(() => createLogger(123 as any)).toThrow(TypeError);
		});

		// 用例5：未知的日志级别应抛出 RangeError
		it('未知日志级别抛出 RangeError', () => {
			expect(() => createLogger('TestComponent', 'invalid' as any)).toThrow(RangeError);
			expect(() => createLogger('TestComponent', 'invalid' as any)).toThrow(/Unknown log level/);
		});

		// 用例6：info 日志应输出到 stdout
		it('info 日志输出到 stdout', () => {
			const logger = createLogger('TestComponent', 'info');
			logger.info('Test message');

			expect(stdoutOutput).toHaveLength(1);
			const logEntry = JSON.parse(stdoutOutput[0]);

			expect(logEntry.level).toBe('info');
			expect(logEntry.component).toBe('TestComponent');
			expect(logEntry.msg).toBe('Test message');
			expect(logEntry.ts).toBeDefined();
		});

		// 用例7：error 日志应输出到 stderr
		it('error 日志输出到 stderr', () => {
			const logger = createLogger('TestComponent', 'info');
			logger.error('Error message');

			expect(stderrOutput).toHaveLength(1);
			const logEntry = JSON.parse(stderrOutput[0]);

			expect(logEntry.level).toBe('error');
			expect(logEntry.msg).toBe('Error message');
		});

		// 用例8：日志应包含额外字段
		it('日志包含额外字段', () => {
			const logger = createLogger('TestComponent', 'info');
			logger.info('Test message', { userId: '123', action: 'login' });

			const logEntry = JSON.parse(stdoutOutput[0]);
			expect(logEntry.extra).toEqual({ userId: '123', action: 'login' });
		});

		// 用例9：空的额外字段不应出现在日志中
		it('extra 为空对象时不包含该字段', () => {
			const logger = createLogger('TestComponent', 'info');
			logger.info('Test message', {});

			const logEntry = JSON.parse(stdoutOutput[0]);
			expect(logEntry.extra).toBeUndefined();
		});

		// 用例10：日志级别过滤 - debug 日志在 info 级别不应输出
		it('日志级别为 info 时过滤 debug 日志', () => {
			const logger = createLogger('TestComponent', 'info');
			logger.debug('Debug message');

			expect(stdoutOutput).toHaveLength(0);
		});

		// 用例11：日志级别过滤 - info 日志在 warn 级别不应输出
		it('日志级别为 warn 时过滤 info 日志', () => {
			const logger = createLogger('TestComponent', 'warn');
			logger.info('Info message');

			expect(stdoutOutput).toHaveLength(0);
		});

		// 用例12：日志级别过滤 - warn 和 error 在 warn 级别应输出
		it('日志级别为 warn 时输出 warn 和 error 日志', () => {
			const logger = createLogger('TestComponent', 'warn');
			logger.warn('Warn message');
			logger.error('Error message');

			expect(stdoutOutput).toHaveLength(1); // warn
			expect(stderrOutput).toHaveLength(1); // error
		});

		// 用例13：debug 级别应输出所有日志
		it('日志级别为 debug 时输出所有日志', () => {
			const logger = createLogger('TestComponent', 'debug');
			logger.debug('Debug message');
			logger.info('Info message');
			logger.warn('Warn message');
			logger.error('Error message');

			expect(stdoutOutput).toHaveLength(3); // debug, info, warn
			expect(stderrOutput).toHaveLength(1); // error
		});

		// 用例14：日志时间戳格式应为 ISO 字符串
		it('使用 ISO 时间戳格式', () => {
			const logger = createLogger('TestComponent', 'info');
			logger.info('Test message');

			const logEntry = JSON.parse(stdoutOutput[0]);
			const timestamp = new Date(logEntry.ts);
			expect(timestamp.toISOString()).toBe(logEntry.ts);
		});
	});
});
