/**
 * 字符串与数值的通用小工具
 */

/**
 * 将任意字符串归一化为 kebab-case
 * - 去除前后空白
 * - 连续空白与分隔符压缩为单 '-'
 * - 转换为小写
 * - 保留字母数字，其他字符转为 '-'
 * @param input 输入字符串
 * @returns kebab-case格式的字符串
 * @throws TypeError 当输入不是字符串时
 */
export function toKebabCase(input: string): string {
	if (typeof input !== 'string') {
		throw new TypeError(`Input must be a string, got ${typeof input}`);
	}

	return input
		.trim() // 去除前后空白
		.toLowerCase() // 转为小写
		.replace(/[^a-z0-9\u4e00-\u9fff]/g, '-') // 非字母数字(含中文)转为连字符
		.replace(/-+/g, '-') // 连续连字符压缩为单个
		.replace(/^-|-$/g, ''); // 去除首尾连字符
}
