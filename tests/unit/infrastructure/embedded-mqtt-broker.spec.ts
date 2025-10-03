/**
 * 单元测试：embedded-mqtt-broker.ts
 * 测试内嵌 MQTT Broker 的端口查找、启停与状态管理
 */

import { createEmbeddedMqttBroker } from '../../../src/infrastructure/embedded-mqtt-broker.js';

describe('embedded-mqtt-broker', () => {
	describe('createEmbeddedMqttBroker', () => {
		it('首次 start() 后 getConnectionUrl() 返回可用 URL，getPort()>0', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 11883 });

			await broker.start();

			try {
				const url = broker.getConnectionUrl();
				const port = broker.getPort();

				expect(url).toMatch(/^mqtt:\/\//);
				expect(url).toContain(String(port));
				expect(port).toBeGreaterThan(0);
				expect(port).toBeGreaterThanOrEqual(11883);
			} finally {
				await broker.stop();
			}
		});

		it('端口占用时自动选择下一个可用端口', async () => {
			// 先启动一个 broker 占用某个端口
			const broker1 = createEmbeddedMqttBroker({ startPort: 11890 });
			await broker1.start();

			const port1 = broker1.getPort();

			try {
				// 再启动另一个从同一起始端口开始查找
				const broker2 = createEmbeddedMqttBroker({ startPort: 11890 });
				await broker2.start();

				try {
					const port2 = broker2.getPort();

					// 第二个 broker 应该使用不同端口
					expect(port2).not.toBe(port1);
					expect(port2).toBeGreaterThan(port1);
				} finally {
					await broker2.stop();
				}
			} finally {
				await broker1.stop();
			}
		});

		it('重复 start() 抛出 Error；stop() 幂等不抛错', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 11900 });

			await broker.start();

			try {
				// 重复启动应该抛错
				await expect(broker.start()).rejects.toThrow('Embedded MQTT broker is already started');
			} finally {
				await broker.stop();
			}

			// stop() 幂等，不应抛错
			await expect(broker.stop()).resolves.not.toThrow();
		});

		it('未启动时调用 getConnectionUrl() 抛出错误', () => {
			const broker = createEmbeddedMqttBroker();

			expect(() => broker.getConnectionUrl()).toThrow('Broker not started yet');
		});

		it('未启动时调用 getPort() 抛出错误', () => {
			const broker = createEmbeddedMqttBroker();

			expect(() => broker.getPort()).toThrow('Broker not started yet');
		});

		it('使用自定义 host 启动 broker', async () => {
			const broker = createEmbeddedMqttBroker({
				startPort: 11910,
				host: '0.0.0.0',
			});

			await broker.start();

			try {
				const url = broker.getConnectionUrl();
				expect(url).toContain('0.0.0.0');
			} finally {
				await broker.stop();
			}
		});

		it('stop() 后可以再次 start()', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 11920 });

			// 第一次启动
			await broker.start();
			const port1 = broker.getPort();
			await broker.stop();

			// 第二次启动
			await broker.start();
			const port2 = broker.getPort();
			await broker.stop();

			// 两次应该成功启动（可能使用不同端口）
			expect(port1).toBeGreaterThan(0);
			expect(port2).toBeGreaterThan(0);
		});

		it('使用默认配置创建 broker', async () => {
			const broker = createEmbeddedMqttBroker();

			await broker.start();

			try {
				const url = broker.getConnectionUrl();
				const port = broker.getPort();

				// 应使用默认主机 127.0.0.1
				expect(url).toContain('127.0.0.1');
				// 应从默认端口 1883 开始查找
				expect(port).toBeGreaterThanOrEqual(1883);
			} finally {
				await broker.stop();
			}
		});
	});
});
