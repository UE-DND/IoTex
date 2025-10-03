/**
 * 设备实体相关的资源标识生成逻辑
 */

import { toKebabCase } from '../utils/helpers.js';
import { assertNonEmptyString } from '../utils/validators.js';

/**
 * 基于设备位置信息与友好名生成标准 MCP 资源 URI
 * @param input 包含位置和友好名称的输入对象
 * @param input.location 设备位置，非空字符串
 * @param input.friendlyName 设备友好名称，非空字符串
 * @returns 标准的MCP资源URI，形如 'iot://home/<location>/<name>/state'
 * @throws TypeError 当location或friendlyName为空或仅空白时
 */
export function buildDeviceResourceUri(input: { location: string; friendlyName: string }): string {
	// 验证输入参数
	const location = assertNonEmptyString('location', input.location);
	const friendlyName = assertNonEmptyString('friendlyName', input.friendlyName);

	// 转换为 kebab-case 格式
	const normalizedLocation = toKebabCase(location);
	const normalizedName = toKebabCase(friendlyName);

	// 生成标准 URI
	return `iot://home/${normalizedLocation}/${normalizedName}/state`;
}
