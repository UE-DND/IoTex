/**
 * 提供内嵌 Aedes MQTT Broker，自动选取可用端口；支撑 Architecture 文档中的 embedded 模式
 *
 * 注意：aedes 是 CommonJS 模块，TypeScript 无法正确推断其类型，
 * 因此禁用了部分 eslint 规则以支持 any 类型的使用
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-redundant-type-constituents */

import { createServer, type Server } from 'node:net';

import aedesModule from 'aedes';

import { createLogger, type Logger } from './logger.js';

// aedes 是 CommonJS 模块，默认导出即为构造函数
const aedes = aedesModule as any as () => any;
type AedesInstance = any;
type Client = any;
type PublishPacket = any;

const DEFAULT_START_PORT = 1883;
const DEFAULT_HOST = '127.0.0.1';
const MAX_PORT_ATTEMPTS = 10;

/**
 * 内嵌 MQTT Broker 配置选项
 */
export interface EmbeddedMqttBrokerOptions {
	/** 起始端口，默认 1883 */
	startPort?: number;
	/** 监听主机，默认 '127.0.0.1' */
	host?: string;
}

/**
 * 内嵌 MQTT Broker 接口
 */
export interface EmbeddedMqttBroker {
	start: () => Promise<void>;
	stop: () => Promise<void>;
	getConnectionUrl: () => string;
	getPort: () => number;
}

/**
 * 测试端口是否可用
 */
async function testPort(port: number, host: string): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const testServer = createServer();

		testServer.once('error', () => {
			resolve(false);
		});

		testServer.listen(port, host, () => {
			testServer.close(() => {
				resolve(true);
			});
		});
	});
}

/**
 * 查找可用端口
 * @param basePort 起始端口
 * @param host 主机地址
 * @param maxAttempts 最大尝试次数
 * @returns 可用端口号
 */
async function findAvailablePort(
	basePort: number,
	host: string,
	maxAttempts = MAX_PORT_ATTEMPTS
): Promise<number> {
	for (let i = 0; i < maxAttempts; i += 1) {
		const port = basePort + i;
		// eslint-disable-next-line no-await-in-loop -- 必须顺序检查端口可用性
		const available = await testPort(port, host);

		if (available) {
			return port;
		}
	}

	throw new Error(
		`Unable to find available port after ${maxAttempts} attempts starting from ${basePort}`
	);
}

/**
 * 监听服务器端口
 */
async function listenServer(server: Server, port: number, host: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		server.listen(port, host, () => {
			resolve();
		});

		server.once('error', (err) => {
			reject(err);
		});
	});
}

/**
 * 关闭 Aedes 实例
 */
async function closeAedes(aedesInstance: AedesInstance): Promise<void> {
	return new Promise<void>((resolve) => {
		aedesInstance.close(() => {
			resolve();
		});
	});
}

/**
 * 关闭 TCP 服务器
 */
async function closeServer(server: Server): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		server.close((err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

/**
 * 设置 Aedes 事件监听器
 */
function setupAedesListeners(aedesInstance: AedesInstance, logger: Logger): void {
	aedesInstance.on('client', (client: Client) => {
		logger.debug('MQTT client connected', { clientId: client.id });
	});

	aedesInstance.on('clientDisconnect', (client: Client) => {
		logger.debug('MQTT client disconnected', { clientId: client.id });
	});

	aedesInstance.on('publish', (packet: PublishPacket, client: Client | null) => {
		if (client !== null) {
			logger.debug('MQTT message published', {
				clientId: client.id,
				topic: packet.topic,
			});
		}
	});
}

/**
 * 创建并配置 MQTT broker
 */
async function createAndConfigureBroker(
	port: number,
	host: string,
	logger: Logger
): Promise<{ aedesInstance: AedesInstance; tcpServer: Server }> {
	// 创建 Aedes 实例（aedes 本身就是构造函数）
	const aedesInstance = aedes();

	// 创建 TCP 服务器
	const tcpServer = createServer(aedesInstance.handle);

	// 启动服务器
	await listenServer(tcpServer, port, host);

	// 设置事件监听器
	setupAedesListeners(aedesInstance, logger);

	return { aedesInstance, tcpServer };
}

/**
 * 关闭 broker 资源配置
 */
interface CloseBrokerConfig {
	aedesInstance: AedesInstance;
	server: Server;
	logger: Logger;
	port: number;
}

/**
 * 清理 broker 状态
 */
interface CleanupState {
	aedesInstance: AedesInstance | null;
	server: Server | null;
	actualPort: number;
}

/**
 * 关闭 broker 资源
 */
async function closeBrokerResources(config: CloseBrokerConfig): Promise<void> {
	await closeAedes(config.aedesInstance);
	await closeServer(config.server);
	config.logger.info('Embedded MQTT broker stopped', { port: config.port });
}

/**
 * 创建内嵌 MQTT Broker
 * @param opts 配置选项
 * @returns 内嵌 MQTT Broker 实例
 */
export function createEmbeddedMqttBroker(opts?: EmbeddedMqttBrokerOptions): EmbeddedMqttBroker {
	const startPort = opts?.startPort ?? DEFAULT_START_PORT;
	const host = opts?.host ?? DEFAULT_HOST;
	const logger: Logger = createLogger('embedded-mqtt-broker', 'info');

	// 使用对象封装状态，避免竞态条件警告
	const state: CleanupState = {
		aedesInstance: null,
		server: null,
		actualPort: 0,
	};
	let isStarted = false;

	async function start(): Promise<void> {
		if (isStarted) {
			throw new Error('Embedded MQTT broker is already started');
		}

		// 查找可用端口
		const port = await findAvailablePort(startPort, host);

		// 创建并配置 broker
		const brokerResult = await createAndConfigureBroker(port, host, logger);

		// 更新状态 - 在 await 后的同步赋值是安全的
		state.aedesInstance = brokerResult.aedesInstance;
		state.server = brokerResult.tcpServer;
		state.actualPort = port;
		// eslint-disable-next-line require-atomic-updates -- 所有异步操作已完成，赋值是安全的
		isStarted = true;

		logger.info('Embedded MQTT broker started', {
			host,
			port,
			url: `mqtt://${host}:${port}`,
		});
	}

	async function stop(): Promise<void> {
		if (!isStarted || state.aedesInstance === null || state.server === null) {
			return;
		}

		// 保存当前状态的快照
		const savedAedes = state.aedesInstance;
		const savedServer = state.server;
		const savedPort = state.actualPort;

		// 先清理状态标志
		isStarted = false;

		try {
			await closeBrokerResources({
				aedesInstance: savedAedes,
				server: savedServer,
				logger,
				port: savedPort,
			});
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error('Error stopping embedded MQTT broker', {
				error: err.message,
			});
			throw err;
		} finally {
			// 清理资源引用 - finally 块中的清理操作是安全的
			// eslint-disable-next-line require-atomic-updates -- finally 块保证执行
			state.aedesInstance = null;
			// eslint-disable-next-line require-atomic-updates -- finally 块保证执行
			state.server = null;
			// eslint-disable-next-line require-atomic-updates -- finally 块保证执行
			state.actualPort = 0;
		}
	}

	function getConnectionUrl(): string {
		if (!isStarted) {
			throw new Error('Broker not started yet');
		}
		return `mqtt://${host}:${state.actualPort}`;
	}

	function getPort(): number {
		if (!isStarted) {
			throw new Error('Broker not started yet');
		}
		return state.actualPort;
	}

	return {
		start,
		stop,
		getConnectionUrl,
		getPort,
	};
}

/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-redundant-type-constituents */
