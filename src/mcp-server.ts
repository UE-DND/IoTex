/**
 * MCP 服务器完整实现
 * 实现 MCP 2025-06-18 协议规范
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListResourcesRequestSchema,
	ListToolsRequestSchema,
	ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { DeviceManager } from './core/device-manager.js';
import { createLogger } from './infrastructure/logger.js';
import { getMcpToolDefinitions } from './server.js';
import { createInMemoryStateStore } from './storage/state-store.js';

/**
 * MCP 服务器配置
 */
export interface McpServerConfig {
	name: string;
	version: string;
}

const JSON_INDENT = 2;

/**
 * 创建服务器实例
 */
function createServerInstance(config: McpServerConfig): Server {
	return new Server(
		{
			name: config.name,
			version: config.version,
		},
		{
			capabilities: {
				// 声明服务器能力
				resources: {
					subscribe: false, // 暂不支持订阅
					listChanged: false, // 暂不支持列表变化通知
				},
				tools: {
					listChanged: false, // 暂不支持工具列表变化通知
				},
				logging: {}, // 支持日志记录
			},
		}
	);
}

// ==================== 工具实现函数（前置声明）====================

/**
 * 设备状态响应内容
 */
interface DeviceStateContent {
	deviceId: string;
	state: Record<string, unknown>;
	lastUpdated: string;
}

/**
 * 验证设备ID
 */
function validateDeviceId(deviceId: unknown): asserts deviceId is string {
	if (typeof deviceId !== 'string' || deviceId.trim().length === 0) {
		const error = new Error('Invalid arguments: device_id is required');
		Object.assign(error, { code: -32602 });
		throw error;
	}
}

/**
 * 获取设备状态
 */
async function handleGetDeviceState(
	deviceManager: DeviceManager,
	args: Record<string, unknown>
): Promise<{
	content: { type: string; text: string }[];
	structuredContent?: DeviceStateContent;
	isError: boolean;
}> {
	// API schema 使用 device_id (snake_case)
	const deviceId = typeof args.device_id === 'string' ? args.device_id : '';
	validateDeviceId(deviceId);

	const device = deviceManager.getDevice(deviceId);
	if (!device) {
		return {
			content: [
				{
					type: 'text',
					text: `Device not found: ${deviceId}`,
				},
			],
			isError: true,
		};
	}

	const state = await deviceManager.getDeviceState(deviceId);

	// 返回结构化内容和文本内容（向后兼容）
	const structuredContent: DeviceStateContent = {
		deviceId,
		state: state ?? {},
		lastUpdated: new Date().toISOString(),
	};

	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify(structuredContent, null, JSON_INDENT),
			},
		],
		structuredContent,
		isError: false,
	};
}

/**
 * 命令响应内容
 */
interface CommandResponseContent {
	success: boolean;
	deviceId: string;
	action: string;
	result: Record<string, unknown>;
}

/**
 * 验证命令对象
 */
function validateCommand(command: unknown): asserts command is Record<string, unknown> {
	if (typeof command !== 'object' || command === null) {
		const error = new Error('Invalid arguments: command object is required');
		Object.assign(error, { code: -32602 });
		throw error;
	}
}

/**
 * 验证命令字段
 */
function validateCommandFields(deviceId: unknown, action: unknown): void {
	if (
		typeof deviceId !== 'string' ||
		deviceId.trim().length === 0 ||
		typeof action !== 'string' ||
		action.trim().length === 0
	) {
		const error = new Error('Invalid command: deviceId and action are required');
		Object.assign(error, { code: -32602 });
		throw error;
	}
}

/**
 * 判断是否为普通对象
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 提取命令参数
 */
function extractCommandParams(params: unknown): Record<string, unknown> {
	if (isPlainObject(params)) {
		return params;
	}
	return {};
}

/**
 * 执行通用命令
 */
async function handleExecuteCommand(
	deviceManager: DeviceManager,
	args: Record<string, unknown>
): Promise<{
	content: { type: string; text: string }[];
	structuredContent?: CommandResponseContent;
	isError: boolean;
}> {
	const { command } = args;
	validateCommand(command);

	// API schema 使用 device_id (snake_case)
	const deviceId = typeof command.device_id === 'string' ? command.device_id : '';
	const action = typeof command.action === 'string' ? command.action : '';

	// 安全地提取 params，使用类型守卫
	const params = extractCommandParams(command.params);

	validateCommandFields(deviceId, action);

	const device = deviceManager.getDevice(deviceId);
	if (!device) {
		return {
			content: [
				{
					type: 'text',
					text: `Device not found: ${deviceId}`,
				},
			],
			isError: true,
		};
	}

	// 应用状态变化（这里简化实现，实际应该通过适配器执行）
	const patch = { action, params, timestamp: new Date().toISOString() };
	const updatedState = await deviceManager.applyStatePatch(deviceId, patch);

	const structuredContent: CommandResponseContent = {
		success: true,
		deviceId,
		action,
		result: updatedState,
	};

	return {
		content: [
			{
				type: 'text',
				text: `Command executed successfully: ${action} on ${deviceId}`,
			},
			{
				type: 'text',
				text: JSON.stringify(structuredContent, null, JSON_INDENT),
			},
		],
		structuredContent,
		isError: false,
	};
}

/**
 * 灯泡控制响应内容
 */
interface LightControlContent {
	success: boolean;
	deviceId: string;
	state: Record<string, unknown>;
}

/**
 * 构建灯泡状态补丁
 */
function buildLightPatch(args: Record<string, unknown>): Record<string, unknown> {
	const patch: Record<string, unknown> = {
		timestamp: new Date().toISOString(),
	};

	if (args.power !== undefined) {
		patch.power = args.power;
	}
	if (args.brightness !== undefined) {
		patch.brightness = args.brightness;
	}
	if (args.colorMode !== undefined) {
		patch.colorMode = args.colorMode;
	}
	if (args.colorTemp !== undefined) {
		patch.colorTemp = args.colorTemp;
	}
	if (args.colorXy !== undefined) {
		patch.colorXy = args.colorXy;
	}

	return patch;
}

/**
 * 控制智能灯泡
 */
async function handleControlSmartLight(
	deviceManager: DeviceManager,
	args: Record<string, unknown>
): Promise<{
	content: { type: string; text: string }[];
	structuredContent?: LightControlContent;
	isError: boolean;
}> {
	// API schema 使用 device_id (snake_case)
	const deviceId = typeof args.device_id === 'string' ? args.device_id : '';
	validateDeviceId(deviceId);

	const device = deviceManager.getDevice(deviceId);
	if (!device) {
		return {
			content: [
				{
					type: 'text',
					text: `Device not found: ${deviceId}`,
				},
			],
			isError: true,
		};
	}

	// 构建状态补丁
	const patch = buildLightPatch(args);

	// 应用状态变化
	const updatedState = await deviceManager.applyStatePatch(deviceId, patch);

	const structuredContent: LightControlContent = {
		success: true,
		deviceId,
		state: updatedState,
	};

	return {
		content: [
			{
				type: 'text',
				text: `Smart light controlled successfully: ${deviceId}`,
			},
			{
				type: 'text',
				text: JSON.stringify(structuredContent, null, JSON_INDENT),
			},
		],
		structuredContent,
		isError: false,
	};
}

/**
 * 设置资源处理器
 */
function setupResourceHandlers(
	server: Server,
	deviceManager: DeviceManager,
	logger: ReturnType<typeof createLogger>
): void {
	/**
	 * 处理资源列表请求
	 * 实现 MCP 协议 resources/list
	 */
	server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
		logger.info('Handling resources/list request', { params: request.params });

		try {
			const resources = await deviceManager.getDeviceStates();

			return {
				resources: resources.map((resource) => ({
					uri: resource.uri,
					name: resource.name,
					title: resource.title,
					description: resource.description,
					mimeType: resource.mimeType,
				})),
			};
		} catch (err) {
			logger.error('Failed to list resources', { error: err });
			throw err;
		}
	});

	/**
	 * 处理资源读取请求
	 * 实现 MCP 协议 resources/read
	 */
	server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
		logger.info('Handling resources/read request', {
			uri: request.params.uri,
		});

		try {
			const resource = await deviceManager.readDeviceResource(request.params.uri);

			if (!resource) {
				const error = new Error('Resource not found');
				Object.assign(error, {
					code: -32002,
					data: { uri: request.params.uri },
				});
				throw error;
			}

			return {
				contents: [
					{
						uri: resource.uri,
						name: resource.name,
						title: resource.title,
						mimeType: resource.mimeType,
						text: resource.text,
					},
				],
			};
		} catch (err) {
			logger.error('Failed to read resource', {
				uri: request.params.uri,
				error: err,
			});
			throw err;
		}
	});
}

/**
 * 设置工具处理器
 */
function setupToolHandlers(
	server: Server,
	deviceManager: DeviceManager,
	logger: ReturnType<typeof createLogger>
): void {
	/**
	 * 处理工具列表请求
	 * 实现 MCP 协议 tools/list
	 */
	server.setRequestHandler(ListToolsRequestSchema, () => {
		logger.info('Handling tools/list request');

		const tools = getMcpToolDefinitions();

		return {
			tools: tools.map((tool) => ({
				name: tool.name,
				title: tool.title,
				description: tool.description,
				inputSchema: tool.inputSchema,
			})),
		};
	});

	/**
	 * 处理工具调用请求
	 * 实现 MCP 协议 tools/call
	 */
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		logger.info('Handling tools/call request', {
			tool: request.params.name,
			arguments: request.params.arguments,
		});

		try {
			const { name, arguments: args } = request.params;
			const toolArgs = args ?? {};

			// 根据工具名称路由到相应的处理函数
			switch (name) {
				case 'get_device_state':
					return await handleGetDeviceState(deviceManager, toolArgs);

				case 'execute_command':
					return await handleExecuteCommand(deviceManager, toolArgs);

				case 'control_smart_light':
					return await handleControlSmartLight(deviceManager, toolArgs);

				default: {
					const error = new Error(`Unknown tool: ${name}`);
					Object.assign(error, { code: -32602 });
					throw error;
				}
			}
		} catch (err) {
			logger.error('Tool execution failed', {
				tool: request.params.name,
				error: err,
			});

			// 判断是协议错误还是业务错误
			if (typeof err === 'object' && err !== null && 'code' in err) {
				throw err; // 协议错误
			}

			// 业务错误 - 返回工具执行错误
			const error = err instanceof Error ? err : new Error(String(err));
			return {
				content: [
					{
						type: 'text',
						text: `Tool execution failed: ${error.message}`,
					},
				],
				isError: true,
			};
		}
	});
}

/**
 * 创建并配置 MCP 服务器
 */
export function createMcpServer(config: McpServerConfig): {
	server: Server;
	deviceManager: DeviceManager;
} {
	const logger = createLogger('mcp-server', 'info');

	// 创建状态存储和设备管理器
	const stateStore = createInMemoryStateStore();
	const deviceManager = new DeviceManager(stateStore);

	// 创建 MCP 服务器实例
	const server = createServerInstance(config);

	logger.info('MCP server created', {
		name: config.name,
		version: config.version,
		protocol: '2025-06-18',
	});

	// 设置请求处理器
	setupResourceHandlers(server, deviceManager, logger);
	setupToolHandlers(server, deviceManager, logger);

	return { server, deviceManager };
}

/**
 * 注册示例设备
 */
function registerExampleDevices(deviceManager: DeviceManager): void {
	deviceManager.registerDevice({
		id: 'light-001',
		friendlyName: 'Main Light',
		location: 'Living Room',
		type: 'smart_light',
		capabilities: ['power', 'brightness', 'color_temp'],
		protocol: 'mqtt',
	});
}

/**
 * 设置优雅关闭处理器
 */
function setupGracefulShutdown(server: Server, logger: ReturnType<typeof createLogger>): void {
	const handleShutdown = async (signal: string): Promise<void> => {
		logger.info(`Received ${signal}, shutting down gracefully`);
		await server.close();
		process.exit(0);
	};

	process.on('SIGINT', () => {
		handleShutdown('SIGINT').catch((err: unknown) => {
			logger.error('Error during shutdown', { error: err });
			process.exit(1);
		});
	});

	process.on('SIGTERM', () => {
		handleShutdown('SIGTERM').catch((err: unknown) => {
			logger.error('Error during shutdown', { error: err });
			process.exit(1);
		});
	});
}

/**
 * 启动 MCP 服务器（stdio 传输）
 */
export async function startMcpServer(config: McpServerConfig): Promise<void> {
	const { server, deviceManager } = createMcpServer(config);
	const logger = createLogger('mcp-server', 'info');

	// 注册一些示例设备（实际应该从配置文件加载）
	registerExampleDevices(deviceManager);

	logger.info('Starting MCP server with stdio transport');

	// 连接 stdio 传输
	const transport = new StdioServerTransport();
	await server.connect(transport);

	logger.info('MCP server started and ready');

	// 处理优雅关闭
	setupGracefulShutdown(server, logger);
}
