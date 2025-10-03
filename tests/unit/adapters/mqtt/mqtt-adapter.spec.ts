/**
 * 单元测试：mqtt-adapter.ts
 * 测试 MQTT 主题到设备ID的映射
 */

import { mapTopicToDeviceId } from '../../../../src/adapters/mqtt/mqtt-adapter.js';

describe('adapters/mqtt/mqtt-adapter', () => {
	describe('mapTopicToDeviceId', () => {
		it('正确提取设备ID - 基本情况', () => {
			const deviceId = mapTopicToDeviceId('zigbee2mqtt', 'zigbee2mqtt/lamp/state');
			expect(deviceId).toBe('lamp');
		});

		it('正确提取设备ID - 复杂设备名', () => {
			const deviceId = mapTopicToDeviceId('zigbee2mqtt', 'zigbee2mqtt/living_room_light_1/state');
			expect(deviceId).toBe('living_room_light_1');
		});

		it('主题不匹配基础路径返回 null', () => {
			const deviceId = mapTopicToDeviceId('zigbee2mqtt', 'tasmota/sensor/state');
			expect(deviceId).toBeNull();
		});

		it('主题不以 /state 结尾返回 null', () => {
			const deviceId = mapTopicToDeviceId('zigbee2mqtt', 'zigbee2mqtt/lamp/config');
			expect(deviceId).toBeNull();
		});

		it('base 含尾随斜杠仍能匹配', () => {
			const deviceId = mapTopicToDeviceId('zigbee2mqtt/', 'zigbee2mqtt/lamp/state');
			expect(deviceId).toBe('lamp');
		});

		it('base 含多个尾随斜杠仍能匹配', () => {
			const deviceId = mapTopicToDeviceId('zigbee2mqtt///', 'zigbee2mqtt/lamp/state');
			expect(deviceId).toBe('lamp');
		});

		it('base 和 topic 含前后空白能正确处理', () => {
			const deviceId = mapTopicToDeviceId('  zigbee2mqtt  ', '  zigbee2mqtt/lamp/state  ');
			expect(deviceId).toBe('lamp');
		});

		it('空 base 抛出 TypeError', () => {
			expect(() => mapTopicToDeviceId('', 'zigbee2mqtt/lamp/state')).toThrow(TypeError);
			expect(() => mapTopicToDeviceId('', 'zigbee2mqtt/lamp/state')).toThrow(
				'base must be a non-empty string'
			);
		});

		it('纯空白 base 抛出 TypeError', () => {
			expect(() => mapTopicToDeviceId('   ', 'zigbee2mqtt/lamp/state')).toThrow(TypeError);
		});

		it('空 topic 抛出 TypeError', () => {
			expect(() => mapTopicToDeviceId('zigbee2mqtt', '')).toThrow(TypeError);
			expect(() => mapTopicToDeviceId('zigbee2mqtt', '')).toThrow(
				'topic must be a non-empty string'
			);
		});

		it('纯空白 topic 抛出 TypeError', () => {
			expect(() => mapTopicToDeviceId('zigbee2mqtt', '   ')).toThrow(TypeError);
		});

		it('非字符串 base 抛出 TypeError', () => {
			// @ts-expect-error - 故意传入非法类型测试运行时校验
			expect(() => mapTopicToDeviceId(null, 'topic')).toThrow(TypeError);

			// @ts-expect-error - 故意传入非法类型测试运行时校验
			expect(() => mapTopicToDeviceId(123, 'topic')).toThrow(TypeError);
		});

		it('非字符串 topic 抛出 TypeError', () => {
			// @ts-expect-error - 故意传入非法类型测试运行时校验
			expect(() => mapTopicToDeviceId('base', null)).toThrow(TypeError);

			// @ts-expect-error - 故意传入非法类型测试运行时校验
			expect(() => mapTopicToDeviceId('base', 123)).toThrow(TypeError);
		});

		it('主题部分不足返回 null', () => {
			// 只有一个部分（缺少 /state）
			const deviceId1 = mapTopicToDeviceId('zigbee2mqtt', 'zigbee2mqtt/lamp');
			expect(deviceId1).toBeNull();

			// 只有 base
			const deviceId2 = mapTopicToDeviceId('zigbee2mqtt', 'zigbee2mqtt');
			expect(deviceId2).toBeNull();
		});

		it('设备ID部分为空返回 null', () => {
			// deviceId 位置为空
			const deviceId = mapTopicToDeviceId('zigbee2mqtt', 'zigbee2mqtt//state');
			expect(deviceId).toBeNull();
		});

		it('多层级设备路径', () => {
			// 支持多层级，取倒数第二部分
			const deviceId = mapTopicToDeviceId('zigbee2mqtt', 'zigbee2mqtt/floor1/room2/lamp/state');
			expect(deviceId).toBe('lamp');
		});

		it('base 完全匹配但没有后续内容返回 null', () => {
			const deviceId = mapTopicToDeviceId('zigbee2mqtt', 'zigbee2mqtt/');
			expect(deviceId).toBeNull();
		});

		it('主题前缀部分匹配但不完整返回 null', () => {
			// 'zigbee' 是 'zigbee2mqtt' 的前缀，但不应匹配
			const deviceId = mapTopicToDeviceId('zigbee2mqtt', 'zigbee/lamp/state');
			expect(deviceId).toBeNull();
		});
	});
});
