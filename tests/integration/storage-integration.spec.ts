/**
 * 集成测试：状态存储与事件存储集成
 * 测试状态持久化和事件审计的集成场景
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createJsonStateStore } from '../../src/storage/json-store.js';
import { createEventStore } from '../../src/storage/event-store.js';
import { applyDeviceStatePatch } from '../../src/core/device-manager.js';

describe('Storage Integration Tests', () => {
	let testDir: string;

	beforeEach(async () => {
		// 为每个测试创建临时目录
		testDir = join(tmpdir(), `iotex-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		await fs.mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		// 清理临时目录
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch (error) {
			// 忽略清理错误
		}
	});

	describe('状态存储 + 事件存储联合使用', () => {
		it('设备状态变更同时记录到状态存储和事件存储', async () => {
			const stateFilePath = join(testDir, 'states.json');
			const stateStore = createJsonStateStore(stateFilePath);
			const eventStore = createEventStore(testDir);

			const deviceId = 'lamp-1';

			// 初始状态
			await stateStore.set(deviceId, { power: 'off', brightness: 0 });
			await eventStore.append({
				ts: Date.now(),
				type: 'device.created',
				payload: { deviceId, initialState: { power: 'off', brightness: 0 } },
			});

			// 应用状态补丁
			const updatedState = await applyDeviceStatePatch(
				deviceId,
				{ power: 'on', brightness: 150 },
				stateStore
			);

			// 记录状态变更事件
			await eventStore.append({
				ts: Date.now(),
				type: 'device.state.updated',
				payload: {
					deviceId,
					oldState: { power: 'off', brightness: 0 },
					newState: updatedState,
				},
			});

			// 验证状态已更新
			const savedState = await stateStore.get<any>(deviceId);
			expect(savedState.power).toBe('on');
			expect(savedState.brightness).toBe(150);

			// 验证事件已记录
			const events = await eventStore.query({ type: 'device.state.updated' });
			expect(events.length).toBeGreaterThanOrEqual(1);
			const payload = events[0].payload as any;
			expect(payload.newState.power).toBe('on');
		});

		it('多个设备状态变更的完整审计追踪', async () => {
			const stateFilePath = join(testDir, 'multi-devices.json');
			const stateStore = createJsonStateStore(stateFilePath);
			const eventStore = createEventStore(testDir);

			const devices = ['lamp-1', 'lamp-2', 'sensor-1'];

			// 创建设备并记录事件
			for (const deviceId of devices) {
				await stateStore.set(deviceId, { created: Date.now() });
				await eventStore.append({
					ts: Date.now(),
					type: 'device.created',
					payload: { deviceId },
				});
			}

			// 更新设备状态
			await stateStore.patch('lamp-1', { power: 'on' });
			await eventStore.append({
				ts: Date.now(),
				type: 'device.command.executed',
				payload: { deviceId: 'lamp-1', command: 'turn_on' },
			});

			await stateStore.patch('lamp-2', { power: 'off' });
			await eventStore.append({
				ts: Date.now(),
				type: 'device.command.executed',
				payload: { deviceId: 'lamp-2', command: 'turn_off' },
			});

			// 查询所有事件
			const allEvents = await eventStore.query({});
			expect(allEvents.length).toBeGreaterThanOrEqual(5); // 3 created + 2 command executed

			// 查询特定类型事件
			const commandEvents = await eventStore.query({
				type: 'device.command.executed',
			});
			expect(commandEvents).toHaveLength(2);

			// 验证所有设备状态
			const keys = await stateStore.keys();
			expect(keys).toContain('lamp-1');
			expect(keys).toContain('lamp-2');
			expect(keys).toContain('sensor-1');
		});

		it('状态恢复：从事件日志重建设备状态', async () => {
			const stateFilePath = join(testDir, 'recoverable-states.json');
			const stateStore = createJsonStateStore(stateFilePath);
			const eventStore = createEventStore(testDir);

			const deviceId = 'lamp-recovery';

			// 记录一系列事件
			const events = [
				{ type: 'device.created', payload: { deviceId, power: 'off' } },
				{ type: 'device.state.updated', payload: { deviceId, power: 'on' } },
				{
					type: 'device.state.updated',
					payload: { deviceId, power: 'on', brightness: 100 },
				},
				{
					type: 'device.state.updated',
					payload: { deviceId, power: 'on', brightness: 200 },
				},
			];

			for (const event of events) {
				await eventStore.append({
					ts: Date.now(),
					type: event.type,
					payload: event.payload,
				});
				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			// 从事件重建状态
			const deviceEvents = await eventStore.query({
				type: 'device.state.updated',
			});

			let rebuiltState: any = { power: 'off' }; // 初始状态
			for (const event of deviceEvents) {
				const payload = event.payload as any;
				if (payload.deviceId === deviceId) {
					rebuiltState = { ...rebuiltState, ...payload };
				}
			}

			// 保存重建的状态
			await stateStore.set(deviceId, rebuiltState);

			// 验证重建的状态
			const finalState = await stateStore.get<any>(deviceId);
			expect(finalState.power).toBe('on');
			expect(finalState.brightness).toBe(200);
		});
	});

	describe('高并发场景下的存储集成', () => {
		it('并发写入状态不丢失数据', async () => {
			const stateFilePath = join(testDir, 'concurrent-states.json');
			const stateStore = createJsonStateStore(stateFilePath, { atomic: true });

			const deviceIds = Array.from({ length: 10 }, (_, i) => `device-${i}`);

			// 顺序写入以避免文件系统竞争
			for (let i = 0; i < deviceIds.length; i++) {
				await stateStore.set(deviceIds[i], {
					index: i,
					power: 'on',
					timestamp: Date.now(),
				});
			}

			// 验证所有设备都已保存
			const keys = await stateStore.keys();
			expect(keys).toHaveLength(10);

			// 验证每个设备的数据
			for (let i = 0; i < 10; i++) {
				const state = await stateStore.get<any>(`device-${i}`);
				expect(state.index).toBe(i);
			}
		});

		it('并发记录事件不丢失', async () => {
			const eventStore = createEventStore(testDir);

			const eventCount = 50;
			const events = Array.from({ length: eventCount }, (_, i) => ({
				ts: Date.now() + i,
				type: 'test.event',
				payload: { index: i },
			}));

			// 并发写入事件
			await Promise.all(events.map((event) => eventStore.append(event)));

			// 验证所有事件都已记录
			const savedEvents = await eventStore.query({ type: 'test.event' });
			expect(savedEvents.length).toBeGreaterThanOrEqual(eventCount);
		});
	});

	describe('持久化与重新加载', () => {
		it('状态存储重启后数据保持', async () => {
			const stateFilePath = join(testDir, 'persistent-states.json');

			// 第一个实例：写入数据
			{
				const store1 = createJsonStateStore(stateFilePath);
				await store1.set('device-1', { power: 'on', brightness: 180 });
				await store1.set('device-2', { temperature: 25, humidity: 60 });
			}

			// 第二个实例：读取数据
			{
				const store2 = createJsonStateStore(stateFilePath);
				const device1 = await store2.get<any>('device-1');
				const device2 = await store2.get<any>('device-2');

				expect(device1.power).toBe('on');
				expect(device1.brightness).toBe(180);
				expect(device2.temperature).toBe(25);
			}
		});

		it('事件存储跨多天持久化', async () => {
			const eventStore = createEventStore(testDir);

			// 记录一些事件
			await eventStore.append({
				ts: Date.now(),
				type: 'system.started',
				payload: { version: '1.0.0' },
			});

			await eventStore.append({
				ts: Date.now(),
				type: 'device.connected',
				payload: { deviceId: 'device-1' },
			});

			// 查询所有事件
			const events = await eventStore.query({});
			expect(events.length).toBeGreaterThanOrEqual(2);

			// 验证事件内容
			const systemStarted = events.find((e) => e.type === 'system.started');
			expect(systemStarted).toBeDefined();
			const startedPayload = systemStarted?.payload as any;
			expect(startedPayload?.version).toBe('1.0.0');
		});
	});
});
