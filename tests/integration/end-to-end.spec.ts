/**
 * 集成测试：端到端流程测试
 * 测试完整的设备控制工作流：从命令提交到设备执行到状态同步
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createEmbeddedMqttBroker } from '../../src/infrastructure/embedded-mqtt-broker.js';
import { createMqttClient } from '../../src/adapters/mqtt/mqtt-client.js';
import { createAdapterRegistry } from '../../src/core/adapter-registry.js';
import { createCommandQueue } from '../../src/core/command-queue.js';
import { createJsonStateStore } from '../../src/storage/json-store.js';
import { createEventStore } from '../../src/storage/event-store.js';
import { createStateEmitter } from '../../src/adapters/base-adapter.js';
import { applyDeviceStatePatch } from '../../src/core/device-manager.js';
import { validateCommand } from '../../src/domain/command.js';
import type { ProtocolAdapter } from '../../src/domain/adapter-interface.js';

describe('End-to-End Integration Tests', () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(tmpdir(), `iotex-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		await fs.mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		// 等待所有异步操作完成
		await new Promise((resolve) => setTimeout(resolve, 200));
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch (error) {
			// 忽略清理错误
		}
	});

	describe('完整设备控制流程', () => {
		it('完整流程：命令提交 → 校验 → 队列 → 适配器 → 设备 → 状态更新 → 事件记录', async () => {
			// 1. 初始化基础设施
			const broker = createEmbeddedMqttBroker({ startPort: 14000 });
			await broker.start();

			const stateFilePath = join(testDir, 'device-states.json');
			const stateStore = createJsonStateStore(stateFilePath);
			const eventStore = createEventStore(testDir);
			const commandQueue = createCommandQueue(100);
			const adapterRegistry = createAdapterRegistry();

			try {
				// 2. 创建 MQTT 适配器
				const brokerUrl = broker.getConnectionUrl();
				const mqttClient = createMqttClient(brokerUrl);
				await mqttClient.connect();

				const emitter = createStateEmitter();
				const stateUpdates: Array<{ deviceId: string; state: any }> = [];

				emitter.onDeviceStateChange((deviceId, state) => {
					stateUpdates.push({ deviceId, state });
				});

				const mqttAdapter: ProtocolAdapter = {
					name: 'mqtt-adapter',
					async initialize() {
						// 订阅设备状态主题
						await mqttClient.subscribe('devices/+/state', async (msg) => {
							const state = JSON.parse(msg.toString());
							if (state.deviceId) {
								// 直接更新 stateStore 以确保状态持久化
								await stateStore.set(state.deviceId, state);
								emitter.emitState(state.deviceId, state);

								// 记录状态更新事件
								await eventStore.append({
									ts: Date.now(),
									type: 'device.state.updated',
									payload: { deviceId: state.deviceId, state },
								});
							}
						});
					},
					async start() {},
					async stop() {
						await mqttClient.disconnect();
					},
					async getDeviceState(deviceId: string) {
						return (await stateStore.get(deviceId)) || {};
					},
					async executeCommand(deviceId: string, command: any) {
						// 发布命令到 MQTT
						await mqttClient.publish(`devices/${deviceId}/command`, command);

						// 模拟设备执行并返回状态
						await new Promise((resolve) => setTimeout(resolve, 50));

						const newState = {
							deviceId,
							...command,
							executed: true,
							timestamp: Date.now(),
						};

						// 发布状态更新
						await mqttClient.publish(`devices/${deviceId}/state`, newState);

						return newState;
					},
					onDeviceStateChange: emitter.onDeviceStateChange.bind(emitter),
				};

				// 3. 注册适配器
				await mqttAdapter.initialize({});
				adapterRegistry.register('mqtt', mqttAdapter);
				await mqttAdapter.start();

				// 4. 提交命令
				const commands: any[] = [
					{ deviceId: 'lamp-1', action: 'on', brightness: 200 },
					{ deviceId: 'lamp-2', action: 'off' },
				];

				// 5. 命令校验并入队
				for (const command of commands) {
					validateCommand(command, ['brightness']);
					commandQueue.enqueue(command);

					// 记录命令提交事件
					await eventStore.append({
						ts: Date.now(),
						type: 'command.submitted',
						payload: command,
					});
				}

				expect(commandQueue.size()).toBe(2);

				// 6. 处理命令队列
				while (commandQueue.size() > 0) {
					const command: any = commandQueue.dequeue();
					if (!command) continue;

					const adapter = adapterRegistry.get('mqtt');
					if (!adapter) continue;

					try {
						// 执行命令
						await adapter.executeCommand(command.deviceId, command);

						// 记录命令执行事件
						await eventStore.append({
							ts: Date.now(),
							type: 'command.executed',
							payload: { command },
						});
					} catch (error) {
						// 记录错误事件
						await eventStore.append({
							ts: Date.now(),
							type: 'command.failed',
							payload: {
								command,
								error: error instanceof Error ? error.message : String(error),
							},
						});
					}
				}

				// 7. 等待状态更新传播（MQTT 消息 + 异步回调）
				// Windows 需要更长的等待时间
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// 8. 验证结果
				// 验证队列已清空
				expect(commandQueue.size()).toBe(0);

				// 验证状态已更新
				const lamp1State = await stateStore.get<any>('lamp-1');
				const lamp2State = await stateStore.get<any>('lamp-2');

				expect(lamp1State).toBeDefined();
				expect(lamp1State.action).toBe('on');
				expect(lamp1State.brightness).toBe(200);
				expect(lamp1State.executed).toBe(true);

				expect(lamp2State).toBeDefined();
				expect(lamp2State.action).toBe('off');

				// 验证状态变更事件被触发
				expect(stateUpdates.length).toBeGreaterThanOrEqual(2);
				expect(stateUpdates.some((u) => u.deviceId === 'lamp-1')).toBe(true);
				expect(stateUpdates.some((u) => u.deviceId === 'lamp-2')).toBe(true);

				// 验证事件被记录
				const events = await eventStore.query({});
				expect(events.length).toBeGreaterThanOrEqual(6); // 2 submitted + 2 executed + 2 state updated

				const submittedEvents = await eventStore.query({
					type: 'command.submitted',
				});
				expect(submittedEvents).toHaveLength(2);

				const executedEvents = await eventStore.query({
					type: 'command.executed',
				});
				expect(executedEvents).toHaveLength(2);

				// 9. 清理
				await mqttAdapter.stop();
				await mqttClient.disconnect();
				// 等待连接完全关闭
				await new Promise((resolve) => setTimeout(resolve, 100));
			} finally {
				await broker.stop();
			}
		});

		it('错误处理：无效命令被拒绝但不影响其他命令', async () => {
			const commandQueue = createCommandQueue(100);
			const eventStore = createEventStore(testDir);

			const commands: any[] = [
				{ deviceId: 'lamp-1', action: 'on' }, // 有效
				{ deviceId: '', action: 'on' }, // 无效：空deviceId
				{ deviceId: 'lamp-2', action: 'off' }, // 有效
				{ deviceId: 'lamp-3', action: 'on', brightness: 300 }, // 无效：brightness超范围
			];

			const validCommands: any[] = [];
			const invalidCommands: any[] = [];

			for (const command of commands) {
				try {
					validateCommand(command, ['brightness']);
					commandQueue.enqueue(command);
					validCommands.push(command);

					await eventStore.append({
						ts: Date.now(),
						type: 'command.validated',
						payload: command,
					});
				} catch (error) {
					invalidCommands.push(command);

					await eventStore.append({
						ts: Date.now(),
						type: 'command.validation.failed',
						payload: {
							command,
							error: error instanceof Error ? error.message : String(error),
						},
					});
				}
			}

			// 验证：只有2个有效命令入队
			expect(commandQueue.size()).toBe(2);
			expect(validCommands).toHaveLength(2);
			expect(invalidCommands).toHaveLength(2);

			// 验证事件记录
			const failedEvents = await eventStore.query({
				type: 'command.validation.failed',
			});
			expect(failedEvents).toHaveLength(2);
		});

		it('多适配器协同工作场景', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 14010 });
			await broker.start();

			const stateFilePath = join(testDir, 'multi-adapter-states.json');
			const stateStore = createJsonStateStore(stateFilePath);
			const commandQueue = createCommandQueue(100);
			const adapterRegistry = createAdapterRegistry();

			try {
				// MQTT 适配器
				const brokerUrl = broker.getConnectionUrl();
				const mqttClient = createMqttClient(brokerUrl);
				await mqttClient.connect();

				const mqttAdapter: ProtocolAdapter = {
					name: 'mqtt',
					async initialize() {},
					async start() {},
					async stop() {
						await mqttClient.disconnect();
					},
					async getDeviceState(deviceId: string) {
						return (await stateStore.get(deviceId)) || {};
					},
					async executeCommand(deviceId: string, command: any) {
						await mqttClient.publish(`mqtt/${deviceId}/cmd`, command);
						const state = { ...command, type: 'mqtt', executed: true };
						await stateStore.set(deviceId, state);
						return state;
					},
					onDeviceStateChange() {},
				};

				// HTTP 适配器（模拟）
				const httpAdapter: ProtocolAdapter = {
					name: 'http',
					async initialize() {},
					async start() {},
					async stop() {},
					async getDeviceState(deviceId: string) {
						return (await stateStore.get(deviceId)) || {};
					},
					async executeCommand(deviceId: string, command: any) {
						// 模拟 HTTP 调用
						await new Promise((resolve) => setTimeout(resolve, 30));
						const state = { ...command, type: 'http', executed: true };
						await stateStore.set(deviceId, state);
						return state;
					},
					onDeviceStateChange() {},
				};

				// 注册两个适配器
				adapterRegistry.register('mqtt', mqttAdapter);
				adapterRegistry.register('http', httpAdapter);

				// 提交使用不同适配器的命令
				const commands: any[] = [
					{ adapter: 'mqtt', deviceId: 'mqtt-device-1', action: 'on' },
					{ adapter: 'http', deviceId: 'http-device-1', action: 'on' },
					{ adapter: 'mqtt', deviceId: 'mqtt-device-2', action: 'off' },
				];

				commands.forEach((cmd) => commandQueue.enqueue(cmd));

				// 处理命令
				while (commandQueue.size() > 0) {
					const command: any = commandQueue.dequeue();
					if (!command) continue;

					const adapter = adapterRegistry.get(command.adapter);
					if (adapter) {
						await adapter.executeCommand(command.deviceId, command);
					}
				}

				// 验证结果
				const mqttState1 = await stateStore.get<any>('mqtt-device-1');
				const httpState1 = await stateStore.get<any>('http-device-1');
				const mqttState2 = await stateStore.get<any>('mqtt-device-2');

				expect(mqttState1.type).toBe('mqtt');
				expect(httpState1.type).toBe('http');
				expect(mqttState2.type).toBe('mqtt');

				await mqttClient.disconnect();
			} finally {
				await broker.stop();
			}
		});
	});
});
