/**
 * 单元测试：core/device-manager.ts
 */

import { describe, it, expect } from '@jest/globals';
import { applyDeviceStatePatch } from '../../../src/core/device-manager.js';
import { createInMemoryStateStore } from '../../../src/storage/state-store.js';

describe('core/device-manager', () => {
	describe('applyDeviceStatePatch', () => {
		// 用例1：应用状态补丁
		it('应用状态补丁', async () => {
			const store = createInMemoryStateStore();
			await store.set('device1', { power: 'off', brightness: 100 });

			const updated = await applyDeviceStatePatch('device1', { power: 'on' }, store);

			expect(updated).toEqual({ power: 'on', brightness: 100 });
		});

		// 用例2：空 deviceId 应抛出 TypeError
		it('空 deviceId 应抛出 TypeError', async () => {
			const store = createInMemoryStateStore();

			await expect(applyDeviceStatePatch('', { power: 'on' }, store)).rejects.toThrow(TypeError);
			await expect(applyDeviceStatePatch('', { power: 'on' }, store)).rejects.toThrow(
				/non-empty string/
			);
		});

		// 用例3：空白 deviceId 应抛出 TypeError
		it('空白 deviceId 应抛出 TypeError', async () => {
			const store = createInMemoryStateStore();

			await expect(applyDeviceStatePatch('   ', { power: 'on' }, store)).rejects.toThrow(TypeError);
		});

		// 用例4：非字符串 deviceId 应抛出 TypeError
		it('非字符串 deviceId 应抛出 TypeError', async () => {
			const store = createInMemoryStateStore();

			await expect(applyDeviceStatePatch(123 as any, { power: 'on' }, store)).rejects.toThrow(
				TypeError
			);
		});

		// 用例5：null patch 应抛出 TypeError
		it('null patch 应抛出 TypeError', async () => {
			const store = createInMemoryStateStore();

			await expect(applyDeviceStatePatch('device1', null as any, store)).rejects.toThrow(TypeError);
		});

		// 用例6：数组 patch 应抛出 TypeError
		it('数组 patch 应抛出 TypeError', async () => {
			const store = createInMemoryStateStore();

			await expect(applyDeviceStatePatch('device1', [] as any, store)).rejects.toThrow(TypeError);
			await expect(applyDeviceStatePatch('device1', [] as any, store)).rejects.toThrow(
				/plain object/
			);
		});

		// 用例7：非对象 patch 应抛出 TypeError
		it('非对象 patch 应抛出 TypeError', async () => {
			const store = createInMemoryStateStore();

			await expect(applyDeviceStatePatch('device1', 'string' as any, store)).rejects.toThrow(
				TypeError
			);
		});

		// 用例8：无效的 store 应抛出 TypeError
		it('无效的 store 应抛出 TypeError', async () => {
			await expect(applyDeviceStatePatch('device1', { power: 'on' }, null as any)).rejects.toThrow(
				TypeError
			);
			await expect(applyDeviceStatePatch('device1', { power: 'on' }, null as any)).rejects.toThrow(
				/StateStore/
			);
		});

		// 用例9：store 缺少 patch 方法应抛出 TypeError
		it('store 缺少 patch 方法应抛出 TypeError', async () => {
			const invalidStore = { get: () => {}, set: () => {} };

			await expect(
				applyDeviceStatePatch('device1', { power: 'on' }, invalidStore as any)
			).rejects.toThrow(TypeError);
		});

		// 用例10：不存在的设备应创建新状态
		it('不存在的设备应创建新状态', async () => {
			const store = createInMemoryStateStore();

			const updated = await applyDeviceStatePatch(
				'newdevice',
				{ power: 'on', brightness: 50 },
				store
			);

			expect(updated).toEqual({ power: 'on', brightness: 50 });
		});

		// 用例11：部分更新多个字段
		it('部分更新多个字段', async () => {
			const store = createInMemoryStateStore();
			await store.set('device1', {
				power: 'off',
				brightness: 100,
				color: 'white',
			});

			const updated = await applyDeviceStatePatch(
				'device1',
				{ power: 'on', brightness: 75 },
				store
			);

			expect(updated).toEqual({
				power: 'on',
				brightness: 75,
				color: 'white',
			});
		});

		// 用例12：空补丁应保持原状态
		it('空补丁应保持原状态', async () => {
			const store = createInMemoryStateStore();
			await store.set('device1', { power: 'on', brightness: 100 });

			const updated = await applyDeviceStatePatch('device1', {}, store);

			expect(updated).toEqual({ power: 'on', brightness: 100 });
		});

		// 用例13：添加新字段
		it('添加新字段', async () => {
			const store = createInMemoryStateStore();
			await store.set('device1', { power: 'on' });

			const updated = await applyDeviceStatePatch('device1', { brightness: 50 }, store);

			expect(updated).toEqual({ power: 'on', brightness: 50 });
		});

		// 用例14：嵌套对象更新
		it('嵌套对象更新', async () => {
			const store = createInMemoryStateStore();
			await store.set('device1', {
				power: 'on',
				config: { mode: 'auto', interval: 60 },
			});

			const updated = await applyDeviceStatePatch('device1', { config: { mode: 'manual' } }, store);

			// 基于 mergeDeviceState 的行为，嵌套对象会被替换
			expect(updated.power).toBe('on');
			expect((updated as any).config.mode).toBe('manual');
		});

		// 用例15：不可变性 - 原对象不应被修改
		it('不可变性 - 原对象不应被修改', async () => {
			const store = createInMemoryStateStore();
			const original = { power: 'off', brightness: 100 };
			await store.set('device1', original);

			await applyDeviceStatePatch('device1', { power: 'on' }, store);

			// 原始对象不应被修改
			expect(original).toEqual({ power: 'off', brightness: 100 });
		});

		// 用例16：存储层错误应被包装
		it('存储层错误应被包装', async () => {
			const failingStore = createInMemoryStateStore();
			// 覆盖 patch 方法使其失败
			failingStore.patch = async () => {
				throw new Error('Storage error');
			};

			await expect(applyDeviceStatePatch('device1', { power: 'on' }, failingStore)).rejects.toThrow(
				/Failed to apply state patch/
			);
		});

		// 用例17：复杂状态更新
		it('复杂状态更新', async () => {
			const store = createInMemoryStateStore();
			await store.set('device1', {
				id: 'device1',
				type: 'smart_bulb',
				power: 'off',
				brightness: 100,
				color: { r: 255, g: 255, b: 255 },
				schedule: {
					enabled: false,
					times: [],
				},
			});

			const updated = await applyDeviceStatePatch(
				'device1',
				{
					power: 'on',
					brightness: 80,
					schedule: { enabled: true },
				},
				store
			);

			expect(updated).toMatchObject({
				id: 'device1',
				type: 'smart_bulb',
				power: 'on',
				brightness: 80,
			});
		});

		// 用例18：数值字段更新
		it('数值字段更新', async () => {
			const store = createInMemoryStateStore();
			await store.set('sensor1', {
				temperature: 20,
				humidity: 50,
			});

			const updated = await applyDeviceStatePatch('sensor1', { temperature: 22 }, store);

			expect(updated).toEqual({
				temperature: 22,
				humidity: 50,
			});
		});

		// 用例19：布尔字段更新
		it('布尔字段更新', async () => {
			const store = createInMemoryStateStore();
			await store.set('device1', {
				enabled: false,
				active: true,
			});

			const updated = await applyDeviceStatePatch('device1', { enabled: true }, store);

			expect(updated).toEqual({
				enabled: true,
				active: true,
			});
		});

		// 用例20：持久化到存储
		it('持久化到存储', async () => {
			const store = createInMemoryStateStore();
			await store.set('device1', { power: 'off' });

			await applyDeviceStatePatch('device1', { power: 'on' }, store);

			// 从存储中重新读取验证
			const persisted = await store.get('device1');
			expect(persisted).toEqual({ power: 'on' });
		});
	});
});
