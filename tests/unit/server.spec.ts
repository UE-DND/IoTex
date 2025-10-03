/**
 * 单元测试：server.ts
 * 测试 MCP 工具定义
 */

import { getMcpToolDefinitions } from '../../src/server.js';

describe('server', () => {
	describe('getMcpToolDefinitions', () => {
		it('返回包含三个工具的数组', () => {
			const tools = getMcpToolDefinitions();
			expect(tools).toHaveLength(3);
		});

		it('包含 get_device_state 工具', () => {
			const tools = getMcpToolDefinitions();
			const tool = tools.find((t) => t.name === 'get_device_state');

			expect(tool).toBeDefined();
			expect(tool?.description).toBeTruthy();
			expect(tool?.inputSchema).toBeDefined();
		});

		it('包含 execute_command 工具', () => {
			const tools = getMcpToolDefinitions();
			const tool = tools.find((t) => t.name === 'execute_command');

			expect(tool).toBeDefined();
			expect(tool?.description).toBeTruthy();
			expect(tool?.inputSchema).toBeDefined();
		});

		it('包含 control_smart_light 工具', () => {
			const tools = getMcpToolDefinitions();
			const tool = tools.find((t) => t.name === 'control_smart_light');

			expect(tool).toBeDefined();
			expect(tool?.description).toBeTruthy();
			expect(tool?.inputSchema).toBeDefined();
		});

		it('get_device_state 的 inputSchema 要求 device_id 为必填字符串', () => {
			const tools = getMcpToolDefinitions();
			const tool = tools.find((t) => t.name === 'get_device_state');

			expect(tool?.inputSchema).toHaveProperty('type', 'object');
			expect(tool?.inputSchema).toHaveProperty('properties');
			expect(tool?.inputSchema).toHaveProperty('required');

			const schema = tool?.inputSchema as any;
			expect(schema.properties.device_id).toBeDefined();
			expect(schema.properties.device_id.type).toBe('string');
			expect(schema.required).toContain('device_id');
		});

		it('execute_command 的 inputSchema 包含 command 对象', () => {
			const tools = getMcpToolDefinitions();
			const tool = tools.find((t) => t.name === 'execute_command');

			const schema = tool?.inputSchema as any;
			expect(schema.properties.command).toBeDefined();
			expect(schema.properties.command.type).toBe('object');
			expect(schema.required).toContain('command');

			// 检查 command 对象的属性
			const commandSchema = schema.properties.command;
			expect(commandSchema.properties.device_id).toBeDefined();
			expect(commandSchema.properties.action).toBeDefined();
			expect(commandSchema.properties.params).toBeDefined();
			expect(commandSchema.required).toContain('device_id');
			expect(commandSchema.required).toContain('action');
		});

		it('control_smart_light 的 brightness 范围为 0..255', () => {
			const tools = getMcpToolDefinitions();
			const tool = tools.find((t) => t.name === 'control_smart_light');

			const schema = tool?.inputSchema as any;
			expect(schema.properties.brightness).toBeDefined();
			expect(schema.properties.brightness.type).toBe('number');
			expect(schema.properties.brightness.minimum).toBe(0);
			expect(schema.properties.brightness.maximum).toBe(255);
		});

		it('control_smart_light 的 color_mode 枚举为 ["color_temp", "xy"]', () => {
			const tools = getMcpToolDefinitions();
			const tool = tools.find((t) => t.name === 'control_smart_light');

			const schema = tool?.inputSchema as any;
			expect(schema.properties.color_mode).toBeDefined();
			expect(schema.properties.color_mode.enum).toEqual(['color_temp', 'xy']);
		});

		it('control_smart_light 的 color_temp 范围为 1500..6500', () => {
			const tools = getMcpToolDefinitions();
			const tool = tools.find((t) => t.name === 'control_smart_light');

			const schema = tool?.inputSchema as any;
			expect(schema.properties.color_temp).toBeDefined();
			expect(schema.properties.color_temp.type).toBe('number');
			expect(schema.properties.color_temp.minimum).toBe(1500);
			expect(schema.properties.color_temp.maximum).toBe(6500);
		});

		it('control_smart_light 的 power 枚举为 ["on", "off"]', () => {
			const tools = getMcpToolDefinitions();
			const tool = tools.find((t) => t.name === 'control_smart_light');

			const schema = tool?.inputSchema as any;
			expect(schema.properties.power).toBeDefined();
			expect(schema.properties.power.enum).toEqual(['on', 'off']);
		});

		it('control_smart_light 的 color_xy 为长度 2 的数组', () => {
			const tools = getMcpToolDefinitions();
			const tool = tools.find((t) => t.name === 'control_smart_light');

			const schema = tool?.inputSchema as any;
			expect(schema.properties.color_xy).toBeDefined();
			expect(schema.properties.color_xy.type).toBe('array');
			expect(schema.properties.color_xy.minItems).toBe(2);
			expect(schema.properties.color_xy.maxItems).toBe(2);
			expect(schema.properties.color_xy.items.type).toBe('number');
			expect(schema.properties.color_xy.items.minimum).toBe(0);
			expect(schema.properties.color_xy.items.maximum).toBe(1);
		});

		it('所有工具都有 name 和 description', () => {
			const tools = getMcpToolDefinitions();

			tools.forEach((tool) => {
				expect(tool.name).toBeTruthy();
				expect(typeof tool.name).toBe('string');
				expect(tool.description).toBeTruthy();
				expect(typeof tool.description).toBe('string');
			});
		});

		it('所有工具的 name 唯一', () => {
			const tools = getMcpToolDefinitions();
			const names = tools.map((t) => t.name);
			const uniqueNames = new Set(names);

			expect(uniqueNames.size).toBe(names.length);
		});

		it('每次调用返回相同的工具定义', () => {
			const tools1 = getMcpToolDefinitions();
			const tools2 = getMcpToolDefinitions();

			expect(tools1).toEqual(tools2);
		});
	});
});
