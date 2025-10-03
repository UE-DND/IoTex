/**
 * 单元测试：domain/command.ts
 */

import { validateCommand } from '../../../src/domain/command.js';

describe('domain/command', () => {
	describe('validateCommand', () => {
		// 用例1：最小合法命令，空能力列表不抛错
		it('最小合法命令，空能力列表不抛错', () => {
			const cmd = { deviceId: 'device123' };
			expect(() => validateCommand(cmd, [])).not.toThrow();
		});

		// 用例2：deviceId 为空字符串应抛出 TypeError
		it('deviceId 为空字符串应抛出 TypeError', () => {
			const cmd = { deviceId: '' };
			expect(() => validateCommand(cmd, [])).toThrow(TypeError);
		});

		// 用例3：deviceId 仅空白应抛出 TypeError
		it('deviceId 仅空白应抛出 TypeError', () => {
			const cmd = { deviceId: '   ' };
			expect(() => validateCommand(cmd, [])).toThrow(TypeError);
		});

		// 用例4：缺少 deviceId 应抛出 TypeError
		it('缺少 deviceId 应抛出 TypeError', () => {
			const cmd = {};
			expect(() => validateCommand(cmd as any, [])).toThrow(TypeError);
		});

		// 用例5：亮度越界（负数）应抛出 RangeError
		it('亮度越界（负数）应抛出 RangeError', () => {
			const cmd = { deviceId: 'light1', brightness: -1 };
			const capabilities = ['brightness'];
			expect(() => validateCommand(cmd, capabilities)).toThrow(RangeError);
			expect(() => validateCommand(cmd, capabilities)).toThrow(/brightness/i);
		});

		// 用例6：亮度越界（超过255）应抛出 RangeError
		it('亮度越界（超过255）应抛出 RangeError', () => {
			const cmd = { deviceId: 'light1', brightness: 256 };
			const capabilities = ['brightness'];
			expect(() => validateCommand(cmd, capabilities)).toThrow(RangeError);
		});

		// 用例7：合法亮度值应通过验证
		it('合法亮度值应通过验证', () => {
			const cmd1 = { deviceId: 'light1', brightness: 0 };
			const cmd2 = { deviceId: 'light1', brightness: 255 };
			const cmd3 = { deviceId: 'light1', brightness: 128 };
			const capabilities = ['brightness'];

			expect(() => validateCommand(cmd1, capabilities)).not.toThrow();
			expect(() => validateCommand(cmd2, capabilities)).not.toThrow();
			expect(() => validateCommand(cmd3, capabilities)).not.toThrow();
		});

		// 用例8：色温低于最小值应抛出 RangeError
		it('色温低于最小值应抛出 RangeError', () => {
			const cmd = { deviceId: 'light1', colorTemp: 1000 };
			const capabilities = ['color_temp'];
			expect(() => validateCommand(cmd, capabilities)).toThrow(RangeError);
			expect(() => validateCommand(cmd, capabilities)).toThrow(/color_temp/i);
		});

		// 用例9：色温高于最大值应抛出 RangeError
		it('色温高于最大值应抛出 RangeError', () => {
			const cmd = { deviceId: 'light1', colorTemp: 7000 };
			const capabilities = ['color_temp'];
			expect(() => validateCommand(cmd, capabilities)).toThrow(RangeError);
		});

		// 用例10：合法色温值应通过验证
		it('合法色温值应通过验证', () => {
			const cmd1 = { deviceId: 'light1', colorTemp: 1500 };
			const cmd2 = { deviceId: 'light1', colorTemp: 6500 };
			const cmd3 = { deviceId: 'light1', colorTemp: 4000 };
			const capabilities = ['color_temp'];

			expect(() => validateCommand(cmd1, capabilities)).not.toThrow();
			expect(() => validateCommand(cmd2, capabilities)).not.toThrow();
			expect(() => validateCommand(cmd3, capabilities)).not.toThrow();
		});

		// 用例11：能力列表不包含对应能力时，不校验参数
		it('能力列表不包含对应能力时，不校验参数', () => {
			const cmd = { deviceId: 'light1', brightness: 999 };
			const capabilities: string[] = []; // 不包含 brightness

			// 不应抛错，因为 brightness 不在能力列表中
			expect(() => validateCommand(cmd, capabilities)).not.toThrow();
		});

		// 用例12：多个参数同时校验
		it('多个参数同时校验', () => {
			const cmd = {
				deviceId: 'light1',
				brightness: 200,
				colorTemp: 3000,
			};
			const capabilities = ['brightness', 'color_temp'];

			expect(() => validateCommand(cmd, capabilities)).not.toThrow();
		});

		// 用例13：非数字 brightness 应抛出 RangeError
		it('非数字 brightness 应抛出 RangeError', () => {
			const cmd = { deviceId: 'light1', brightness: 'high' };
			const capabilities = ['brightness'];
			expect(() => validateCommand(cmd as any, capabilities)).toThrow(RangeError);
		});

		// 用例14：非数字 colorTemp 应抛出 RangeError
		it('非数字 colorTemp 应抛出 RangeError', () => {
			const cmd = { deviceId: 'light1', colorTemp: 'warm' };
			const capabilities = ['color_temp'];
			expect(() => validateCommand(cmd as any, capabilities)).toThrow(RangeError);
		});

		// 用例15：无效的 power 值应抛出 RangeError
		it('无效的 power 值应抛出 RangeError', () => {
			const cmd = { deviceId: 'switch1', power: 'invalid' };
			const capabilities = ['power'];
			expect(() => validateCommand(cmd, capabilities)).toThrow(RangeError);
			expect(() => validateCommand(cmd, capabilities)).toThrow(/power/i);
		});

		// 用例16：非字符串 power 值应抛出 RangeError
		it('非字符串 power 值应抛出 RangeError', () => {
			const cmd = { deviceId: 'switch1', power: 1 };
			const capabilities = ['power'];
			expect(() => validateCommand(cmd as any, capabilities)).toThrow(RangeError);
		});

		// 用例17：合法的 power 值应通过验证（ON/OFF/on/off）
		it('合法的 power 值应通过验证（ON/OFF/on/off）', () => {
			const cmd1 = { deviceId: 'switch1', power: 'ON' };
			const cmd2 = { deviceId: 'switch1', power: 'OFF' };
			const cmd3 = { deviceId: 'switch1', power: 'on' };
			const cmd4 = { deviceId: 'switch1', power: 'off' };
			const capabilities = ['power'];

			expect(() => validateCommand(cmd1, capabilities)).not.toThrow();
			expect(() => validateCommand(cmd2, capabilities)).not.toThrow();
			expect(() => validateCommand(cmd3, capabilities)).not.toThrow();
			expect(() => validateCommand(cmd4, capabilities)).not.toThrow();
		});

		// 用例18：能力列表不包含 power 时不校验
		it('能力列表不包含 power 时不校验', () => {
			const cmd = { deviceId: 'switch1', power: 'invalid' };
			const capabilities: string[] = []; // 不包含 power

			// 不应抛错，因为 power 不在能力列表中
			expect(() => validateCommand(cmd, capabilities)).not.toThrow();
		});

		// 用例19：多个参数包括 power 一起校验
		it('多个参数包括 power 一起校验', () => {
			const cmd = {
				deviceId: 'smart_bulb',
				brightness: 150,
				colorTemp: 4500,
				power: 'ON',
			};
			const capabilities = ['brightness', 'color_temp', 'power'];

			expect(() => validateCommand(cmd, capabilities)).not.toThrow();
		});
	});
});
