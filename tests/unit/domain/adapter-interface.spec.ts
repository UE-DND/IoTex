/**
 * 单元测试：domain/adapter-interface.ts
 */

import { describe, it, expect } from '@jest/globals';
import { ensureAdapterImplements } from '../../../src/domain/adapter-interface.js';
import type { ProtocolAdapter } from '../../../src/domain/adapter-interface.js';

describe('domain/adapter-interface', () => {
	describe('ensureAdapterImplements', () => {
		// 创建有效的适配器
		const createValidAdapter = (): ProtocolAdapter => ({
			name: 'TestAdapter',
			initialize: async () => {},
			start: async () => {},
			stop: async () => {},
			getDeviceState: async () => ({}),
			executeCommand: async (deviceId: string, command: unknown) => {},
			onDeviceStateChange: () => {},
		});

		// 用例1：null 值应抛出 TypeError
		it('null 值应抛出 TypeError', () => {
			expect(() => ensureAdapterImplements(null)).toThrow(TypeError);
			expect(() => ensureAdapterImplements(null)).toThrow('Adapter must be a non-null object');
		});

		// 用例2：undefined 应抛出 TypeError
		it('undefined 应抛出 TypeError', () => {
			expect(() => ensureAdapterImplements(undefined)).toThrow(TypeError);
			expect(() => ensureAdapterImplements(undefined)).toThrow('Adapter must be a non-null object');
		});

		// 用例3：非对象类型应抛出 TypeError
		it('非对象类型应抛出 TypeError', () => {
			expect(() => ensureAdapterImplements('string')).toThrow(TypeError);
			expect(() => ensureAdapterImplements(123)).toThrow(TypeError);
			expect(() => ensureAdapterImplements(true)).toThrow(TypeError);
		});

		// 用例4：缺少必需方法应抛出 TypeError
		it('缺少必需方法应抛出 TypeError', () => {
			const invalidAdapter = {
				name: 'TestAdapter',
				initialize: async () => {},
				start: async () => {},
				stop: async () => {},
				getDeviceState: async () => ({}),
				// 缺少 executeCommand
				onDeviceStateChange: () => {},
			};

			expect(() => ensureAdapterImplements(invalidAdapter)).toThrow(TypeError);
			expect(() => ensureAdapterImplements(invalidAdapter)).toThrow(
				'Adapter must implement method "executeCommand" as a function'
			);
		});

		// 用例5：executeCommand 参数数量不正确应抛出 TypeError
		it('executeCommand 参数数量不正确应抛出 TypeError', () => {
			const invalidAdapter = {
				name: 'TestAdapter',
				initialize: async () => {},
				start: async () => {},
				stop: async () => {},
				getDeviceState: async () => ({}),
				executeCommand: async () => {}, // 应该接受 2 个参数
				onDeviceStateChange: () => {},
			};

			expect(() => ensureAdapterImplements(invalidAdapter)).toThrow(TypeError);
			expect(() => ensureAdapterImplements(invalidAdapter)).toThrow(
				'Adapter method "executeCommand" must accept exactly 2 parameters'
			);
		});

		// 用例6：executeCommand 参数过多应抛出 TypeError
		it('executeCommand 参数过多应抛出 TypeError', () => {
			const invalidAdapter = {
				name: 'TestAdapter',
				initialize: async () => {},
				start: async () => {},
				stop: async () => {},
				getDeviceState: async () => ({}),
				executeCommand: async (a: string, b: unknown, c: unknown) => {}, // 3 个参数，应该是 2 个
				onDeviceStateChange: () => {},
			};

			expect(() => ensureAdapterImplements(invalidAdapter)).toThrow(TypeError);
		});

		// 用例7：scanDevices 不是函数应抛出 TypeError
		it('scanDevices 不是函数应抛出 TypeError', () => {
			const invalidAdapter = {
				name: 'TestAdapter',
				initialize: async () => {},
				start: async () => {},
				stop: async () => {},
				getDeviceState: async () => ({}),
				executeCommand: async (deviceId: string, command: unknown) => {},
				onDeviceStateChange: () => {},
				scanDevices: 'not a function', // 应该是函数
			};

			expect(() => ensureAdapterImplements(invalidAdapter)).toThrow(TypeError);
			expect(() => ensureAdapterImplements(invalidAdapter)).toThrow(
				'Adapter property "scanDevices", if present, must be a function'
			);
		});

		// 用例8：带有有效 scanDevices 的适配器应通过验证
		it('带有有效 scanDevices 的适配器应通过验证', () => {
			const validAdapter = {
				...createValidAdapter(),
				scanDevices: async () => [],
			};

			expect(() => ensureAdapterImplements(validAdapter)).not.toThrow();
		});

		// 用例9：没有 scanDevices 的有效适配器应通过验证
		it('没有 scanDevices 的有效适配器应通过验证', () => {
			const validAdapter = createValidAdapter();

			expect(() => ensureAdapterImplements(validAdapter)).not.toThrow();
		});
	});
});
