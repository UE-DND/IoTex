/**
 * Mock Adapter 使用示例测试
 * 展示如何在测试中使用可重用的 Mock Adapter
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
	createMockAdapter,
	createFailingMockAdapter,
	createSlowMockAdapter,
} from './mock-adapter.js';

describe('Mock Adapter 使用示例', () => {
	describe('基础用法', () => {
		it('创建简单的 Mock Adapter', async () => {
			const adapter = createMockAdapter({ name: 'test-adapter' });

			expect(adapter.name).toBe('test-adapter');

			// 初始化、启动、停止
			await adapter.initialize({});
			await adapter.start();
			await adapter.stop();
		});

		it('获取设备状态', async () => {
			const adapter = createMockAdapter();

			const state = await adapter.getDeviceState('device-1');

			expect(state).toEqual({ deviceId: 'device-1' });
		});

		it('执行命令', async () => {
			const adapter = createMockAdapter();

			await adapter.executeCommand('lamp-1', { action: 'on', brightness: 100 });

			// 验证命令历史
			const history = adapter.getCommandHistory();
			expect(history).toHaveLength(1);
			expect(history[0].deviceId).toBe('lamp-1');
			expect(history[0].command).toMatchObject({ action: 'on', brightness: 100 });
		});
	});

	describe('带初始状态', () => {
		it('预设设备状态', async () => {
			const initialStates = new Map([
				['lamp-1', { power: 'on', brightness: 150 }],
				['lamp-2', { power: 'off', brightness: 0 }],
			]);

			const adapter = createMockAdapter({ deviceStates: initialStates });

			const state1 = await adapter.getDeviceState('lamp-1');
			const state2 = await adapter.getDeviceState('lamp-2');

			expect(state1).toEqual({ power: 'on', brightness: 150 });
			expect(state2).toEqual({ power: 'off', brightness: 0 });
		});

		it('动态设置设备状态', async () => {
			const adapter = createMockAdapter();

			adapter.setDeviceState('sensor-1', { temperature: 25, humidity: 60 });

			const state = await adapter.getDeviceState('sensor-1');
			expect(state).toEqual({ temperature: 25, humidity: 60 });
		});
	});

	describe('命令执行回调', () => {
		it('监听命令执行', async () => {
			const commands: Array<{ deviceId: string; command: unknown }> = [];

			const adapter = createMockAdapter({
				onCommand: (deviceId, cmd) => {
					commands.push({ deviceId, command: cmd });
				},
			});

			await adapter.executeCommand('lamp-1', { action: 'on' });
			await adapter.executeCommand('lamp-2', { action: 'off' });

			expect(commands).toHaveLength(2);
			expect(commands[0].deviceId).toBe('lamp-1');
			expect(commands[1].deviceId).toBe('lamp-2');
		});

		it('使用 jest.fn() 监听', async () => {
			const onCommand = jest.fn();
			const adapter = createMockAdapter({ onCommand });

			await adapter.executeCommand('lamp-1', { action: 'on' });

			expect(onCommand).toHaveBeenCalledTimes(1);
			expect(onCommand).toHaveBeenCalledWith('lamp-1', expect.any(Object));
		});
	});

	describe('状态变更事件', () => {
		it('自动触发状态变更事件', async () => {
			const adapter = createMockAdapter();
			const stateChanges: Array<{ deviceId: string; state: unknown }> = [];

			adapter.onDeviceStateChange((deviceId, state) => {
				stateChanges.push({ deviceId, state });
			});

			await adapter.executeCommand('lamp-1', { power: 'on' });

			expect(stateChanges).toHaveLength(1);
			expect(stateChanges[0].deviceId).toBe('lamp-1');
		});

		it('手动触发状态变更事件', () => {
			const adapter = createMockAdapter();
			const stateChanges: unknown[] = [];

			adapter.onDeviceStateChange((deviceId, state) => {
				stateChanges.push({ deviceId, state });
			});

			adapter.emitStateChange('sensor-1', { temperature: 30 });

			expect(stateChanges).toHaveLength(1);
		});

		it('禁用自动触发', async () => {
			const adapter = createMockAdapter({ autoEmitStateChange: false });
			const stateChanges: unknown[] = [];

			adapter.onDeviceStateChange((deviceId, state) => {
				stateChanges.push({ deviceId, state });
			});

			await adapter.executeCommand('lamp-1', { power: 'on' });

			expect(stateChanges).toHaveLength(0);

			// 手动触发
			adapter.emitStateChange('lamp-1', { power: 'on' });
			expect(stateChanges).toHaveLength(1);
		});

		it('多个监听器', () => {
			const adapter = createMockAdapter();

			adapter.onDeviceStateChange(() => {});
			adapter.onDeviceStateChange(() => {});
			adapter.onDeviceStateChange(() => {});

			expect(adapter.getListenerCount()).toBe(3);
		});
	});

	describe('生命周期回调', () => {
		it('监听初始化', async () => {
			const lifecycle: string[] = [];

			const adapter = createMockAdapter({
				onInitialize: async (config) => {
					lifecycle.push(`initialized with ${JSON.stringify(config)}`);
				},
				onStart: async () => {
					lifecycle.push('started');
				},
				onStop: async () => {
					lifecycle.push('stopped');
				},
			});

			await adapter.initialize({ brokerUrl: 'mqtt://localhost' });
			await adapter.start();
			await adapter.stop();

			expect(lifecycle).toEqual([
				'initialized with {"brokerUrl":"mqtt://localhost"}',
				'started',
				'stopped',
			]);
		});
	});

	describe('错误模拟', () => {
		it('使用 createFailingMockAdapter', async () => {
			const adapter = createFailingMockAdapter('Connection failed');

			await expect(adapter.initialize({})).rejects.toThrow('Connection failed');
			await expect(adapter.start()).rejects.toThrow('Connection failed');
			await expect(adapter.getDeviceState('device-1')).rejects.toThrow('Connection failed');
		});

		it('自定义错误条件', async () => {
			const adapter = createMockAdapter({
				shouldThrow: true,
				errorMessage: 'Device offline',
			});

			await expect(adapter.executeCommand('lamp-1', { action: 'on' })).rejects.toThrow(
				'Device offline'
			);
		});
	});

	describe('延迟模拟', () => {
		it('使用 createSlowMockAdapter', async () => {
			const adapter = createSlowMockAdapter(50);

			const startTime = Date.now();
			await adapter.executeCommand('lamp-1', { action: 'on' });
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeGreaterThanOrEqual(40); // 留一些余量
		});

		it('自定义延迟', async () => {
			const adapter = createMockAdapter({ commandDelay: 30 });

			const startTime = Date.now();
			await adapter.getDeviceState('device-1');
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeGreaterThanOrEqual(25);
		});
	});

	describe('命令历史管理', () => {
		it('记录所有命令', async () => {
			const adapter = createMockAdapter();

			await adapter.executeCommand('lamp-1', { action: 'on' });
			await adapter.executeCommand('lamp-1', { brightness: 150 });
			await adapter.executeCommand('lamp-2', { action: 'off' });

			const history = adapter.getCommandHistory();
			expect(history).toHaveLength(3);
		});

		it('清空历史', async () => {
			const adapter = createMockAdapter();

			await adapter.executeCommand('lamp-1', { action: 'on' });
			expect(adapter.getCommandHistory()).toHaveLength(1);

			adapter.clearCommandHistory();
			expect(adapter.getCommandHistory()).toHaveLength(0);
		});
	});

	describe('真实场景示例', () => {
		it('集成测试：完整设备控制流程', async () => {
			const initialStates = new Map([['lamp-1', { power: 'off', brightness: 0 }]]);

			const commandLog: string[] = [];
			const stateChanges: unknown[] = [];

			const adapter = createMockAdapter({
				name: 'test-lamp-adapter',
				deviceStates: initialStates,
				onCommand: (deviceId, cmd) => {
					commandLog.push(`${deviceId}: ${JSON.stringify(cmd)}`);
				},
			});

			adapter.onDeviceStateChange((deviceId, state) => {
				stateChanges.push({ deviceId, state });
			});

			// 初始化适配器
			await adapter.initialize({});
			await adapter.start();

			// 打开灯
			await adapter.executeCommand('lamp-1', { power: 'on' });
			expect(commandLog).toContain('lamp-1: {"power":"on"}');

			// 调整亮度
			await adapter.executeCommand('lamp-1', { brightness: 200 });

			// 验证状态
			const finalState = await adapter.getDeviceState('lamp-1');
			expect(finalState.power).toBe('on');
			expect(finalState.brightness).toBe(200);

			// 验证事件
			expect(stateChanges).toHaveLength(2);

			// 停止适配器
			await adapter.stop();
		});
	});
});
