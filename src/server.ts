/**
 * MCP 服务器模块
 * 基于 MCP SDK 注册资源与工具，桥接到 Core 层
 */

/**
 * MCP 工具定义接口
 */
export interface McpToolDefinition {
	name: string;
	title?: string;
	description: string;
	inputSchema: Record<string, unknown>;
	outputSchema?: Record<string, unknown>;
}

/**
 * 创建设备状态查询工具定义
 */
function createGetDeviceStateTool(): McpToolDefinition {
	return {
		name: 'get_device_state',
		title: 'Device State Query',
		description: 'Query the current state of a device by its ID',
		inputSchema: {
			type: 'object',
			properties: {
				// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
				device_id: {
					type: 'string',
					description: 'The unique identifier of the device',
				},
			},
			required: ['device_id'],
		},
		outputSchema: {
			type: 'object',
			properties: {
				// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
				device_id: {
					type: 'string',
					description: 'The device identifier',
				},
				state: {
					type: 'object',
					description: 'Current device state',
				},
				// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
				last_updated: {
					type: 'string',
					description: 'ISO 8601 timestamp of last update',
				},
			},
			required: ['device_id', 'state'],
		},
	};
}

/**
 * 创建命令执行工具定义
 */
function createExecuteCommandTool(): McpToolDefinition {
	return {
		name: 'execute_command',
		title: 'Device Command Executor',
		description: 'Execute a generic command on a device',
		inputSchema: {
			type: 'object',
			properties: {
				command: {
					type: 'object',
					description: 'Command object containing device_id and action parameters',
					properties: {
						// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
						device_id: {
							type: 'string',
							description: 'The unique identifier of the device',
						},
						action: {
							type: 'string',
							description: 'The action to perform (e.g., on, off, toggle)',
						},
						params: {
							type: 'object',
							description: 'Optional parameters for the command',
						},
					},
					required: ['device_id', 'action'],
				},
			},
			required: ['command'],
		},
		outputSchema: {
			type: 'object',
			properties: {
				success: {
					type: 'boolean',
					description: 'Whether the command executed successfully',
				},
				// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
				device_id: {
					type: 'string',
					description: 'The device identifier',
				},
				action: {
					type: 'string',
					description: 'The executed action',
				},
				result: {
					type: 'object',
					description: 'Command execution result',
				},
			},
			required: ['success', 'device_id', 'action'],
		},
	};
}

/**
 * 创建智能灯控制工具定义
 */
function createControlSmartLightTool(): McpToolDefinition {
	return {
		name: 'control_smart_light',
		title: 'Smart Light Controller',
		description: 'Control a smart light bulb with brightness and color settings',
		inputSchema: {
			type: 'object',
			properties: {
				// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
				device_id: {
					type: 'string',
					description: 'The unique identifier of the light device',
				},
				power: {
					type: 'string',
					enum: ['on', 'off'],
					description: 'Turn the light on or off',
				},
				brightness: {
					type: 'number',
					minimum: 0,
					maximum: 255,
					description: 'Brightness level (0-255)',
				},
				// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
				color_mode: {
					type: 'string',
					enum: ['color_temp', 'xy'],
					description: 'Color mode: color temperature or XY coordinates',
				},
				// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
				color_temp: {
					type: 'number',
					minimum: 1500,
					maximum: 6500,
					description: 'Color temperature in Kelvin (1500-6500)',
				},
				// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
				color_xy: {
					type: 'array',
					items: {
						type: 'number',
						minimum: 0,
						maximum: 1,
					},
					minItems: 2,
					maxItems: 2,
					description: 'XY color coordinates [x, y] (0-1)',
				},
			},
			required: ['device_id'],
		},
		outputSchema: {
			type: 'object',
			properties: {
				success: {
					type: 'boolean',
					description: 'Whether the control command succeeded',
				},
				// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
				device_id: {
					type: 'string',
					description: 'The device identifier',
				},
				state: {
					type: 'object',
					description: 'Updated light state',
					properties: {
						power: { type: 'string', enum: ['on', 'off'] },
						brightness: { type: 'number' },
						// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
						color_mode: { type: 'string' },
						// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
						color_temp: { type: 'number' },
						// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- API schema uses snake_case
						color_xy: { type: 'array' },
					},
				},
			},
			required: ['success', 'device_id', 'state'],
		},
	};
}

/**
 * 获取 MCP 工具定义列表
 * @returns 工具定义数组，包含至少三个工具
 */
export function getMcpToolDefinitions(): McpToolDefinition[] {
	return [createGetDeviceStateTool(), createExecuteCommandTool(), createControlSmartLightTool()];
}
