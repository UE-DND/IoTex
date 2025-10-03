/**
 * 单元测试：storage/state-store.ts
 */

import { createInMemoryStateStore } from '../../../src/storage/state-store.js';

describe('storage/state-store', () => {
	describe('createInMemoryStateStore', () => {
		// 用例1：创建存储实例
		it('创建存储实例', () => {
			const store = createInMemoryStateStore();
			expect(store).toBeDefined();
			expect(store.get).toBeInstanceOf(Function);
			expect(store.set).toBeInstanceOf(Function);
			expect(store.patch).toBeInstanceOf(Function);
			expect(store.keys).toBeInstanceOf(Function);
		});

		describe('get', () => {
			// 用例2：获取不存在的键返回 undefined
			it('获取不存在的键返回 undefined', async () => {
				const store = createInMemoryStateStore();
				const result = await store.get('nonexistent');
				expect(result).toBeUndefined();
			});

			// 用例3：获取已设置的值
			it('获取已设置的值', async () => {
				const store = createInMemoryStateStore();
				await store.set('key1', 'value1');
				const result = await store.get('key1');
				expect(result).toBe('value1');
			});

			// 用例4：空键应抛出 TypeError
			it('空键应抛出 TypeError', async () => {
				const store = createInMemoryStateStore();
				await expect(store.get('')).rejects.toThrow(TypeError);
				await expect(store.get('')).rejects.toThrow(/non-empty string/);
			});

			// 用例5：空白键应抛出 TypeError
			it('空白键应抛出 TypeError', async () => {
				const store = createInMemoryStateStore();
				await expect(store.get('   ')).rejects.toThrow(TypeError);
			});

			// 用例6：非字符串键应抛出 TypeError
			it('非字符串键应抛出 TypeError', async () => {
				const store = createInMemoryStateStore();
				await expect(store.get(123 as any)).rejects.toThrow(TypeError);
			});

			// 用例7：支持泛型类型
			it('支持泛型类型', async () => {
				const store = createInMemoryStateStore();
				interface TestData {
					name: string;
					age: number;
				}
				await store.set('user', { name: 'Alice', age: 30 });
				const result = await store.get<TestData>('user');
				expect(result).toEqual({ name: 'Alice', age: 30 });
			});
		});

		describe('set', () => {
			// 用例8：设置字符串值
			it('设置字符串值', async () => {
				const store = createInMemoryStateStore();
				await store.set('key1', 'value1');
				const result = await store.get('key1');
				expect(result).toBe('value1');
			});

			// 用例9：设置数字值
			it('设置数字值', async () => {
				const store = createInMemoryStateStore();
				await store.set('count', 42);
				const result = await store.get('count');
				expect(result).toBe(42);
			});

			// 用例10：设置对象值
			it('设置对象值', async () => {
				const store = createInMemoryStateStore();
				const obj = { a: 1, b: 2 };
				await store.set('data', obj);
				const result = await store.get('data');
				expect(result).toEqual(obj);
			});

			// 用例11：设置 null 值
			it('设置 null 值', async () => {
				const store = createInMemoryStateStore();
				await store.set('key1', null);
				const result = await store.get('key1');
				expect(result).toBeNull();
			});

			// 用例12：覆盖现有值
			it('覆盖现有值', async () => {
				const store = createInMemoryStateStore();
				await store.set('key1', 'old');
				await store.set('key1', 'new');
				const result = await store.get('key1');
				expect(result).toBe('new');
			});

			// 用例13：空键应抛出 TypeError
			it('空键应抛出 TypeError', async () => {
				const store = createInMemoryStateStore();
				await expect(store.set('', 'value')).rejects.toThrow(TypeError);
			});
		});

		describe('patch', () => {
			// 用例14：部分更新对象
			it('部分更新对象', async () => {
				const store = createInMemoryStateStore();
				interface User extends Record<string, unknown> {
					name: string;
					age: number;
					email?: string;
				}

				await store.set('user', { name: 'Alice', age: 30 });
				const result = await store.patch<User>('user', { age: 31 });

				expect(result).toEqual({ name: 'Alice', age: 31 });
			});

			// 用例15：patch 不存在的键应创建新对象
			it('patch 不存在的键应创建新对象', async () => {
				const store = createInMemoryStateStore();
				const result = await store.patch('newkey', { a: 1 });
				expect(result).toEqual({ a: 1 });
			});

			// 用例16：patch 应保持不可变性
			it('patch 应保持不可变性', async () => {
				const store = createInMemoryStateStore();
				const original = { name: 'Alice', age: 30 };
				await store.set('user', original);

				await store.patch('user', { age: 31 });

				// 原始对象不应被修改
				expect(original).toEqual({ name: 'Alice', age: 30 });
			});

			// 用例17：空键应抛出 TypeError
			it('空键应抛出 TypeError', async () => {
				const store = createInMemoryStateStore();
				await expect(store.patch('', { a: 1 })).rejects.toThrow(TypeError);
			});

			// 用例18：非对象 partial 应抛出 TypeError
			it('非对象 partial 应抛出 TypeError', async () => {
				const store = createInMemoryStateStore();
				await expect(store.patch('key', 'string' as any)).rejects.toThrow(TypeError);
			});

			// 用例19：嵌套对象合并
			it('嵌套对象合并', async () => {
				const store = createInMemoryStateStore();
				await store.set('config', { db: { host: 'localhost', port: 5432 } });
				const result = await store.patch('config', {
					db: { port: 5433 },
				});

				expect(result).toEqual({ db: { port: 5433 } });
			});
		});

		describe('keys', () => {
			// 用例20：无键时返回空数组
			it('无键时返回空数组', async () => {
				const store = createInMemoryStateStore();
				const result = await store.keys();
				expect(result).toEqual([]);
			});

			// 用例21：返回所有键
			it('返回所有键', async () => {
				const store = createInMemoryStateStore();
				await store.set('key1', 'value1');
				await store.set('key2', 'value2');
				await store.set('key3', 'value3');

				const result = await store.keys();
				expect(result).toHaveLength(3);
				expect(result).toContain('key1');
				expect(result).toContain('key2');
				expect(result).toContain('key3');
			});

			// 用例22：按前缀过滤键
			it('按前缀过滤键', async () => {
				const store = createInMemoryStateStore();
				await store.set('device:1', 'data1');
				await store.set('device:2', 'data2');
				await store.set('config:main', 'config');

				const result = await store.keys('device:');
				expect(result).toHaveLength(2);
				expect(result).toContain('device:1');
				expect(result).toContain('device:2');
			});

			// 用例23：空前缀返回所有键
			it('空前缀返回所有键', async () => {
				const store = createInMemoryStateStore();
				await store.set('key1', 'value1');
				await store.set('key2', 'value2');

				const result = await store.keys('');
				expect(result).toHaveLength(2);
			});

			// 用例24：无匹配前缀返回空数组
			it('无匹配前缀返回空数组', async () => {
				const store = createInMemoryStateStore();
				await store.set('device:1', 'data1');

				const result = await store.keys('user:');
				expect(result).toEqual([]);
			});
		});

		describe('Integration', () => {
			// 用例25：多个操作组合
			it('多个操作组合', async () => {
				const store = createInMemoryStateStore();

				await store.set('device:1', { id: '1', status: 'on' });
				await store.set('device:2', { id: '2', status: 'off' });

				const keys = await store.keys('device:');
				expect(keys).toHaveLength(2);

				await store.patch('device:1', { status: 'off' });
				const updated = await store.get('device:1');
				expect(updated).toEqual({ id: '1', status: 'off' });
			});

			// 用例26：独立存储实例
			it('独立存储实例', async () => {
				const store1 = createInMemoryStateStore();
				const store2 = createInMemoryStateStore();

				await store1.set('key', 'value1');
				await store2.set('key', 'value2');

				const result1 = await store1.get('key');
				const result2 = await store2.get('key');

				expect(result1).toBe('value1');
				expect(result2).toBe('value2');
			});
		});
	});
});
