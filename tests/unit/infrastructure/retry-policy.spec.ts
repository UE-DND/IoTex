/**
 * 单元测试：infrastructure/retry-policy.ts
 */

import { jest, describe, it, expect } from '@jest/globals';
import { withRetry } from '../../../src/infrastructure/retry-policy.js';

describe('infrastructure/retry-policy', () => {
	describe('withRetry', () => {
		// 用例1：成功执行不重试
		it('成功执行不重试', async () => {
			const fn = jest.fn<() => Promise<number>>().mockResolvedValue(42);
			const result = await withRetry(fn);

			expect(result).toBe(42);
			expect(fn).toHaveBeenCalledTimes(1);
		});

		// 用例2：失败后重试成功
		it('失败后重试成功', async () => {
			const fn = jest
				.fn<() => Promise<number>>()
				.mockRejectedValueOnce(new Error('First fail'))
				.mockRejectedValueOnce(new Error('Second fail'))
				.mockResolvedValue(42);

			const result = await withRetry(fn, { retries: 3 });

			expect(result).toBe(42);
			expect(fn).toHaveBeenCalledTimes(3);
		});

		// 用例3：超出重试次数后抛出错误
		it('超出重试次数后抛出错误', async () => {
			const error = new Error('Persistent error');
			const fn = jest.fn<() => Promise<never>>().mockRejectedValue(error);

			await expect(withRetry(fn, { retries: 2 })).rejects.toThrow('Persistent error');
			expect(fn).toHaveBeenCalledTimes(3); // 1 初始 + 2 重试
		});

		// 用例4：零次重试应只执行一次
		it('零次重试应只执行一次', async () => {
			const error = new Error('Test error');
			const fn = jest.fn<() => Promise<never>>().mockRejectedValue(error);

			await expect(withRetry(fn, { retries: 0 })).rejects.toThrow('Test error');
			expect(fn).toHaveBeenCalledTimes(1);
		});

		// 用例5：负数重试应抛出 RangeError
		it('负数重试应抛出 RangeError', async () => {
			const fn = jest.fn<() => Promise<number>>().mockResolvedValue(42);

			await expect(withRetry(fn, { retries: -1 })).rejects.toThrow(RangeError);
			await expect(withRetry(fn, { retries: -1 })).rejects.toThrow(/non-negative integer/);
		});

		// 用例6：小数重试次数应抛出 RangeError
		it('小数重试次数应抛出 RangeError', async () => {
			const fn = jest.fn<() => Promise<number>>().mockResolvedValue(42);

			await expect(withRetry(fn, { retries: 2.5 })).rejects.toThrow(RangeError);
		});

		// 用例7：零或负数 baseMs 应抛出 RangeError
		it('零或负数 baseMs 应抛出 RangeError', async () => {
			const fn = jest.fn<() => Promise<number>>().mockResolvedValue(42);

			await expect(withRetry(fn, { baseMs: 0 })).rejects.toThrow(RangeError);
			await expect(withRetry(fn, { baseMs: -100 })).rejects.toThrow(RangeError);
		});

		// 用例8：无限大 baseMs 应抛出 RangeError
		it('无限大 baseMs 应抛出 RangeError', async () => {
			const fn = jest.fn<() => Promise<number>>().mockResolvedValue(42);

			await expect(withRetry(fn, { baseMs: Infinity })).rejects.toThrow(RangeError);
		});

		// 用例9：零或负数 maxMs 应抛出 RangeError
		it('零或负数 maxMs 应抛出 RangeError', async () => {
			const fn = jest.fn<() => Promise<number>>().mockResolvedValue(42);

			await expect(withRetry(fn, { maxMs: 0 })).rejects.toThrow(RangeError);
			await expect(withRetry(fn, { maxMs: -1000 })).rejects.toThrow(RangeError);
		});

		// 用例10：重试回调应被调用
		it('重试回调应被调用', async () => {
			const error = new Error('Test error');
			const fn = jest
				.fn<() => Promise<number>>()
				.mockRejectedValueOnce(error)
				.mockResolvedValue(42);

			const onRetry = jest.fn();

			await withRetry(fn, { retries: 2, onRetry });

			expect(onRetry).toHaveBeenCalledTimes(1);
			expect(onRetry).toHaveBeenCalledWith(error, 1, expect.any(Number));
		});

		// 用例11：多次重试回调应被多次调用
		it('多次重试回调应被多次调用', async () => {
			const fn = jest
				.fn<() => Promise<number>>()
				.mockRejectedValueOnce(new Error('Error 1'))
				.mockRejectedValueOnce(new Error('Error 2'))
				.mockResolvedValue(42);

			const onRetry = jest.fn();

			await withRetry(fn, { retries: 3, onRetry });

			expect(onRetry).toHaveBeenCalledTimes(2);
		});

		// 用例12：回调抛出错误不应影响重试
		it('回调抛出错误不应影响重试', async () => {
			const fn = jest
				.fn<() => Promise<number>>()
				.mockRejectedValueOnce(new Error('Test error'))
				.mockResolvedValue(42);

			const onRetry = jest.fn().mockImplementation(() => {
				throw new Error('Callback error');
			});

			const result = await withRetry(fn, { retries: 2, onRetry });

			expect(result).toBe(42);
			expect(fn).toHaveBeenCalledTimes(2);
		});

		// 用例13：延迟应增加（指数退避）
		it('延迟应增加（指数退避）', async () => {
			const fn = jest.fn<() => Promise<never>>().mockRejectedValue(new Error('Test error'));
			const delays: number[] = [];

			const onRetry = jest.fn<(err: unknown, attempt: number, delayMs: number) => void>(
				(_, __, delayMs) => {
					delays.push(delayMs);
				}
			);

			await expect(
				withRetry(fn, {
					retries: 3,
					baseMs: 100,
					jitter: false,
					onRetry,
				})
			).rejects.toThrow();

			expect(delays).toHaveLength(3);
			// 指数退避：100, 200, 400
			expect(delays[0]).toBe(100);
			expect(delays[1]).toBe(200);
			expect(delays[2]).toBe(400);
		});

		// 用例14：延迟不应超过 maxMs
		it('延迟不应超过 maxMs', async () => {
			const fn = jest.fn<() => Promise<never>>().mockRejectedValue(new Error('Test error'));
			const delays: number[] = [];

			const onRetry = jest.fn<(err: unknown, attempt: number, delayMs: number) => void>(
				(_, __, delayMs) => {
					delays.push(delayMs);
				}
			);

			await expect(
				withRetry(fn, {
					retries: 5,
					baseMs: 100,
					maxMs: 300,
					jitter: false,
					onRetry,
				})
			).rejects.toThrow();

			// 延迟序列：100, 200, 300, 300, 300（被 maxMs 限制）
			expect(delays[0]).toBe(100);
			expect(delays[1]).toBe(200);
			expect(delays[2]).toBe(300);
			expect(delays[3]).toBe(300);
			expect(delays[4]).toBe(300);
		});

		// 用例15：抖动应在合理范围内
		it('抖动应在合理范围内', async () => {
			const fn = jest.fn<() => Promise<never>>().mockRejectedValue(new Error('Test error'));
			const delays: number[] = [];

			const onRetry = jest.fn<(err: unknown, attempt: number, delayMs: number) => void>(
				(_, __, delayMs) => {
					delays.push(delayMs);
				}
			);

			await expect(
				withRetry(fn, {
					retries: 3,
					baseMs: 100,
					jitter: true,
					onRetry,
				})
			).rejects.toThrow();

			// 抖动范围：基础值的 80%-120%
			expect(delays[0]).toBeGreaterThanOrEqual(80);
			expect(delays[0]).toBeLessThanOrEqual(120);
		});

		// 用例16：禁用抖动应精确匹配
		it('禁用抖动应精确匹配', async () => {
			const fn = jest.fn<() => Promise<never>>().mockRejectedValue(new Error('Test error'));
			const delays: number[] = [];

			const onRetry = jest.fn<(err: unknown, attempt: number, delayMs: number) => void>(
				(_, __, delayMs) => {
					delays.push(delayMs);
				}
			);

			await expect(
				withRetry(fn, {
					retries: 2,
					baseMs: 100,
					jitter: false,
					onRetry,
				})
			).rejects.toThrow();

			expect(delays[0]).toBe(100);
			expect(delays[1]).toBe(200);
		});

		// 用例17：默认参数应正常工作
		it('默认参数应正常工作', async () => {
			const fn = jest
				.fn<() => Promise<number>>()
				.mockRejectedValueOnce(new Error('First fail'))
				.mockResolvedValue(42);

			const result = await withRetry(fn);

			expect(result).toBe(42);
			expect(fn).toHaveBeenCalledTimes(2);
		});

		// 用例18：处理非 Error 类型的异常
		it('处理非 Error 类型的异常', async () => {
			const fn = jest.fn<() => Promise<never>>().mockRejectedValue('String error');

			await expect(withRetry(fn, { retries: 1 })).rejects.toBe('String error');
		});

		// 用例19：实际等待延迟时间
		it('实际等待延迟时间', async () => {
			const fn = jest
				.fn<() => Promise<number>>()
				.mockRejectedValueOnce(new Error('Test error'))
				.mockResolvedValue(42);

			const startTime = Date.now();
			await withRetry(fn, { retries: 1, baseMs: 50, jitter: false });
			const elapsed = Date.now() - startTime;

			// 应该至少等待 50ms
			expect(elapsed).toBeGreaterThanOrEqual(40); // 留一些余量
		});

		// 用例20：最后一次失败不应触发回调
		it('最后一次失败不应触发回调', async () => {
			const fn = jest.fn<() => Promise<never>>().mockRejectedValue(new Error('Test error'));
			const onRetry = jest.fn();

			await expect(withRetry(fn, { retries: 2, onRetry })).rejects.toThrow();

			// 应调用 2 次（前两次失败），最后一次不调用
			expect(onRetry).toHaveBeenCalledTimes(2);
		});
	});
});
