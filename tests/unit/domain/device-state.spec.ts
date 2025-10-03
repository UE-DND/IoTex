/**
 * 单元测试：domain/device-state.ts
 */

import { mergeDeviceState } from '../../../src/domain/device-state.js';

describe('domain/device-state', () => {
	describe('mergeDeviceState', () => {
		// 用例1：基本浅合并，键冲突以 patch 为准
		it('基本浅合并，键冲突以 patch 为准', () => {
			const prev = { a: 1, b: 2 };
			const patch = { b: 3 };
			const result = mergeDeviceState(prev, patch);

			expect(result).toEqual({ a: 1, b: 3 });
			expect(result).not.toBe(prev); // 不可变性检查
		});

		// 用例2：patch 中 undefined 字段被忽略
		it('patch 中 undefined 字段被忽略', () => {
			const prev = { a: 1, b: 2 };
			const patch = { b: undefined, c: 3 };
			const result = mergeDeviceState(prev, patch as any);

			expect(result).toEqual({ a: 1, b: 2, c: 3 });
		});

		// 用例3：patch 为 null 应抛出 TypeError
		it('patch 为 null 应抛出 TypeError', () => {
			const prev = { a: 1 };
			expect(() => mergeDeviceState(prev, null)).toThrow(TypeError);
			expect(() => mergeDeviceState(prev, null)).toThrow(/cannot be null or undefined/i);
		});

		// 用例4：patch 为 undefined 应抛出 TypeError
		it('patch 为 undefined 应抛出 TypeError', () => {
			const prev = { a: 1 };
			expect(() => mergeDeviceState(prev, undefined)).toThrow(TypeError);
		});

		// 用例5：prev 为 null 应抛出 TypeError
		it('prev 为 null 应抛出 TypeError', () => {
			expect(() => mergeDeviceState(null as any, {})).toThrow(TypeError);
			expect(() => mergeDeviceState(null as any, {})).toThrow(/must be a plain object/i);
		});

		// 用例6：prev 为数组应抛出 TypeError
		it('prev 为数组应抛出 TypeError', () => {
			expect(() => mergeDeviceState([] as any, {})).toThrow(TypeError);
			expect(() => mergeDeviceState([] as any, {})).toThrow(/must be a plain object/i);
		});

		// 用例7：prev 为非对象应抛出 TypeError
		it('prev 为非对象应抛出 TypeError', () => {
			expect(() => mergeDeviceState(42 as any, {})).toThrow(TypeError);
			expect(() => mergeDeviceState('string' as any, {})).toThrow(TypeError);
		});

		// 用例8：不可变性验证 - prev 不被修改
		it('不可变性验证 - prev 不被修改', () => {
			const prev = { a: 1, b: 2 };
			const prevCopy = { ...prev };
			const patch = { b: 3, c: 4 };

			mergeDeviceState(prev, patch);

			expect(prev).toEqual(prevCopy);
		});

		// 用例9：空 patch 返回 prev 的副本
		it('空 patch 返回 prev 的副本', () => {
			const prev = { a: 1, b: 2 };
			const result = mergeDeviceState(prev, {});

			expect(result).toEqual(prev);
			expect(result).not.toBe(prev);
		});

		// 用例10：patch 添加新字段
		it('patch 添加新字段', () => {
			const prev = { a: 1 };
			const patch = { b: 2, c: 3 };
			const result = mergeDeviceState(prev, patch as any);

			expect(result).toEqual({ a: 1, b: 2, c: 3 });
		});

		// 用例11：复杂对象浅合并（嵌套对象不深度合并）
		it('复杂对象浅合并（嵌套对象不深度合并）', () => {
			const prev = { a: 1, nested: { x: 1, y: 2 } };
			const patch = { nested: { x: 10 } };
			const result = mergeDeviceState(prev, patch as any);

			// 浅合并：nested 对象被完全替换
			expect(result).toEqual({ a: 1, nested: { x: 10 } });
			expect(result.nested).not.toHaveProperty('y');
		});

		// 用例12：类型泛型工作正常
		it('类型泛型工作正常', () => {
			type DeviceState = Record<string, unknown> & {
				power: string;
				brightness?: number;
			};

			const prev: DeviceState = { power: 'off' };
			const patch: Partial<DeviceState> = { power: 'on', brightness: 255 };
			const result = mergeDeviceState(prev, patch);

			expect(result).toEqual({ power: 'on', brightness: 255 });
		});
	});
});
