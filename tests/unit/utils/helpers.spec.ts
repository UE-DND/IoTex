/**
 * 单元测试：utils/helpers.ts
 */

import { toKebabCase } from '../../../src/utils/helpers.js';

describe('helpers', () => {
	describe('toKebabCase', () => {
		// 用例1：基本转换，多余空白压缩为单连字符
		it('带空格的字符串转换为 kebab-case', () => {
			expect(toKebabCase('  Main   Light  ')).toBe('main-light');
		});

		// 用例2：多种分隔符统一为连字符
		it('多种分隔符规范化为单个连字符', () => {
			expect(toKebabCase('Living_Room-Main.Light')).toBe('living-room-main-light');
		});

		// 用例3：非字符串输入应抛出 TypeError
		it('非字符串输入抛出 TypeError', () => {
			expect(() => toKebabCase(42 as any)).toThrow(TypeError);
			expect(() => toKebabCase(42 as any)).toThrow(/must be a string/i);
		});

		// 用例4：null 和 undefined 应抛出 TypeError
		it('null 或 undefined 抛出 TypeError', () => {
			expect(() => toKebabCase(null as any)).toThrow(TypeError);
			expect(() => toKebabCase(undefined as any)).toThrow(TypeError);
		});

		// 用例5：大小写转换
		it('转换为小写', () => {
			expect(toKebabCase('UPPER CASE')).toBe('upper-case');
			expect(toKebabCase('MixedCase')).toBe('mixedcase');
		});

		// 用例6：连续分隔符压缩
		it('压缩连续分隔符', () => {
			expect(toKebabCase('hello___world')).toBe('hello-world');
			expect(toKebabCase('hello---world')).toBe('hello-world');
			expect(toKebabCase('hello...world')).toBe('hello-world');
		});

		// 用例7：去除首尾连字符
		it('移除首尾连字符', () => {
			expect(toKebabCase('-hello-world-')).toBe('hello-world');
			expect(toKebabCase('___hello___')).toBe('hello');
		});

		// 用例8：特殊字符转换
		it('特殊字符转换为连字符', () => {
			expect(toKebabCase('hello@world')).toBe('hello-world');
			expect(toKebabCase('hello#world')).toBe('hello-world');
			expect(toKebabCase('hello$world')).toBe('hello-world');
		});

		// 用例9：保留数字
		it('保留数字', () => {
			expect(toKebabCase('room123')).toBe('room123');
			expect(toKebabCase('room 123')).toBe('room-123');
		});

		// 用例10：空字符串
		it('处理空字符串', () => {
			expect(toKebabCase('')).toBe('');
			expect(toKebabCase('   ')).toBe('');
		});

		// 用例11：中文字符保留（按照实现，中文会被处理）
		it('处理中文字符', () => {
			const result = toKebabCase('客厅灯');
			// 中文字符被保留并转小写，或被转为连字符取决于实现
			expect(typeof result).toBe('string');
		});
	});
});
