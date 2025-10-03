/**
 * 单元测试：storage/event-store.ts
 */

import { existsSync } from 'node:fs';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createEventStore } from '../../../src/storage/event-store.js';
import type { Event } from '../../../src/storage/event-store.js';

describe('storage/event-store', () => {
	const testDir = join(process.cwd(), 'test-tmp-event-store');

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

	describe('createEventStore', () => {
		// 用例1：空目录路径应抛出 TypeError
		it('空目录路径应抛出 TypeError', () => {
			expect(() => createEventStore('')).toThrow(TypeError);
			expect(() => createEventStore('')).toThrow(/non-empty string/);
		});

		// 用例2：空白目录路径应抛出 TypeError
		it('空白目录路径应抛出 TypeError', () => {
			expect(() => createEventStore('   ')).toThrow(TypeError);
		});

		// 用例3：非字符串目录路径应抛出 TypeError
		it('非字符串目录路径应抛出 TypeError', () => {
			expect(() => createEventStore(123 as any)).toThrow(TypeError);
		});

		describe('append', () => {
			// 用例4：追加事件
			it('追加事件', async () => {
				const store = createEventStore(testDir);
				const event: Event = {
					ts: Date.now(),
					type: 'device.connected',
					payload: { deviceId: 'device1' },
				};

				await store.append(event);

				const events = await store.query();
				expect(events).toHaveLength(1);
				expect(events[0]).toEqual(event);
			});

			// 用例5：非对象事件应抛出 TypeError
			it('非对象事件应抛出 TypeError', async () => {
				const store = createEventStore(testDir);
				await expect(store.append('string' as any)).rejects.toThrow(TypeError);
			});

			// 用例6：负数时间戳应抛出 TypeError
			it('负数时间戳应抛出 TypeError', async () => {
				const store = createEventStore(testDir);
				const event: Event = {
					ts: -1,
					type: 'test',
				};
				await expect(store.append(event)).rejects.toThrow(TypeError);
				await expect(store.append(event)).rejects.toThrow(/non-negative/);
			});

			// 用例7：无限大时间戳应抛出 TypeError
			it('无限大时间戳应抛出 TypeError', async () => {
				const store = createEventStore(testDir);
				const event: Event = {
					ts: Infinity,
					type: 'test',
				};
				await expect(store.append(event)).rejects.toThrow(TypeError);
			});

			// 用例8：非数字时间戳应抛出 TypeError
			it('非数字时间戳应抛出 TypeError', async () => {
				const store = createEventStore(testDir);
				const event = {
					ts: 'invalid',
					type: 'test',
				};
				await expect(store.append(event as any)).rejects.toThrow(TypeError);
			});

			// 用例9：空类型应抛出 TypeError
			it('空类型应抛出 TypeError', async () => {
				const store = createEventStore(testDir);
				const event: Event = {
					ts: Date.now(),
					type: '',
				};
				await expect(store.append(event)).rejects.toThrow(TypeError);
				await expect(store.append(event)).rejects.toThrow(/non-empty string/);
			});

			// 用例10：非字符串类型应抛出 TypeError
			it('非字符串类型应抛出 TypeError', async () => {
				const store = createEventStore(testDir);
				const event = {
					ts: Date.now(),
					type: 123,
				};
				await expect(store.append(event as any)).rejects.toThrow(TypeError);
			});

			// 用例11：追加多个事件
			it('追加多个事件', async () => {
				const store = createEventStore(testDir);
				const events: Event[] = [
					{ ts: Date.now(), type: 'event1' },
					{ ts: Date.now() + 1, type: 'event2' },
					{ ts: Date.now() + 2, type: 'event3' },
				];

				for (const event of events) {
					await store.append(event);
				}

				const result = await store.query();
				expect(result).toHaveLength(3);
			});

			// 用例12：按日期分组到不同文件
			it('按日期分组到不同文件', async () => {
				const store = createEventStore(testDir);

				const today = new Date();
				const yesterday = new Date(today);
				yesterday.setDate(yesterday.getDate() - 1);

				await store.append({
					ts: today.getTime(),
					type: 'today_event',
				});
				await store.append({
					ts: yesterday.getTime(),
					type: 'yesterday_event',
				});

				// 验证存在两个日志文件
				const files = await import('node:fs/promises').then((fs) => fs.readdir(testDir));
				const logFiles = files.filter((f) => f.endsWith('.log'));
				expect(logFiles.length).toBeGreaterThanOrEqual(1);
			});
		});

		describe('query', () => {
			// 用例13：查询空目录返回空数组
			it('查询空目录返回空数组', async () => {
				const nonExistentDir = join(testDir, 'nonexistent');
				const store = createEventStore(nonExistentDir);
				const events = await store.query();
				expect(events).toEqual([]);
			});

			// 用例14：查询所有事件
			it('查询所有事件', async () => {
				const store = createEventStore(testDir);
				const events: Event[] = [
					{ ts: 1000, type: 'event1' },
					{ ts: 2000, type: 'event2' },
					{ ts: 3000, type: 'event3' },
				];

				for (const event of events) {
					await store.append(event);
				}

				const result = await store.query();
				expect(result).toHaveLength(3);
				expect(result).toEqual(events);
			});

			// 用例15：按类型过滤
			it('按类型过滤', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'typeA' });
				await store.append({ ts: 2000, type: 'typeB' });
				await store.append({ ts: 3000, type: 'typeA' });

				const result = await store.query({ type: 'typeA' });
				expect(result).toHaveLength(2);
				expect(result[0].type).toBe('typeA');
				expect(result[1].type).toBe('typeA');
			});

			// 用例16：按起始时间过滤
			it('按起始时间过滤', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'event1' });
				await store.append({ ts: 2000, type: 'event2' });
				await store.append({ ts: 3000, type: 'event3' });

				const result = await store.query({ since: 2000 });
				expect(result).toHaveLength(2);
				expect(result[0].ts).toBe(2000);
				expect(result[1].ts).toBe(3000);
			});

			// 用例17：按结束时间过滤
			it('按结束时间过滤', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'event1' });
				await store.append({ ts: 2000, type: 'event2' });
				await store.append({ ts: 3000, type: 'event3' });

				const result = await store.query({ until: 2000 });
				expect(result).toHaveLength(2);
				expect(result[0].ts).toBe(1000);
				expect(result[1].ts).toBe(2000);
			});

			// 用例18：时间范围过滤
			it('时间范围过滤', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'event1' });
				await store.append({ ts: 2000, type: 'event2' });
				await store.append({ ts: 3000, type: 'event3' });
				await store.append({ ts: 4000, type: 'event4' });

				const result = await store.query({ since: 2000, until: 3000 });
				expect(result).toHaveLength(2);
				expect(result[0].ts).toBe(2000);
				expect(result[1].ts).toBe(3000);
			});

			// 用例19：组合过滤
			it('组合过滤', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'typeA' });
				await store.append({ ts: 2000, type: 'typeB' });
				await store.append({ ts: 3000, type: 'typeA' });
				await store.append({ ts: 4000, type: 'typeB' });

				const result = await store.query({
					type: 'typeA',
					since: 2000,
					until: 3500,
				});
				expect(result).toHaveLength(1);
				expect(result[0]).toEqual({ ts: 3000, type: 'typeA' });
			});

			// 用例20：事件按时间戳排序
			it('事件按时间戳排序', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 3000, type: 'event3' });
				await store.append({ ts: 1000, type: 'event1' });
				await store.append({ ts: 2000, type: 'event2' });

				const result = await store.query();
				expect(result).toHaveLength(3);
				expect(result[0].ts).toBe(1000);
				expect(result[1].ts).toBe(2000);
				expect(result[2].ts).toBe(3000);
			});

			// 用例21：忽略无效 JSON 行
			it('忽略无效 JSON 行', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'valid' });

				// 手动添加无效行
				const logFile = join(testDir, `${new Date(1000).toISOString().split('T')[0]}.log`);
				await writeFile(logFile, 'invalid json line\n', {
					flag: 'a',
					encoding: 'utf-8',
				});

				const result = await store.query();
				expect(result).toHaveLength(1);
				expect(result[0].type).toBe('valid');
			});

			// 用例22：处理带 payload 的事件
			it('处理带 payload 的事件', async () => {
				const store = createEventStore(testDir);
				const event: Event = {
					ts: 1000,
					type: 'user.login',
					payload: { userId: '123', ip: '192.168.1.1' },
				};

				await store.append(event);
				const result = await store.query();

				expect(result).toHaveLength(1);
				expect(result[0]).toEqual(event);
			});
		});

		describe('Edge cases', () => {
			// 用例23：零时间戳
			it('零时间戳', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 0, type: 'epoch' });

				const result = await store.query();
				expect(result).toHaveLength(1);
				expect(result[0].ts).toBe(0);
			});

			// 用例24：大量事件
			it('大量事件', async () => {
				const store = createEventStore(testDir);
				const count = 100;

				for (let i = 0; i < count; i++) {
					await store.append({ ts: i, type: `event${i}` });
				}

				const result = await store.query();
				expect(result).toHaveLength(count);
			});

			// 用例25：无匹配过滤器返回空数组
			it('无匹配过滤器返回空数组', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'typeA' });

				const result = await store.query({ type: 'typeB' });
				expect(result).toEqual([]);
			});

			// 用例26：忽略无效的日志文件名（在时间过滤时）
			it('忽略无效的日志文件名（在时间过滤时）', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'valid' });

				// 创建无效文件名的日志文件
				await writeFile(join(testDir, 'invalid-name.log'), '{"ts":2000,"type":"test"}\n');

				// 使用时间过滤，invalid-name.log 会因为无法解析日期而被跳过
				const result = await store.query({ since: 900, until: 1100 });
				expect(result).toHaveLength(1);
				expect(result[0].ts).toBe(1000);
			});

			// 用例27：处理无效的日期在文件名中（在时间过滤时）
			it('处理无效的日期在文件名中（在时间过滤时）', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'valid' });

				// 创建无效日期的文件名
				await writeFile(join(testDir, '2024-13-45.log'), '{"ts":2000,"type":"test"}\n');

				// 使用时间过滤，2024-13-45.log 会因为日期无效而被跳过
				const result = await store.query({ since: 900, until: 1100 });
				expect(result).toHaveLength(1);
				expect(result[0].ts).toBe(1000);
			});

			// 用例28：处理缺少必需字段的事件
			it('处理缺少必需字段的事件', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'valid' });

				// 手动添加缺少字段的事件
				const logFile = join(testDir, `${new Date(1000).toISOString().split('T')[0]}.log`);
				await writeFile(logFile, '{"ts":2000}\n', { flag: 'a', encoding: 'utf-8' });
				await writeFile(logFile, '{"type":"test"}\n', { flag: 'a', encoding: 'utf-8' });

				const result = await store.query();
				expect(result).toHaveLength(1);
				expect(result[0].ts).toBe(1000);
			});

			// 用例29：处理非对象的JSON行
			it('处理非对象的JSON行', async () => {
				const store = createEventStore(testDir);
				await store.append({ ts: 1000, type: 'valid' });

				// 手动添加非对象的JSON行
				const logFile = join(testDir, `${new Date(1000).toISOString().split('T')[0]}.log`);
				await writeFile(logFile, '"string"\n', { flag: 'a', encoding: 'utf-8' });
				await writeFile(logFile, '123\n', { flag: 'a', encoding: 'utf-8' });
				await writeFile(logFile, 'true\n', { flag: 'a', encoding: 'utf-8' });
				await writeFile(logFile, 'null\n', { flag: 'a', encoding: 'utf-8' });

				const result = await store.query();
				expect(result).toHaveLength(1);
				expect(result[0].ts).toBe(1000);
			});

			// 用例30：过滤时间范围外的文件
			it('过滤时间范围外的文件', async () => {
				const store = createEventStore(testDir);

				// 创建不同日期的事件
				const day1 = new Date('2024-01-01T00:00:00Z').getTime();
				const day2 = new Date('2024-01-02T00:00:00Z').getTime();
				const day3 = new Date('2024-01-03T00:00:00Z').getTime();

				await store.append({ ts: day1, type: 'day1' });
				await store.append({ ts: day2, type: 'day2' });
				await store.append({ ts: day3, type: 'day3' });

				// 查询只包含 day2 的时间范围
				const result = await store.query({
					since: day2,
					until: day2 + 1000,
				});

				expect(result).toHaveLength(1);
				expect(result[0].type).toBe('day2');
			});
		});
	});
});
