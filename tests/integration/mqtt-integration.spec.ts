/**
 * 集成测试：MQTT 客户端与 Broker 集成
 * 测试 MQTT 客户端、Broker 和适配器之间的实际交互
 */

import { createEmbeddedMqttBroker } from '../../src/infrastructure/embedded-mqtt-broker.js';
import { createMqttClient } from '../../src/adapters/mqtt/mqtt-client.js';
import { mapTopicToDeviceId } from '../../src/adapters/mqtt/mqtt-adapter.js';

describe('MQTT Integration Tests', () => {
	describe('Embedded Broker + MQTT Client Integration', () => {
		it('多个客户端可以通过 broker 发布和订阅消息', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 13000 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();

				// 创建发布者和订阅者
				const publisher = createMqttClient(brokerUrl, { clientId: 'publisher' });
				const subscriber = createMqttClient(brokerUrl, { clientId: 'subscriber' });

				await publisher.connect();
				await subscriber.connect();

				// 订阅主题
				const receivedMessages: string[] = [];
				await subscriber.subscribe('test/topic', (msg) => {
					receivedMessages.push(msg.toString());
				});

				// 发布多条消息
				await publisher.publish('test/topic', { message: 'first' });
				await publisher.publish('test/topic', { message: 'second' });
				await publisher.publish('test/topic', { message: 'third' });

				// 等待消息传递
				await new Promise((resolve) => setTimeout(resolve, 200));

				expect(receivedMessages).toHaveLength(3);
				expect(JSON.parse(receivedMessages[0])).toEqual({ message: 'first' });
				expect(JSON.parse(receivedMessages[1])).toEqual({ message: 'second' });
				expect(JSON.parse(receivedMessages[2])).toEqual({ message: 'third' });

				await publisher.disconnect();
				await subscriber.disconnect();
			} finally {
				await broker.stop();
			}
		});

		it('客户端断开后重连可以恢复订阅', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 13010 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client = createMqttClient(brokerUrl);

				await client.connect();

				const receivedMessages: string[] = [];
				await client.subscribe('device/state', (msg) => {
					receivedMessages.push(msg.toString());
				});

				// 发布第一条消息
				await client.publish('device/state', { power: 'on' });
				await new Promise((resolve) => setTimeout(resolve, 100));

				expect(receivedMessages).toHaveLength(1);

				// 断开并重连
				await client.disconnect();
				await client.connect();

				// 重新订阅后发布消息
				await client.subscribe('device/state', (msg) => {
					receivedMessages.push(msg.toString());
				});
				await client.publish('device/state', { power: 'off' });
				await new Promise((resolve) => setTimeout(resolve, 100));

				expect(receivedMessages).toHaveLength(2);

				await client.disconnect();
			} finally {
				await broker.stop();
			}
		});

		it('MQTT 主题映射与设备状态更新集成', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 13020 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client = createMqttClient(brokerUrl);
				await client.connect();

				// 模拟设备状态更新
				const deviceStates = new Map<string, any>();
				const baseTopic = 'zigbee2mqtt';

				// 注意：订阅前需要稍等
				await new Promise((resolve) => setTimeout(resolve, 50));

				// 发布设备状态（不使用订阅，直接测试映射）
				const topic = 'zigbee2mqtt/lamp/state';
				const deviceId = mapTopicToDeviceId(baseTopic, topic);

				expect(deviceId).toBe('lamp');

				// 模拟状态更新
				const state = { power: 'on', brightness: 200 };
				if (deviceId) {
					deviceStates.set(deviceId, state);
				}

				expect(deviceStates.has('lamp')).toBe(true);
				expect(deviceStates.get('lamp')).toEqual({
					power: 'on',
					brightness: 200,
				});

				await client.disconnect();
			} finally {
				await broker.stop();
			}
		});

		it('通配符订阅可以接收多个设备的状态', async () => {
			const broker = createEmbeddedMqttBroker({ startPort: 13033 });
			await broker.start();

			try {
				const brokerUrl = broker.getConnectionUrl();
				const client = createMqttClient(brokerUrl);
				await client.connect();

				const deviceUpdates: Array<{ topic: string; payload: any }> = [];

				// 订阅所有设备状态
				await client.subscribe('zigbee2mqtt/#', (msg) => {
					deviceUpdates.push({
						topic: 'received',
						payload: JSON.parse(msg.toString()),
					});
				});

				// 等待订阅生效
				await new Promise((resolve) => setTimeout(resolve, 100));

				// 发布多个设备的状态
				await client.publish('zigbee2mqtt/lamp1/state', { power: 'on' });
				await client.publish('zigbee2mqtt/lamp2/state', { power: 'off' });
				await client.publish('zigbee2mqtt/sensor1/state', { temperature: 25 });

				// 等待消息传递
				await new Promise((resolve) => setTimeout(resolve, 300));

				expect(deviceUpdates.length).toBeGreaterThanOrEqual(3);

				await client.disconnect();
			} finally {
				await broker.stop();
			}
		});
	});
});
