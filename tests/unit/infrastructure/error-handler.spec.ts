/**
 * 单元测试：infrastructure/error-handler.ts
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { normalizeError, wrapAsync } from '../../../src/infrastructure/error-handler.js';
import { createLogger } from '../../../src/infrastructure/logger.js';

describe('infrastructure/error-handler', () => {
	describe('normalizeError', () => {
		// 用例1：规范化 Error 实例
		it('规范化 Error 实例', () => {
			const error = new Error('Test error');
			const normalized = normalizeError(error);

			expect(normalized.name).toBe('Error');
			expect(normalized.message).toBe('Test error');
			expect(normalized.stack).toBeDefined();
		});

		// 用例2：规范化带 cause 的错误
		it('存在 cause 时包含该字段', () => {
			const cause = new Error('Root cause');
			const error = new Error('Wrapped error', { cause });
			const normalized = normalizeError(error);

			expect(normalized.cause).toBe(cause);
		});

		// 用例3：包含组件名称
		it('包含组件名称', () => {
			const error = new Error('Test error');
			const normalized = normalizeError(error, 'TestComponent');

			expect(normalized.component).toBe('TestComponent');
		});

		// 用例4：规范化字符串错误
		it('规范化字符串错误', () => {
			const normalized = normalizeError('String error');

			expect(normalized.name).toBe('UnknownError');
			expect(normalized.message).toBe('String error');
		});

		// 用例5：规范化空字符串
		it('处理空字符串', () => {
			const normalized = normalizeError('');

			expect(normalized.name).toBe('UnknownError');
			expect(normalized.message).toBe('');
		});

		// 用例6：规范化数字
		it('规范化数字错误', () => {
			const normalized = normalizeError(42);

			expect(normalized.name).toBe('UnknownError');
			expect(normalized.message).toBe('42');
			expect(normalized.cause).toBe(42);
		});

		// 用例7：规范化 null
		it('处理 null', () => {
			const normalized = normalizeError(null);

			expect(normalized.name).toBe('UnknownError');
			expect(normalized.message).toBe('An unknown error occurred');
		});

		// 用例8：规范化 undefined
		it('处理 undefined', () => {
			const normalized = normalizeError(undefined);

			expect(normalized.name).toBe('UnknownError');
			expect(normalized.message).toBe('An unknown error occurred');
		});

		// 用例9：规范化对象（带 message 属性）
		it('从对象提取 message', () => {
			const obj = { message: 'Object error', code: 500 };
			const normalized = normalizeError(obj);

			expect(normalized.message).toBe('Object error');
			expect(normalized.cause).toBe(obj);
		});

		// 用例10：规范化普通对象
		it('序列化普通对象', () => {
			const obj = { code: 500, data: 'test' };
			const normalized = normalizeError(obj);

			expect(normalized.message).toContain('500');
			expect(normalized.message).toContain('test');
		});

		// 用例11：处理自定义错误类型
		it('处理自定义错误类型', () => {
			class CustomError extends Error {
				code: number;
				constructor(message: string, code: number) {
					super(message);
					this.name = 'CustomError';
					this.code = code;
				}
			}

			const error = new CustomError('Custom error', 404);
			const normalized = normalizeError(error);

			expect(normalized.name).toBe('CustomError');
			expect(normalized.message).toBe('Custom error');
		});

		// 用例12：空组件名称不应包含
		it('不包含空组件名', () => {
			const error = new Error('Test error');
			const normalized = normalizeError(error, '');

			expect(normalized.component).toBeUndefined();
		});

		// 用例13：处理不可序列化的对象（循环引用）
		it('处理循环引用对象', () => {
			const obj: any = { name: 'test' };
			obj.self = obj; // 创建循环引用

			const normalized = normalizeError(obj);

			expect(normalized.name).toBe('UnknownError');
			expect(normalized.message).toBe('Error cannot be converted to string');
			expect(normalized.cause).toBe(obj);
		});

		// 用例14：处理带组件名的非Error对象
		it('非 Error 对象包含组件名', () => {
			const obj = { code: 500 };
			const normalized = normalizeError(obj, 'TestComponent');

			expect(normalized.component).toBe('TestComponent');
		});
	});

	describe('wrapAsync', () => {
		let logger: ReturnType<typeof createLogger>;
		let errorSpy: jest.SpiedFunction<ReturnType<typeof createLogger>['error']>;

		beforeEach(() => {
			logger = createLogger('TestComponent', 'error');
			errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			errorSpy.mockRestore();
		});

		// 用例13：成功执行异步函数
		it('成功执行异步函数', async () => {
			const fn: () => Promise<number> = jest.fn(async () => 42);
			const result = await wrapAsync(fn);

			expect(result).toBe(42);
			expect(fn).toHaveBeenCalledTimes(1);
		});

		// 用例14：捕获并记录错误
		it('捕获并记录错误', async () => {
			const error = new Error('Test error');
			const fn: () => Promise<unknown> = jest.fn(async () => {
				throw error;
			});

			await expect(wrapAsync(fn, logger)).rejects.toThrow('Test error');
			expect(errorSpy).toHaveBeenCalledWith('Async operation failed', {
				error: expect.objectContaining({
					name: 'Error',
					message: 'Test error',
				}),
			});
		});

		// 用例15：没有 logger 时不记录
		it('未提供 logger 时不记录', async () => {
			const error = new Error('Test error');
			const fn: () => Promise<unknown> = jest.fn(async () => {
				throw error;
			});

			await expect(wrapAsync(fn)).rejects.toThrow('Test error');
			expect(errorSpy).not.toHaveBeenCalled();
		});

		// 用例16：重新抛出 Error 实例
		it('重新抛出 Error 实例', async () => {
			const error = new Error('Test error');
			const fn: () => Promise<unknown> = jest.fn(async () => {
				throw error;
			});

			await expect(wrapAsync(fn, logger)).rejects.toBe(error);
		});

		// 用例17：将字符串错误转换为 Error
		it('将字符串错误转换为 Error', async () => {
			const fn: () => Promise<unknown> = jest.fn(async () => {
				throw 'String error';
			});

			await expect(wrapAsync(fn, logger)).rejects.toThrow('String error');
		});

		// 用例18：处理非 Error 异常
		it('处理非 Error 异常', async () => {
			const fn: () => Promise<unknown> = jest.fn(async () => {
				throw { code: 500 } as const;
			});

			await expect(wrapAsync(fn, logger)).rejects.toThrow();
		});

		// 用例19：保持 Error cause
		it('保留错误 cause', async () => {
			const cause = new Error('Root cause');
			const fn: () => Promise<unknown> = jest.fn(async () => {
				throw cause;
			});

			try {
				await wrapAsync(fn, logger);
				fail('Should have thrown');
			} catch (err) {
				expect(err).toBe(cause);
			}
		});

		// 用例20：处理 Promise rejection
		it('处理 Promise rejection', async () => {
			const fn = async (): Promise<number> => {
				throw new Error('Async error');
			};

			await expect(wrapAsync(fn, logger)).rejects.toThrow('Async error');
		});
	});
});
