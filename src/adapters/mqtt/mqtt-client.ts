/**
 * MQTT 客户端模块
 * 包装 mqtt 库，提供自动重连与订阅恢复
 */

import mqtt, { type MqttClient as NativeMqttClient, type IClientOptions } from 'mqtt';

/**
 * MQTT 客户端配置选项
 */
export interface MqttClientOptions {
	/** 客户端ID（可选，默认自动生成） */
	clientId?: string;
	/** 用户名（可选） */
	username?: string;
	/** 密码（可选） */
	password?: string;
	/** 保活间隔（秒，默认60） */
	keepalive?: number;
}

/**
 * 主题订阅处理器
 */
export type MessageHandler = (message: Buffer) => void;

/**
 * 匹配 MQTT 主题模式（支持通配符）
 * @param pattern - 订阅模式（可包含 + 和 # 通配符）
 * @param topic - 实际的主题
 * @returns 是否匹配
 *
 * MQTT 通配符规则：
 * - `+` 匹配单个层级，例如 `devices/+/state` 匹配 `devices/lamp-1/state`
 * - `#` 匹配多个层级（必须在最后），例如 `zigbee2mqtt/#` 匹配 `zigbee2mqtt/lamp1/state`
 */
function matchTopic(pattern: string, topic: string): boolean {
	// 精确匹配
	if (pattern === topic) {
		return true;
	}

	// 分割为层级
	const patternLevels = pattern.split('/');
	const topicLevels = topic.split('/');

	// 检查多层通配符 #
	if (patternLevels[patternLevels.length - 1] === '#') {
		// # 前面的所有层级必须匹配
		for (let i = 0; i < patternLevels.length - 1; i += 1) {
			if (patternLevels[i] !== '+' && patternLevels[i] !== topicLevels[i]) {
				return false;
			}
		}
		return topicLevels.length >= patternLevels.length - 1;
	}

	// 层级数量必须相同
	if (patternLevels.length !== topicLevels.length) {
		return false;
	}

	// 逐层匹配（支持单层通配符 +）
	for (let i = 0; i < patternLevels.length; i += 1) {
		if (patternLevels[i] !== '+' && patternLevels[i] !== topicLevels[i]) {
			return false;
		}
	}

	return true;
}

/**
 * MQTT 客户端接口
 */
export interface MqttClient {
	/**
	 * 连接到 MQTT Broker
	 * @throws {Error} 连接失败时抛出
	 */
	connect: () => Promise<void>;

	/**
	 * 发布消息
	 * @param topic - 主题
	 * @param payload - 载荷（对象会自动序列化为 JSON）
	 * @throws {Error} 发布失败时抛出
	 */
	publish: (topic: string, payload: unknown) => Promise<void>;

	/**
	 * 订阅主题
	 * @param topic - 主题
	 * @param handler - 消息处理器
	 * @throws {Error} 订阅失败时抛出
	 */
	subscribe: (topic: string, handler: MessageHandler) => Promise<void>;

	/**
	 * 断开连接
	 * @throws {Error} 断开失败时抛出
	 */
	disconnect: () => Promise<void>;
}

const DEFAULT_KEEPALIVE_SECONDS = 60;
const RECONNECT_PERIOD_MS = 1000;
const CLIENT_ID_RANDOM_START = 2;
const CLIENT_ID_RANDOM_END = 11;
const TIMESTAMP_RADIX = 36;

/**
 * 序列化 payload
 */
function serializePayload(payload: unknown): string {
	if (typeof payload === 'object' && payload !== null) {
		try {
			return JSON.stringify(payload);
		} catch (err) {
			const causeError = err instanceof Error ? err : new Error(String(err));
			const { message } = causeError;
			throw new Error(`Failed to serialize payload to JSON: ${message}`, {
				cause: err,
			});
		}
	}
	return String(payload);
}

/**
 * 验证 Broker URL
 */
function validateBrokerUrl(brokerUrl: string): void {
	if (typeof brokerUrl !== 'string' || brokerUrl.trim().length === 0) {
		throw new TypeError('brokerUrl must be a non-empty string');
	}

	try {
		const url = new URL(brokerUrl);
		if (!['mqtt:', 'mqtts:', 'ws:', 'wss:'].includes(url.protocol)) {
			throw new TypeError(
				`Invalid protocol in brokerUrl: ${url.protocol}. Expected mqtt:, mqtts:, ws:, or wss:`
			);
		}
	} catch {
		throw new TypeError(
			`Invalid brokerUrl format: ${brokerUrl}. Expected format: mqtt://host:port`,
			{ cause: new Error('URL parsing failed') }
		);
	}
}

/**
 * 构建连接选项
 */
function buildConnectOptions(opts: MqttClientOptions): IClientOptions {
	const clientId =
		opts.clientId ??
		`iotex_${Date.now()}_${Math.random().toString(TIMESTAMP_RADIX).slice(CLIENT_ID_RANDOM_START, CLIENT_ID_RANDOM_END)}`;

	const connectOptions: IClientOptions = {
		clientId,
		keepalive: opts.keepalive ?? DEFAULT_KEEPALIVE_SECONDS,
		clean: true,
		reconnectPeriod: RECONNECT_PERIOD_MS,
	};

	if (typeof opts.username === 'string' && opts.username.length > 0) {
		connectOptions.username = opts.username;
	}
	if (typeof opts.password === 'string' && opts.password.length > 0) {
		connectOptions.password = opts.password;
	}

	return connectOptions;
}

/**
 * 客户端监听器配置
 */
interface ClientListenersConfig {
	mqttClient: NativeMqttClient;
	subscriptions: Map<string, MessageHandler>;
	restoreSubscriptions: (client: NativeMqttClient) => void;
	resolve: () => void;
	reject: (err: Error) => void;
}

/**
 * 设置客户端事件监听器
 */
function setupClientListeners(config: ClientListenersConfig): void {
	const { mqttClient, subscriptions, restoreSubscriptions, resolve, reject } = config;

	// 连接成功
	mqttClient.once('connect', () => {
		restoreSubscriptions(mqttClient);
		resolve();
	});

	// 连接错误
	mqttClient.once('error', (err: Error) => {
		reject(
			new Error(`Failed to connect to MQTT broker: ${err.message}`, {
				cause: err,
			})
		);
	});

	// 重连时恢复订阅
	mqttClient.on('reconnect', () => {
		restoreSubscriptions(mqttClient);
	});

	// 消息处理
	mqttClient.on('message', (topic: string, message: Buffer) => {
		// 遍历所有订阅，找到匹配的处理器（支持通配符）
		for (const [pattern, handler] of subscriptions.entries()) {
			if (matchTopic(pattern, topic)) {
				try {
					handler(message);
				} catch (handlerErr) {
					console.error(`Error in message handler for topic "${topic}":`, handlerErr);
				}
			}
		}
	});
}

/**
 * MQTT 客户端实现配置
 */
interface MqttClientImplConfig {
	brokerUrl: string;
	connectOptions: IClientOptions;
	subscriptions: Map<string, MessageHandler>;
}

/**
 * 创建连接方法
 */
function createConnectMethod(
	config: MqttClientImplConfig,
	clientRef: { current: NativeMqttClient | null }
): () => Promise<void> {
	return async function connect(): Promise<void> {
		if (clientRef.current?.connected === true) {
			throw new Error('MQTT client is already connected');
		}

		return new Promise<void>((resolve, reject) => {
			try {
				clientRef.current = mqtt.connect(config.brokerUrl, config.connectOptions);
				const mqttClient = clientRef.current;

				function restoreSubscriptions(client: NativeMqttClient): void {
					if (config.subscriptions.size > 0) {
						const topics = Array.from(config.subscriptions.keys());
						client.subscribe(topics, (err) => {
							if (err) {
								console.error('Failed to restore subscriptions:', err);
							}
						});
					}
				}

				setupClientListeners({
					mqttClient,
					subscriptions: config.subscriptions,
					restoreSubscriptions,
					resolve,
					reject,
				});
			} catch (err) {
				const error = err instanceof Error ? err : new Error(String(err));
				reject(err instanceof Error ? err : new Error('Failed to connect', { cause: error }));
			}
		});
	};
}

/**
 * 创建发布方法
 */
function createPublishMethod(clientRef: {
	current: NativeMqttClient | null;
}): (topic: string, payload: unknown) => Promise<void> {
	return async function publish(topic: string, payload: unknown): Promise<void> {
		if (clientRef.current?.connected !== true) {
			throw new Error('MQTT client is not connected');
		}

		if (typeof topic !== 'string' || topic.trim().length === 0) {
			throw new TypeError('topic must be a non-empty string');
		}

		const mqttClient = clientRef.current;
		const payloadStr = serializePayload(payload);

		return new Promise<void>((resolve, reject) => {
			mqttClient.publish(topic, payloadStr, (err) => {
				if (err) {
					reject(
						new Error(`Failed to publish to topic "${topic}": ${err.message}`, {
							cause: err,
						})
					);
				} else {
					resolve();
				}
			});
		});
	};
}

/**
 * 创建订阅方法
 */
function createSubscribeMethod(
	config: MqttClientImplConfig,
	clientRef: { current: NativeMqttClient | null }
): (topic: string, handler: MessageHandler) => Promise<void> {
	return async function subscribe(topic: string, handler: MessageHandler): Promise<void> {
		if (clientRef.current?.connected !== true) {
			throw new Error('MQTT client is not connected');
		}

		if (typeof topic !== 'string' || topic.trim().length === 0) {
			throw new TypeError('topic must be a non-empty string');
		}

		if (typeof handler !== 'function') {
			throw new TypeError('handler must be a function');
		}

		const mqttClient = clientRef.current;

		return new Promise<void>((resolve, reject) => {
			mqttClient.subscribe(topic, (err) => {
				if (err) {
					reject(
						new Error(`Failed to subscribe to topic "${topic}": ${err.message}`, {
							cause: err,
						})
					);
				} else {
					config.subscriptions.set(topic, handler);
					resolve();
				}
			});
		});
	};
}

/**
 * 创建断开连接方法
 */
function createDisconnectMethod(
	config: MqttClientImplConfig,
	clientRef: { current: NativeMqttClient | null }
): () => Promise<void> {
	return async function disconnect(): Promise<void> {
		if (!clientRef.current) {
			return; // 幂等：未连接时直接返回
		}

		const mqttClient = clientRef.current;

		return new Promise<void>((resolve, reject) => {
			try {
				mqttClient.end(false, {}, (err?: Error) => {
					if (err) {
						reject(
							new Error(`Failed to disconnect from MQTT broker: ${err.message}`, {
								cause: err,
							})
						);
					} else {
						clientRef.current = null;
						config.subscriptions.clear();
						resolve();
					}
				});
			} catch (err) {
				const error = err instanceof Error ? err : new Error(String(err));
				reject(err instanceof Error ? err : new Error('Disconnect failed', { cause: error }));
			}
		});
	};
}

/**
 * 创建 MQTT 客户端实现
 */
function createMqttClientImplementation(config: MqttClientImplConfig): MqttClient {
	const clientRef = { current: null as NativeMqttClient | null };

	return {
		connect: createConnectMethod(config, clientRef),
		publish: createPublishMethod(clientRef),
		subscribe: createSubscribeMethod(config, clientRef),
		disconnect: createDisconnectMethod(config, clientRef),
	};
}

/**
 * 创建 MQTT 客户端
 * @param brokerUrl - Broker URL（如 mqtt://localhost:1883）
 * @param opts - 客户端配置选项
 * @returns MQTT 客户端实例
 * @throws {TypeError} brokerUrl 为空或格式非法时抛出
 */
export function createMqttClient(brokerUrl: string, opts: MqttClientOptions = {}): MqttClient {
	validateBrokerUrl(brokerUrl);

	const subscriptions = new Map<string, MessageHandler>();
	const connectOptions = buildConnectOptions(opts);

	return createMqttClientImplementation({
		brokerUrl,
		connectOptions,
		subscriptions,
	});
}
