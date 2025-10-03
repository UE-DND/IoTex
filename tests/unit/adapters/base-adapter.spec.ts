/**
 * 单元测试：base-adapter.ts
 * 测试状态发射器的订阅与发射能力
 */

import { jest } from '@jest/globals';

import { createStateEmitter } from '../../../src/adapters/base-adapter.js';

describe('adapters/base-adapter', () => {
	describe('createStateEmitter', () => {
		it('订阅后 emitState 能收到一次回调', () => {
			const emitter = createStateEmitter();
			const mockCallback = jest.fn();

			emitter.onDeviceStateChange(mockCallback);
			emitter.emitState('device-1', { power: 'on' });

			expect(mockCallback).toHaveBeenCalledTimes(1);
			expect(mockCallback).toHaveBeenCalledWith('device-1', { power: 'on' });
		});

		it('多订阅者均能收到状态变更', () => {
			const emitter = createStateEmitter();
			const callback1 = jest.fn();
			const callback2 = jest.fn();
			const callback3 = jest.fn();

			emitter.onDeviceStateChange(callback1);
			emitter.onDeviceStateChange(callback2);
			emitter.onDeviceStateChange(callback3);

			const testState = { temperature: 25, humidity: 60 };
			emitter.emitState('sensor-1', testState);

			expect(callback1).toHaveBeenCalledWith('sensor-1', testState);
			expect(callback2).toHaveBeenCalledWith('sensor-1', testState);
			expect(callback3).toHaveBeenCalledWith('sensor-1', testState);
		});

		it('空 deviceId 抛出 TypeError', () => {
			const emitter = createStateEmitter();
			const mockCallback = jest.fn();

			emitter.onDeviceStateChange(mockCallback);

			expect(() => emitter.emitState('', { power: 'on' })).toThrow(TypeError);
			expect(() => emitter.emitState('', { power: 'on' })).toThrow(
				'deviceId must be a non-empty string'
			);
			expect(mockCallback).not.toHaveBeenCalled();
		});

		it('纯空白 deviceId 抛出 TypeError', () => {
			const emitter = createStateEmitter();

			expect(() => emitter.emitState('   ', { power: 'on' })).toThrow(TypeError);
		});

		it('非法回调参数抛出 TypeError', () => {
			const emitter = createStateEmitter();

			// @ts-expect-error - 故意传入非法类型测试运行时校验
			expect(() => emitter.onDeviceStateChange(null)).toThrow(TypeError);
			// @ts-expect-error - 故意传入非法类型测试运行时校验
			expect(() => emitter.onDeviceStateChange('not-a-function')).toThrow(TypeError);
			// @ts-expect-error - 故意传入非法类型测试运行时校验
			expect(() => emitter.onDeviceStateChange(123)).toThrow(TypeError);
		});

		it('订阅者回调抛错不影响其他订阅者', () => {
			const emitter = createStateEmitter();
			const errorCallback = jest.fn(() => {
				throw new Error('Callback error');
			});
			const normalCallback = jest.fn();

			// 设置控制台错误输出模拟，避免测试输出污染
			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
				// 静默
			});

			emitter.onDeviceStateChange(errorCallback);
			emitter.onDeviceStateChange(normalCallback);

			emitter.emitState('device-1', { power: 'on' });

			// 两个回调都应该被调用
			expect(errorCallback).toHaveBeenCalledTimes(1);
			expect(normalCallback).toHaveBeenCalledTimes(1);

			// 应该记录一次错误日志
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Error in state change callback'),
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
		});

		it('同一回调可以接收多次状态变更', () => {
			const emitter = createStateEmitter();
			const mockCallback = jest.fn();

			emitter.onDeviceStateChange(mockCallback);

			emitter.emitState('device-1', { power: 'on' });
			emitter.emitState('device-1', { power: 'off' });
			emitter.emitState('device-2', { brightness: 100 });

			expect(mockCallback).toHaveBeenCalledTimes(3);
			expect(mockCallback).toHaveBeenNthCalledWith(1, 'device-1', {
				power: 'on',
			});
			expect(mockCallback).toHaveBeenNthCalledWith(2, 'device-1', {
				power: 'off',
			});
			expect(mockCallback).toHaveBeenNthCalledWith(3, 'device-2', {
				brightness: 100,
			});
		});

		it('状态对象可以包含任意可序列化字段', () => {
			const emitter = createStateEmitter();
			const mockCallback = jest.fn();

			emitter.onDeviceStateChange(mockCallback);

			const complexState = {
				power: 'on',
				brightness: 80,
				color: { r: 255, g: 0, b: 0 },
				schedule: ['08:00', '20:00'],
				metadata: {
					location: 'living-room',
					type: 'smart-bulb',
				},
			};

			emitter.emitState('device-1', complexState);

			expect(mockCallback).toHaveBeenCalledWith('device-1', complexState);
		});
	});
});
