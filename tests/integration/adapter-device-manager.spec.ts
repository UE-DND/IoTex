/**
 * 集成测试：适配器与设备管理器集成
 * 测试适配器注册、设备管理和状态同步
 */

import { createAdapterRegistry } from '../../src/core/adapter-registry.js';
import { applyDeviceStatePatch } from '../../src/core/device-manager.js';
import { createInMemoryStateStore } from '../../src/storage/state-store.js';
import { createStateEmitter } from '../../src/adapters/base-adapter.js';
import type { ProtocolAdapter } from '../../src/domain/adapter-interface.js';
import { createMockAdapter } from '../mocks/mock-adapter.js';

describe('Adapter + Device Manager Integration Tests', () => {
	describe('适配器注册与设备状态管理', () => {
		it('注册适配器后可以管理设备状态', async () => {
			const registry = createAdapterRegistry();
			const store = createInMemoryStateStore();
			const emitter = createStateEmitter();

			// 创建模拟适配器
			const mockAdapter: ProtocolAdapter = {
				name: 'test-adapter',
				async initialize() {},
				async start() {},
				async stop() {},
				async getDeviceState(deviceId: string) {
					return { power: 'on', deviceId };
				},
				async executeCommand(deviceId: string, command: any) {
					emitter.emitState(deviceId, command);
				},
				onDeviceStateChange: emitter.onDeviceStateChange.bind(emitter),
			};

			// 注册适配器
			registry.register('test-adapter', mockAdapter);

			// 获取设备状态
			const state = await mockAdapter.getDeviceState('device-1');
			expect(state.power).toBe('on');

			// 更新设备状态到存储
			await store.set('device-1', state);

			// 应用状态补丁
			const updatedState = await applyDeviceStatePatch('device-1', { brightness: 150 }, store);

			expect(updatedState).toEqual({
				power: 'on',
				deviceId: 'device-1',
				brightness: 150,
			});
		});

		it('适配器状态变更事件触发设备状态更新', async () => {
			const store = createInMemoryStateStore();
			const emitter = createStateEmitter();

			const stateUpdates: Array<{ deviceId: string; state: any }> = [];

			// 监听状态变更
			emitter.onDeviceStateChange((deviceId, state) => {
				stateUpdates.push({ deviceId, state });
			});

			// 模拟适配器
			const mockAdapter: ProtocolAdapter = {
				name: 'mqtt-adapter',
				async initialize() {},
				async start() {},
				async stop() {},
				async getDeviceState(deviceId: string) {
					const state = await store.get(deviceId);
					return (state ?? {}) as Record<string, unknown>;
				},
				async executeCommand(deviceId: string, command: any) {
					// 执行命令后触发状态变更
					const newState = { ...command, timestamp: Date.now() };
					await store.set(deviceId, newState);
					emitter.emitState(deviceId, newState);
				},
				onDeviceStateChange: emitter.onDeviceStateChange.bind(emitter),
			};

			// 执行命令
			await mockAdapter.executeCommand('lamp-1', { power: 'on', brightness: 200 });

			// 等待异步操作
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(stateUpdates).toHaveLength(1);
			expect(stateUpdates[0].deviceId).toBe('lamp-1');
			expect(stateUpdates[0].state.power).toBe('on');
			expect(stateUpdates[0].state.brightness).toBe(200);

			// 验证状态已保存
			const savedState = await store.get<any>('lamp-1');
			expect(savedState?.power).toBe('on');
		});

		it('多个适配器可以管理不同的设备', async () => {
			const registry = createAdapterRegistry();
			const store = createInMemoryStateStore();

			// 创建两个不同的适配器
			const mqttStates = new Map<string, Record<string, unknown>>();
			const httpStates = new Map<string, Record<string, unknown>>();

			const mqttAdapter = createMockAdapter({
				name: 'mqtt',
				deviceStates: mqttStates,
			});
			// 自定义 getDeviceState 以返回特定格式
			mqttAdapter.getDeviceState = async (deviceId: string) => ({
				type: 'mqtt',
				deviceId,
			});

			const httpAdapter = createMockAdapter({
				name: 'http',
				deviceStates: httpStates,
			});
			// 自定义 getDeviceState 以返回特定格式
			httpAdapter.getDeviceState = async (deviceId: string) => ({
				type: 'http',
				deviceId,
			});

			registry.register('mqtt', mqttAdapter);
			registry.register('http', httpAdapter);

			// 验证两个适配器都已注册
			expect(registry.has('mqtt')).toBe(true);
			expect(registry.has('http')).toBe(true);
			expect(registry.list()).toEqual(['mqtt', 'http']);

			// 通过不同适配器管理设备
			const mqttState = await mqttAdapter.getDeviceState('mqtt-device-1');
			const httpState = await httpAdapter.getDeviceState('http-device-1');

			await store.set('mqtt-device-1', mqttState);
			await store.set('http-device-1', httpState);

			// 验证设备状态
			const saved1 = await store.get<any>('mqtt-device-1');
			const saved2 = await store.get<any>('http-device-1');

			expect(saved1.type).toBe('mqtt');
			expect(saved2.type).toBe('http');
		});

		it('设备状态更新后触发多个监听器', async () => {
			const emitter = createStateEmitter();

			const listener1Updates: any[] = [];
			const listener2Updates: any[] = [];
			const listener3Updates: any[] = [];

			emitter.onDeviceStateChange((deviceId, state) => {
				listener1Updates.push({ deviceId, state });
			});

			emitter.onDeviceStateChange((deviceId, state) => {
				listener2Updates.push({ deviceId, state });
			});

			emitter.onDeviceStateChange((deviceId, state) => {
				listener3Updates.push({ deviceId, state });
			});

			// 触发状态变更
			emitter.emitState('device-1', { power: 'on' });
			emitter.emitState('device-2', { temperature: 25 });

			expect(listener1Updates).toHaveLength(2);
			expect(listener2Updates).toHaveLength(2);
			expect(listener3Updates).toHaveLength(2);

			expect(listener1Updates[0].deviceId).toBe('device-1');
			expect(listener1Updates[1].deviceId).toBe('device-2');
		});
	});

	describe('适配器生命周期管理', () => {
		it('适配器初始化、启动、停止流程', async () => {
			const lifecycle: string[] = [];

			const adapter = createMockAdapter({
				name: 'lifecycle-test',
				onInitialize: async () => {
					lifecycle.push('initialized');
				},
				onStart: async () => {
					lifecycle.push('started');
				},
				onStop: async () => {
					lifecycle.push('stopped');
				},
			});

			const registry = createAdapterRegistry();
			registry.register('lifecycle-test', adapter);

			await adapter.initialize({});
			await adapter.start();
			await adapter.stop();

			expect(lifecycle).toEqual(['initialized', 'started', 'stopped']);
		});
	});
});
