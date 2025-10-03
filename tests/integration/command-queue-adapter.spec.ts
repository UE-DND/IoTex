/**
 * 集成测试：命令队列与适配器集成
 * 测试命令队列处理和适配器执行命令的集成流程
 */

import { createCommandQueue } from '../../src/core/command-queue.js';
import { createAdapterRegistry } from '../../src/core/adapter-registry.js';
import { createStateEmitter } from '../../src/adapters/base-adapter.js';
import { validateCommand } from '../../src/domain/command.js';
import type { ProtocolAdapter } from '../../src/domain/adapter-interface.js';
import { createMockAdapter } from '../mocks/mock-adapter.js';

describe('Command Queue + Adapter Integration Tests', () => {
	describe('命令队列与适配器协作', () => {
		it('命令入队后通过适配器执行', async () => {
			const queue = createCommandQueue(100);
			const registry = createAdapterRegistry();
			const executedCommands: any[] = [];

			// 创建模拟适配器
			const adapter = createMockAdapter({
				name: 'test-adapter',
				onCommand: (deviceId, command) => {
					executedCommands.push({ deviceId, command });
				},
			});

			registry.register('test-adapter', adapter);

			// 命令入队
			const cmd1 = { device_id: 'lamp-1', action: 'on' };
			const cmd2 = { device_id: 'lamp-2', action: 'off' };
			const cmd3 = { device_id: 'lamp-3', action: 'on', brightness: 200 };

			queue.enqueue(cmd1);
			queue.enqueue(cmd2);
			queue.enqueue(cmd3);

			expect(queue.size()).toBe(3);

			// 依次出队并执行
			const retrievedAdapter = registry.get('test-adapter');
			expect(retrievedAdapter).toBeDefined();

			while (queue.size() > 0) {
				const command = queue.dequeue() as any;
				if (command && retrievedAdapter) {
					await retrievedAdapter.executeCommand(command.device_id, command);
				}
			}

			expect(queue.size()).toBe(0);
			expect(executedCommands).toHaveLength(3);
			expect(executedCommands[0].command.action).toBe('on');
			expect(executedCommands[1].command.action).toBe('off');
			expect(executedCommands[2].command.brightness).toBe(200);
		});

		it('命令校验失败时不入队', () => {
			const queue = createCommandQueue(100);

			const validCommand = { deviceId: 'lamp-1', action: 'on' };
			const invalidCommand = { deviceId: '', action: 'on' }; // 空deviceId

			// 校验有效命令
			expect(() => validateCommand(validCommand, [])).not.toThrow();
			queue.enqueue(validCommand);
			expect(queue.size()).toBe(1);

			// 校验无效命令
			expect(() => validateCommand(invalidCommand, [])).toThrow(TypeError);
			// 不入队无效命令
			expect(queue.size()).toBe(1);
		});

		it('命令队列满时拒绝新命令', () => {
			const queue = createCommandQueue(3);

			queue.enqueue({ device_id: 'dev-1', action: 'on' });
			queue.enqueue({ device_id: 'dev-2', action: 'on' });
			queue.enqueue({ device_id: 'dev-3', action: 'on' });

			expect(queue.size()).toBe(3);

			// 队列已满，再次入队应抛错
			expect(() => queue.enqueue({ device_id: 'dev-4', action: 'on' })).toThrow(RangeError);
		});

		it('多适配器并发处理命令', async () => {
			const queue = createCommandQueue(100);
			const registry = createAdapterRegistry();
			const results: Record<string, any[]> = {
				mqtt: [],
				http: [],
			};

			// 创建两个适配器
			const mqttAdapter = createMockAdapter({
				name: 'mqtt',
				onCommand: (deviceId, command) => {
					results.mqtt.push({ deviceId, command });
				},
			});

			const httpAdapter = createMockAdapter({
				name: 'http',
				onCommand: (deviceId, command) => {
					results.http.push({ deviceId, command });
				},
			});

			registry.register('mqtt', mqttAdapter);
			registry.register('http', httpAdapter);

			// 添加不同适配器的命令
			const commands = [
				{ adapter: 'mqtt', device_id: 'mqtt-dev-1', action: 'on' },
				{ adapter: 'http', device_id: 'http-dev-1', action: 'on' },
				{ adapter: 'mqtt', device_id: 'mqtt-dev-2', action: 'off' },
				{ adapter: 'http', device_id: 'http-dev-2', action: 'off' },
			];

			commands.forEach((cmd) => queue.enqueue(cmd));

			// 并发处理命令
			const promises: Promise<void>[] = [];

			while (queue.size() > 0) {
				const command = queue.dequeue() as any;
				if (!command) continue;

				const adapter = registry.get(command.adapter);
				if (adapter) {
					promises.push(adapter.executeCommand(command.device_id, command));
				}
			}

			await Promise.all(promises);

			expect(results.mqtt).toHaveLength(2);
			expect(results.http).toHaveLength(2);
			expect(results.mqtt[0].deviceId).toBe('mqtt-dev-1');
			expect(results.http[0].deviceId).toBe('http-dev-1');
		});
	});

	describe('命令执行与状态更新集成', () => {
		it('命令执行后自动更新设备状态', async () => {
			const queue = createCommandQueue(50);
			const emitter = createStateEmitter();
			const stateUpdates: Array<{ deviceId: string; state: any }> = [];

			// 监听状态更新
			emitter.onDeviceStateChange((deviceId, state) => {
				stateUpdates.push({ deviceId, state });
			});

			// 创建适配器
			const adapter: ProtocolAdapter = {
				name: 'test-adapter',
				async initialize() {},
				async start() {},
				async stop() {},
				async getDeviceState() {
					return {};
				},
				async executeCommand(deviceId: string, command: any) {
					// 执行命令后触发状态更新
					await new Promise((resolve) => setTimeout(resolve, 10));
					emitter.emitState(deviceId, {
						...command,
						executed: true,
					});
				},
				onDeviceStateChange: emitter.onDeviceStateChange.bind(emitter),
			};

			// 入队并执行命令
			const commands = [
				{ device_id: 'lamp-1', action: 'on', brightness: 150 },
				{ device_id: 'lamp-2', action: 'off' },
			];

			commands.forEach((cmd) => queue.enqueue(cmd));

			// 处理队列
			while (queue.size() > 0) {
				const command = queue.dequeue() as any;
				if (command) {
					await adapter.executeCommand(command.device_id, command);
				}
			}

			// 等待异步状态更新
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(stateUpdates).toHaveLength(2);
			expect(stateUpdates[0].state.executed).toBe(true);
			expect(stateUpdates[0].state.brightness).toBe(150);
			expect(stateUpdates[1].deviceId).toBe('lamp-2');
		});

		it('命令执行失败不影响队列其他命令', async () => {
			const queue = createCommandQueue(100);
			const successfulCommands: string[] = [];
			const failedCommands: string[] = [];

			const adapter = createMockAdapter({
				name: 'test-adapter',
				onCommand: (deviceId, command) => {
					if (deviceId === 'failing-device') {
						failedCommands.push(deviceId);
						throw new Error('Device not responding');
					}
					successfulCommands.push(deviceId);
				},
			});

			// 入队多个命令，包括会失败的命令
			queue.enqueue({ device_id: 'device-1', action: 'on' });
			queue.enqueue({ device_id: 'failing-device', action: 'on' });
			queue.enqueue({ device_id: 'device-2', action: 'on' });

			// 处理队列
			while (queue.size() > 0) {
				const command = queue.dequeue() as any;
				if (command) {
					try {
						await adapter.executeCommand(command.device_id, command);
					} catch (error) {
						// 捕获错误但继续处理其他命令
						// 静默处理错误，不输出到控制台
					}
				}
			}

			expect(successfulCommands).toEqual(['device-1', 'device-2']);
			expect(failedCommands).toEqual(['failing-device']);
		});
	});
});
