/**
 * 单元测试：index.ts
 * 测试运行时配置解析
 */

import { resolveRuntimeConfigFromEnv } from '../../src/index.js';

describe('index', () => {
	describe('resolveRuntimeConfigFromEnv', () => {
		it('提供 MQTT_URL 时正确解析', () => {
			const env = {
				MQTT_URL: 'mqtt://localhost:1883',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config.mqttUrl).toBe('mqtt://localhost:1883');
		});

		it('未提供任何变量时返回空对象', () => {
			const env = {};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config).toEqual({});
			expect(Object.keys(config)).toHaveLength(0);
		});

		it('MQTT_URL 为空字符串抛出 TypeError', () => {
			const env = {
				MQTT_URL: '',
			};

			expect(() => resolveRuntimeConfigFromEnv(env)).toThrow(TypeError);
			expect(() => resolveRuntimeConfigFromEnv(env)).toThrow('MQTT_URL is provided but empty');
		});

		it('MQTT_URL 为纯空白抛出 TypeError', () => {
			const env = {
				MQTT_URL: '   ',
			};

			expect(() => resolveRuntimeConfigFromEnv(env)).toThrow(TypeError);
		});

		it('提供 IOTEX_CONFIG 时解析为 configPath', () => {
			const env = {
				IOTEX_CONFIG: '/path/to/config.yaml',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config.configPath).toBe('/path/to/config.yaml');
		});

		it('提供 CONFIG_PATH 时解析为 configPath', () => {
			const env = {
				CONFIG_PATH: '/path/to/config.yaml',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config.configPath).toBe('/path/to/config.yaml');
		});

		it('IOTEX_CONFIG 优先于 CONFIG_PATH', () => {
			const env = {
				IOTEX_CONFIG: '/path/to/iotex.yaml',
				CONFIG_PATH: '/path/to/config.yaml',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config.configPath).toBe('/path/to/iotex.yaml');
		});

		it('IOTEX_CONFIG 为空字符串抛出 TypeError', () => {
			const env = {
				IOTEX_CONFIG: '',
			};

			expect(() => resolveRuntimeConfigFromEnv(env)).toThrow(TypeError);
			expect(() => resolveRuntimeConfigFromEnv(env)).toThrow('IOTEX_CONFIG is provided but empty');
		});

		it('CONFIG_PATH 为空字符串抛出 TypeError', () => {
			const env = {
				CONFIG_PATH: '',
			};

			expect(() => resolveRuntimeConfigFromEnv(env)).toThrow(TypeError);
			expect(() => resolveRuntimeConfigFromEnv(env)).toThrow('CONFIG_PATH is provided but empty');
		});

		it('提供 MQTT_URL 时正确解析', () => {
			const env = {
				MQTT_URL: 'mqtt://localhost:1883',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config.mqttUrl).toBe('mqtt://localhost:1883');
		});

		it('MQTT_URL 为空字符串抛出 TypeError', () => {
			const env = {
				MQTT_URL: '',
			};

			expect(() => resolveRuntimeConfigFromEnv(env)).toThrow(TypeError);
			expect(() => resolveRuntimeConfigFromEnv(env)).toThrow('MQTT_URL is provided but empty');
		});

		it('配置值含前后空白被正确裁剪', () => {
			const env = {
				MQTT_URL: '  mqtt://localhost:1883  ',
				CONFIG_PATH: '  /path/to/config.yaml  ',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config.mqttUrl).toBe('mqtt://localhost:1883');
			expect(config.configPath).toBe('/path/to/config.yaml');
		});

		it('只提供部分配置变量时只返回对应键', () => {
			const env = {
				MQTT_URL: 'mqtt://localhost:1883',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config.mqttUrl).toBe('mqtt://localhost:1883');
			expect(config).not.toHaveProperty('configPath');
		});

		it('提供所有配置变量时全部解析', () => {
			const env = {
				MQTT_URL: 'mqtt://localhost:1883',
				CONFIG_PATH: '/path/to/config.yaml',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config.mqttUrl).toBe('mqtt://localhost:1883');
			expect(config.configPath).toBe('/path/to/config.yaml');
			expect(Object.keys(config)).toHaveLength(2);
		});

		it('变量值为 undefined 时不抛错且不返回该键', () => {
			const env = {
				MQTT_URL: undefined,
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config).not.toHaveProperty('mqttUrl');
		});

		it('环境变量键存在但值为 undefined 时不处理', () => {
			// 模拟 process.env 中键存在但值为 undefined 的情况
			const env: NodeJS.ProcessEnv = {
				MQTT_URL: undefined,
				CONFIG_PATH: '/path/to/config.yaml',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config).not.toHaveProperty('mqttUrl');
			expect(config.configPath).toBe('/path/to/config.yaml');
		});

		it('忽略未定义的环境变量', () => {
			const env = {
				SOME_OTHER_VAR: 'value',
				ANOTHER_VAR: '123',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config).toEqual({});
		});

		it('返回的配置对象不包含空值键', () => {
			const env = {
				MQTT_URL: 'mqtt://localhost:1883',
			};

			const config = resolveRuntimeConfigFromEnv(env);

			expect(config.mqttUrl).toBeDefined();
			expect('configPath' in config).toBe(false);
		});
	});
});
