/**
 * 单元测试：storage/json-store.ts
 */

import { existsSync } from 'node:fs';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createJsonStateStore } from '../../../src/storage/json-store.js';

describe('storage/json-store', () => {
	const testDir = join(process.cwd(), 'test-tmp-json-store');

	beforeEach(async () => {
		// 清理测试目录
		if (existsSync(testDir)) {
			await rm(testDir, { recursive: true, force: true });
		}
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		// 清理测试目录
		if (existsSync(testDir)) {
			await rm(testDir, { recursive: true, force: true });
		}
	});

	describe('createJsonStateStore', () => {
		// 用例1：空 filePath 应抛出 TypeError
		it('空 filePath 应抛出 TypeError', () => {
			expect(() => createJsonStateStore('')).toThrow(TypeError);
			expect(() => createJsonStateStore('')).toThrow(/non-empty string/);
		});

		// 用例2：空白 filePath 应抛出 TypeError
		it('空白 filePath 应抛出 TypeError', () => {
			expect(() => createJsonStateStore('   ')).toThrow(TypeError);
		});

		// 用例3：非字符串 filePath 应抛出 TypeError
		it('非字符串 filePath 应抛出 TypeError', () => {
			expect(() => createJsonStateStore(123 as any)).toThrow(TypeError);
		});

		// 用例4：创建新文件
		it('创建新文件', async () => {
			const filePath = join(testDir, 'store.json');
			const store = createJsonStateStore(filePath);

			await store.set('key1', 'value1');

			expect(existsSync(filePath)).toBe(true);
		});

		// 用例5：读取现有文件
		it('读取现有文件', async () => {
			const filePath = join(testDir, 'store.json');
			await writeFile(filePath, JSON.stringify({ key1: 'value1' }), 'utf-8');

			const store = createJsonStateStore(filePath);
			const result = await store.get('key1');

			expect(result).toBe('value1');
		});

		// 用例6：无效 JSON 应抛出 SyntaxError
		it('无效 JSON 应抛出 SyntaxError', async () => {
			const filePath = join(testDir, 'invalid.json');
			await writeFile(filePath, 'invalid json', 'utf-8');

			const store = createJsonStateStore(filePath);
			await expect(store.get('key1')).rejects.toThrow(SyntaxError);
		});

		// 用例7：JSON 根不是对象应抛出 TypeError
		it('JSON 根不是对象应抛出 TypeError', async () => {
			const filePath = join(testDir, 'array.json');
			await writeFile(filePath, '[]', 'utf-8');

			const store = createJsonStateStore(filePath);
			await expect(store.get('key1')).rejects.toThrow(TypeError);
			await expect(store.get('key1')).rejects.toThrow(/object/);
		});

		describe('get', () => {
			// 用例8：获取不存在的键
			it('获取不存在的键', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);
				const result = await store.get('nonexistent');
				expect(result).toBeUndefined();
			});

			// 用例9：获取已设置的值
			it('获取已设置的值', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);
				await store.set('key1', 'value1');
				const result = await store.get('key1');
				expect(result).toBe('value1');
			});

			// 用例10：空键应抛出 TypeError
			it('空键应抛出 TypeError', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);
				await expect(store.get('')).rejects.toThrow(TypeError);
			});
		});

		describe('set', () => {
			// 用例11：设置值并持久化
			it('设置值并持久化', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);
				await store.set('key1', 'value1');

				// 创建新实例验证持久化
				const store2 = createJsonStateStore(filePath);
				const result = await store2.get('key1');
				expect(result).toBe('value1');
			});

			// 用例12：原子写入（默认）
			it('原子写入（默认）', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);
				await store.set('key1', 'value1');

				// 临时文件不应存在
				expect(existsSync(`${filePath}.tmp`)).toBe(false);
			});

			// 用例13：禁用原子写入
			it('禁用原子写入', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath, { atomic: false });
				await store.set('key1', 'value1');

				const store2 = createJsonStateStore(filePath);
				const result = await store2.get('key1');
				expect(result).toBe('value1');
			});

			// 用例14：覆盖现有值
			it('覆盖现有值', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);
				await store.set('key1', 'old');
				await store.set('key1', 'new');
				const result = await store.get('key1');
				expect(result).toBe('new');
			});

			// 用例15：空键应抛出 TypeError
			it('设置时空键应抛出 TypeError', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);
				await expect(store.set('', 'value')).rejects.toThrow(TypeError);
			});
		});

		describe('patch', () => {
			// 用例16：部分更新对象
			it('部分更新对象', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);

				await store.set('user', { name: 'Alice', age: 30 });
				const result = await store.patch('user', { age: 31 });

				expect(result).toEqual({ name: 'Alice', age: 31 });
			});

			// 用例17：patch 并持久化
			it('patch 并持久化', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);

				await store.set('user', { name: 'Alice', age: 30 });
				await store.patch('user', { age: 31 });

				// 新实例验证持久化
				const store2 = createJsonStateStore(filePath);
				const result = await store2.get('user');
				expect(result).toEqual({ name: 'Alice', age: 31 });
			});

			// 用例18：空键应抛出 TypeError
			it('patch 时传入空键应抛出 TypeError', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);
				await expect(store.patch('', { a: 1 })).rejects.toThrow(TypeError);
			});

			// 用例19：非对象 partial 应抛出 TypeError
			it('非对象 partial 应抛出 TypeError', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);
				await expect(store.patch('key', 'string' as any)).rejects.toThrow(TypeError);
			});
		});

		describe('keys', () => {
			// 用例20：返回所有键
			it('返回所有键', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);

				await store.set('key1', 'value1');
				await store.set('key2', 'value2');

				const result = await store.keys();
				expect(result).toHaveLength(2);
				expect(result).toContain('key1');
				expect(result).toContain('key2');
			});

			// 用例21：按前缀过滤
			it('按前缀过滤', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);

				await store.set('device:1', 'data1');
				await store.set('device:2', 'data2');
				await store.set('config:main', 'config');

				const result = await store.keys('device:');
				expect(result).toHaveLength(2);
				expect(result).toContain('device:1');
				expect(result).toContain('device:2');
			});

			// 用例22：空前缀返回所有键
			it('空前缀返回所有键', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);

				await store.set('key1', 'value1');
				await store.set('key2', 'value2');

				const result = await store.keys('');
				expect(result).toHaveLength(2);
			});
		});

		describe('Initialization', () => {
			// 用例23：延迟初始化
			it('延迟初始化', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);

				// 创建实例后文件不应立即存在
				expect(existsSync(filePath)).toBe(false);

				// 第一次操作触发初始化
				await store.get('key1');
				expect(existsSync(filePath)).toBe(true);
			});

			// 用例24：多次操作只初始化一次
			it('多次操作只初始化一次', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);

				await store.get('key1');
				await store.get('key2');
				await store.set('key3', 'value3');

				// 验证文件内容
				const store2 = createJsonStateStore(filePath);
				const result = await store2.get('key3');
				expect(result).toBe('value3');
			});
		});

		describe('Edge cases', () => {
			// 用例25：设置 null 值
			it('设置 null 值', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);

				await store.set('key1', null);
				const result = await store.get('key1');
				expect(result).toBeNull();
			});

			// 用例26：设置复杂对象
			it('设置复杂对象', async () => {
				const filePath = join(testDir, 'store.json');
				const store = createJsonStateStore(filePath);

				const complex = {
					nested: {
						deep: {
							value: 42,
						},
					},
					array: [1, 2, 3],
					mixed: { a: 'string', b: 123, c: true },
				};

				await store.set('complex', complex);
				const result = await store.get('complex');
				expect(result).toEqual(complex);
			});

			// 用例27：创建嵌套目录
			it('创建嵌套目录', async () => {
				const filePath = join(testDir, 'nested', 'deep', 'store.json');
				const store = createJsonStateStore(filePath);

				await store.set('key1', 'value1');
				expect(existsSync(filePath)).toBe(true);
			});
		});
	});
});
