/**
 * 单元测试：core/command-queue.ts
 */

import { describe, it, expect } from '@jest/globals';
import { createCommandQueue } from '../../../src/core/command-queue.js';

describe('core/command-queue', () => {
	describe('createCommandQueue', () => {
		// 用例1：创建队列实例
		it('创建队列实例', () => {
			const queue = createCommandQueue();
			expect(queue).toBeDefined();
			expect(queue.enqueue).toBeInstanceOf(Function);
			expect(queue.dequeue).toBeInstanceOf(Function);
			expect(queue.size).toBeInstanceOf(Function);
		});

		// 用例2：默认最大容量
		it('默认最大容量', () => {
			const queue = createCommandQueue();
			expect(queue.size()).toBe(0);

			// 填充到接近最大容量
			for (let i = 0; i < 1000; i++) {
				queue.enqueue({ id: i });
			}

			expect(queue.size()).toBe(1000);
			expect(() => queue.enqueue({ id: 1001 })).toThrow(RangeError);
		});

		// 用例3：自定义最大容量
		it('自定义最大容量', () => {
			const queue = createCommandQueue(5);

			for (let i = 0; i < 5; i++) {
				queue.enqueue({ id: i });
			}

			expect(queue.size()).toBe(5);
			expect(() => queue.enqueue({ id: 6 })).toThrow();
		});

		// 用例4：零或负数最大容量应抛出 RangeError
		it('零或负数最大容量应抛出 RangeError', () => {
			expect(() => createCommandQueue(0)).toThrow(RangeError);
			expect(() => createCommandQueue(-1)).toThrow(RangeError);
			expect(() => createCommandQueue(0)).toThrow(/positive integer/);
		});

		// 用例5：小数最大容量应抛出 RangeError
		it('小数最大容量应抛出 RangeError', () => {
			expect(() => createCommandQueue(5.5)).toThrow(RangeError);
		});

		// 用例6：NaN 最大容量应抛出 RangeError
		it('NaN 最大容量应抛出 RangeError', () => {
			expect(() => createCommandQueue(NaN)).toThrow(RangeError);
		});

		describe('enqueue', () => {
			// 用例7：入队命令
			it('入队命令', () => {
				const queue = createCommandQueue();
				const cmd = { deviceId: 'device1', action: 'turnOn' };

				const size = queue.enqueue(cmd);

				expect(size).toBe(1);
				expect(queue.size()).toBe(1);
			});

			// 用例8：入队多个命令
			it('入队多个命令', () => {
				const queue = createCommandQueue();

				queue.enqueue({ id: 1 });
				queue.enqueue({ id: 2 });
				const size = queue.enqueue({ id: 3 });

				expect(size).toBe(3);
				expect(queue.size()).toBe(3);
			});

			// 用例9：队列满时应抛出 RangeError
			it('队列满时应抛出 RangeError', () => {
				const queue = createCommandQueue(2);

				queue.enqueue({ id: 1 });
				queue.enqueue({ id: 2 });

				expect(() => queue.enqueue({ id: 3 })).toThrow(RangeError);
				expect(() => queue.enqueue({ id: 3 })).toThrow(/queue is full/);
			});

			// 用例10：入队各种类型的值
			it('入队各种类型的值', () => {
				const queue = createCommandQueue();

				queue.enqueue('string');
				queue.enqueue(123);
				queue.enqueue(true);
				queue.enqueue(null);
				queue.enqueue({ obj: 'value' });
				queue.enqueue([1, 2, 3]);

				expect(queue.size()).toBe(6);
			});

			// 用例11：返回正确的队列大小
			it('返回正确的队列大小', () => {
				const queue = createCommandQueue();

				expect(queue.enqueue({ id: 1 })).toBe(1);
				expect(queue.enqueue({ id: 2 })).toBe(2);
				expect(queue.enqueue({ id: 3 })).toBe(3);
			});
		});

		describe('dequeue', () => {
			// 用例12：出队命令
			it('出队命令', () => {
				const queue = createCommandQueue();
				const cmd = { id: 1 };

				queue.enqueue(cmd);
				const dequeued = queue.dequeue();

				expect(dequeued).toBe(cmd);
				expect(queue.size()).toBe(0);
			});

			// 用例13：空队列出队返回 undefined
			it('空队列出队返回 undefined', () => {
				const queue = createCommandQueue();
				const result = queue.dequeue();
				expect(result).toBeUndefined();
			});

			// 用例14：FIFO 顺序
			it('FIFO 顺序', () => {
				const queue = createCommandQueue();

				queue.enqueue({ id: 1 });
				queue.enqueue({ id: 2 });
				queue.enqueue({ id: 3 });

				expect(queue.dequeue()).toEqual({ id: 1 });
				expect(queue.dequeue()).toEqual({ id: 2 });
				expect(queue.dequeue()).toEqual({ id: 3 });
			});

			// 用例15：出队后队列大小减少
			it('出队后队列大小减少', () => {
				const queue = createCommandQueue();

				queue.enqueue({ id: 1 });
				queue.enqueue({ id: 2 });
				expect(queue.size()).toBe(2);

				queue.dequeue();
				expect(queue.size()).toBe(1);

				queue.dequeue();
				expect(queue.size()).toBe(0);
			});

			// 用例16：多次出队空队列
			it('多次出队空队列', () => {
				const queue = createCommandQueue();

				expect(queue.dequeue()).toBeUndefined();
				expect(queue.dequeue()).toBeUndefined();
				expect(queue.dequeue()).toBeUndefined();
			});
		});

		describe('size', () => {
			// 用例17：初始大小为零
			it('初始大小为零', () => {
				const queue = createCommandQueue();
				expect(queue.size()).toBe(0);
			});

			// 用例18：大小反映当前元素数量
			it('大小反映当前元素数量', () => {
				const queue = createCommandQueue();

				queue.enqueue({ id: 1 });
				expect(queue.size()).toBe(1);

				queue.enqueue({ id: 2 });
				expect(queue.size()).toBe(2);

				queue.dequeue();
				expect(queue.size()).toBe(1);

				queue.dequeue();
				expect(queue.size()).toBe(0);
			});
		});

		describe('Integration', () => {
			// 用例19：入队出队组合操作
			it('入队出队组合操作', () => {
				const queue = createCommandQueue(5);

				queue.enqueue({ id: 1 });
				queue.enqueue({ id: 2 });
				expect(queue.dequeue()).toEqual({ id: 1 });

				queue.enqueue({ id: 3 });
				queue.enqueue({ id: 4 });
				expect(queue.size()).toBe(3);

				expect(queue.dequeue()).toEqual({ id: 2 });
				expect(queue.dequeue()).toEqual({ id: 3 });
				expect(queue.size()).toBe(1);
			});

			// 用例20：填满、清空、再填满
			it('填满、清空、再填满', () => {
				const queue = createCommandQueue(3);

				// 填满
				queue.enqueue({ id: 1 });
				queue.enqueue({ id: 2 });
				queue.enqueue({ id: 3 });
				expect(() => queue.enqueue({ id: 4 })).toThrow();

				// 清空
				queue.dequeue();
				queue.dequeue();
				queue.dequeue();
				expect(queue.size()).toBe(0);

				// 再填满
				queue.enqueue({ id: 5 });
				queue.enqueue({ id: 6 });
				queue.enqueue({ id: 7 });
				expect(queue.size()).toBe(3);

				expect(queue.dequeue()).toEqual({ id: 5 });
			});

			// 用例21：大批量命令处理
			it('大批量命令处理', () => {
				const queue = createCommandQueue(10000);

				// 入队 1000 个命令
				for (let i = 0; i < 1000; i++) {
					queue.enqueue({ id: i });
				}
				expect(queue.size()).toBe(1000);

				// 出队并验证顺序
				for (let i = 0; i < 1000; i++) {
					const cmd = queue.dequeue();
					expect(cmd).toEqual({ id: i });
				}
				expect(queue.size()).toBe(0);
			});

			// 用例22：独立的队列实例
			it('独立的队列实例', () => {
				const queue1 = createCommandQueue(5);
				const queue2 = createCommandQueue(5);

				queue1.enqueue({ id: 1 });
				queue2.enqueue({ id: 2 });

				expect(queue1.dequeue()).toEqual({ id: 1 });
				expect(queue2.dequeue()).toEqual({ id: 2 });

				expect(queue1.size()).toBe(0);
				expect(queue2.size()).toBe(0);
			});
		});
	});
});
