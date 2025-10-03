/**
 * 单元测试：mqtt-client.ts
 * 测试 MQTT 客户端的连接、发布、订阅与自动重连
 */

import { createMqttClient } from '../../../../src/adapters/mqtt/mqtt-client.js';
import { createEmbeddedMqttBroker } from '../../../../src/infrastructure/embedded-mqtt-broker.js';

describe('adapters/mqtt/mqtt-client', () => {
	describe('createMqttClient', () => {
		it('非法 brokerUrl 抛出 TypeError', () => {
			expect(() => createMqttClient('')).toThrow(TypeError);
			expect(() => createMqttClient('')).toThrow('non-empty string');

			expect(() => createMqttClient('   ')).toThrow(TypeError);

			// @ts-expect-error - 故意传入非法类型测试运行时校验
			expect(() => createMqttClient(null)).toThrow(TypeError);

			// @ts-expect-error - 故意传入非法类型测试运行时校验
			expect(() => createMqttClient(123)).toThrow(TypeError);
		});

		it('非法协议的 URL 抛出 TypeError', () => {
			expect(() => createMqttClient('http://localhost:1883')).toThrow(TypeError);
			// 注意：由于 URL 构造可能在协议检查之前失败，错误消息可能不同
			expect(() => createMqttClient('http://localhost:1883')).toThrow(/Invalid/);

			expect(() => createMqttClient('ftp://localhost:1883')).toThrow(TypeError);
		});

		it('格式非法的 URL 抛出 TypeError', () => {
			expect(() => createMqttClient('not-a-url')).toThrow(TypeError);
			expect(() => createMqttClient('not-a-url')).toThrow(/Invalid brokerUrl format/);
		});

		it('成功连接到 MQTT broker 并发布消息', async () => {
			// 启动内嵌 broker
			const broker = createEmbeddedMqttBroker({ startPort: 12000 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client = createMqttClient(brokerUrl);

				await client.connect();

				// 发布对象会自动序列化为 JSON
				await expect(
					client.publish('test/topic', { power: 'on', brightness: 80 })
				).resolves.not.toThrow();

				await client.disconnect();
			} finally {
				await broker.stop();
			}
		});

		it('订阅主题后能收到消息', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 12010 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client1 = createMqttClient(brokerUrl, {
					clientId: 'publisher',
				});
				const client2 = createMqttClient(brokerUrl, {
					clientId: 'subscriber',
				});

				await client1.connect();
				await client2.connect();

				// 订阅
				const messages: Buffer[] = [];
				await client2.subscribe('test/messages', (msg) => {
					messages.push(msg);
				});

				// 发布消息
				await client1.publish('test/messages', { status: 'active' });

				// 等待消息到达
				await new Promise((resolve) => {
					setTimeout(resolve, 100);
				});

				expect(messages).toHaveLength(1);
				const received = JSON.parse(messages[0].toString());
				expect(received).toEqual({ status: 'active' });

				await client1.disconnect();
				await client2.disconnect();
			} finally {
				await broker.stop();
			}
		});

		it('未连接时发布抛出错误', async () => {
			const client = createMqttClient('mqtt://localhost:9999');

			await expect(client.publish('test/topic', 'data')).rejects.toThrow('not connected');
		});

		it('未连接时订阅抛出错误', async () => {
			const client = createMqttClient('mqtt://localhost:9999');

			await expect(
				client.subscribe('test/topic', () => {
					// handler
				})
			).rejects.toThrow('not connected');
		});

		it('重复连接抛出错误', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 12020 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client = createMqttClient(brokerUrl);

				await client.connect();

				await expect(client.connect()).rejects.toThrow('already connected');

				await client.disconnect();
			} finally {
				await broker.stop();
			}
		});

		it('断开连接后可以再次连接', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 12030 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client = createMqttClient(brokerUrl);

				// 第一次连接
				await client.connect();
				await client.disconnect();

				// 第二次连接
				await client.connect();
				await client.disconnect();
			} finally {
				await broker.stop();
			}
		});

		it('断开连接是幂等的', async () => {
			const client = createMqttClient('mqtt://localhost:9999');

			// 未连接时断开不应抛错
			await expect(client.disconnect()).resolves.not.toThrow();
			await expect(client.disconnect()).resolves.not.toThrow();
		});

		it('发布时主题为空抛出 TypeError', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 12040 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client = createMqttClient(brokerUrl);

				await client.connect();

				await expect(client.publish('', 'data')).rejects.toThrow(TypeError);
				await expect(client.publish('   ', 'data')).rejects.toThrow(TypeError);

				await client.disconnect();
			} finally {
				await broker.stop();
			}
		});

		it('订阅时主题为空抛出 TypeError', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 12050 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client = createMqttClient(brokerUrl);

				await client.connect();

				await expect(
					client.subscribe('', () => {
						// handler
					})
				).rejects.toThrow(TypeError);

				await client.disconnect();
			} finally {
				await broker.stop();
			}
		});

		it('订阅时 handler 非函数抛出 TypeError', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 12060 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client = createMqttClient(brokerUrl);

				await client.connect();

				// @ts-expect-error - 故意传入非法类型测试运行时校验
				await expect(client.subscribe('test/topic', null)).rejects.toThrow(TypeError);

				// @ts-expect-error - 故意传入非法类型测试运行时校验
				await expect(client.subscribe('test/topic', 'not-a-function')).rejects.toThrow(TypeError);

				await client.disconnect();
			} finally {
				await broker.stop();
			}
		});

		it('发布字符串载荷', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 12070 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client1 = createMqttClient(brokerUrl, {
					clientId: 'pub-string',
				});
				const client2 = createMqttClient(brokerUrl, {
					clientId: 'sub-string',
				});

				await client1.connect();
				await client2.connect();

				const messages: string[] = [];
				await client2.subscribe('test/string', (msg) => {
					messages.push(msg.toString());
				});

				await client1.publish('test/string', 'hello world');

				// Windows 需要更长的等待时间
				await new Promise((resolve) => {
					setTimeout(resolve, 300);
				});

				expect(messages).toHaveLength(1);
				expect(messages[0]).toBe('hello world');

				await client1.disconnect();
				await client2.disconnect();
				// 等待连接完全关闭
				await new Promise((resolve) => setTimeout(resolve, 100));
			} finally {
				await broker.stop();
			}
		});

		it('使用自定义 clientId 连接', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 12080 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client = createMqttClient(brokerUrl, {
					clientId: 'custom-client-id',
				});

				await expect(client.connect()).resolves.not.toThrow();

				await client.disconnect();
			} finally {
				await broker.stop();
			}
		});
	});
});
