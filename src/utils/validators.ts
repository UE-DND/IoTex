/**
 * 输入约束断言与通用验证工具
 */

// 默认字符串最大长度常量
const DEFAULT_MAX_STRING_LENGTH = 256;

/**
 * 断言输入为非空字符串，返回 trim() 后的值，可选最大长度控制
 * @param name 字段名称，用于错误消息
 * @param value 待验证的值
 * @param maxLen 可选的最大长度限制，默认256
 * @returns 裁剪后的字符串
 * @throws TypeError 当值不是字符串或为空/仅空白时
 * @throws RangeError 当字符串超过最大长度时
 */
export function assertNonEmptyString(
	name: string,
	value: unknown,
	maxLen = DEFAULT_MAX_STRING_LENGTH
): string {
	if (typeof value !== 'string') {
		throw new TypeError(`${name} must be a string, got ${typeof value}`);
	}

	if (value.length === 0) {
		throw new TypeError(`${name} cannot be empty`);
	}

	const trimmed = value.trim();

	if (trimmed.length === 0) {
		throw new TypeError(`${name} must be non-empty`);
	}

	if (trimmed.length > maxLen) {
		throw new RangeError(
			`${name} exceeds maximum length of ${maxLen} characters (got ${trimmed.length})`
		);
	}

	return trimmed;
}
