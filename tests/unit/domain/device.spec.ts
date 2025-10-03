/**
 * 单元测试：domain/device.ts
 */

import { buildDeviceResourceUri } from '../../../src/domain/device.js';

describe('domain/device', () => {
	describe('buildDeviceResourceUri', () => {
		// 用例1：基本功能，正确生成 URI
		it('基本功能，正确生成 URI', () => {
			const result = buildDeviceResourceUri({
				location: 'living_room',
				friendlyName: 'Main Light',
			});
			expect(result).toBe('iot://home/living-room/main-light/state');
		});

		// 用例2：归一化处理空白和大小写
		it('归一化处理空白和大小写', () => {
			const result = buildDeviceResourceUri({
				location: 'Living-Room',
				friendlyName: '  MAIN   LIGHT  ',
			});
			expect(result).toBe('iot://home/living-room/main-light/state');
		});

		// 用例3：空字符串 location 应抛出 TypeError
		it('空字符串 location 应抛出 TypeError', () => {
			expect(() =>
				buildDeviceResourceUri({
					location: '',
					friendlyName: 'Light',
				})
			).toThrow(TypeError);
		});

		// 用例4：空字符串 friendlyName 应抛出 TypeError
		it('空字符串 friendlyName 应抛出 TypeError', () => {
			expect(() =>
				buildDeviceResourceUri({
					location: 'living_room',
					friendlyName: '',
				})
			).toThrow(TypeError);
		});

		// 用例5：仅空白的 location 应抛出 TypeError
		it('仅空白的 location 应抛出 TypeError', () => {
			expect(() =>
				buildDeviceResourceUri({
					location: '   ',
					friendlyName: 'Light',
				})
			).toThrow(TypeError);
		});

		// 用例6：仅空白的 friendlyName 应抛出 TypeError
		it('仅空白的 friendlyName 应抛出 TypeError', () => {
			expect(() =>
				buildDeviceResourceUri({
					location: 'living_room',
					friendlyName: '   ',
				})
			).toThrow(TypeError);
		});

		// 用例7：特殊字符归一化
		it('特殊字符归一化', () => {
			const result = buildDeviceResourceUri({
				location: 'living_room',
				friendlyName: 'Main.Light@Home',
			});
			expect(result).toBe('iot://home/living-room/main-light-home/state');
		});

		// 用例8：URI 格式固定
		it('URI 格式固定', () => {
			const result = buildDeviceResourceUri({
				location: 'bedroom',
				friendlyName: 'lamp',
			});
			expect(result).toMatch(/^iot:\/\/home\//);
		});

		// 用例9：URI 总是以 /state 结尾
		it('URI 总是以 /state 结尾', () => {
			const result = buildDeviceResourceUri({
				location: 'kitchen',
				friendlyName: 'light',
			});
			expect(result).toMatch(/\/state$/);
		});

		// 用例10：下划线转换为连字符
		it('下划线转换为连字符', () => {
			const result = buildDeviceResourceUri({
				location: 'living_room_main',
				friendlyName: 'ceiling_light',
			});
			expect(result).toBe('iot://home/living-room-main/ceiling-light/state');
		});
	});
});
