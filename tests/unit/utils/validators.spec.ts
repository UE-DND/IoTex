/**
 * 单元测试：utils/validators.ts
 */

import { assertNonEmptyString } from '../../../src/utils/validators.js';

describe('validators', () => {
	describe('assertNonEmptyString', () => {
		// 用例1：正常输入，返回裁剪后的字符串
		it('合法输入返回裁剪后的字符串', () => {
			const result = assertNonEmptyString('device_id', '  abc  ');
			expect(result).toBe('abc');
		});

		// 用例2：空字符串应抛出 TypeError
		it('空字符串抛出 TypeError', () => {
			expect(() => assertNonEmptyString('field', '')).toThrow(TypeError);
			expect(() => assertNonEmptyString('field', '')).toThrow(/cannot be empty/i);
		});

		// 用例3：仅空白字符串应抛出 TypeError
		it('纯空白字符串抛出 TypeError', () => {
			expect(() => assertNonEmptyString('field', '   ')).toThrow(TypeError);
			expect(() => assertNonEmptyString('field', '   ')).toThrow(/non-empty/i);
		});

		// 用例4：超长字符串应抛出 RangeError
		it('超过 maxLen 的字符串抛出 RangeError', () => {
			const longString = 'x'.repeat(300);
			expect(() => assertNonEmptyString('field', longString)).toThrow(RangeError);
			expect(() => assertNonEmptyString('field', longString)).toThrow(/exceeds maximum length/i);
		});

		// 用例5：非字符串类型应抛出 TypeError
		it('非字符串输入抛出 TypeError', () => {
			expect(() => assertNonEmptyString('field', 42 as any)).toThrow(TypeError);
			expect(() => assertNonEmptyString('field', null as any)).toThrow(TypeError);
			expect(() => assertNonEmptyString('field', undefined as any)).toThrow(TypeError);
		});

		// 用例6：自定义 maxLen 应正确工作
		it('遵循自定义 maxLen 参数', () => {
			const string50 = 'x'.repeat(50);
			expect(() => assertNonEmptyString('field', string50, 40)).toThrow(RangeError);
			expect(assertNonEmptyString('field', string50, 60)).toBe(string50);
		});

		// 用例7：错误消息应包含字段名
		it('错误消息包含字段名', () => {
			expect(() => assertNonEmptyString('my_custom_field', '')).toThrow(/my_custom_field/);
		});
	});
});
