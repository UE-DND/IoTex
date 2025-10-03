/**
 * MQTT 适配器模块
 * 将 MQTT 主题/消息映射为设备状态补丁，并将命令转换为主题/载荷
 */

const MIN_TOPIC_PARTS = 2;
const DEVICE_ID_OFFSET = 2;

/**
 * 验证主题输入参数
 */
function validateTopicInputs(base: string, topic: string): void {
	if (typeof base !== 'string' || base.trim().length === 0) {
		throw new TypeError('base must be a non-empty string');
	}

	if (typeof topic !== 'string' || topic.trim().length === 0) {
		throw new TypeError('topic must be a non-empty string');
	}
}

/**
 * 从主题剩余部分提取设备ID
 */
function extractDeviceIdFromTopic(remainder: string): string | null {
	const parts = remainder.split('/');

	if (parts.length < MIN_TOPIC_PARTS || parts[parts.length - 1] !== 'state') {
		return null;
	}

	const deviceId = parts[parts.length - DEVICE_ID_OFFSET];
	return deviceId.length === 0 ? null : deviceId;
}

/**
 * 从主题中提取设备ID
 * @param base - 基础主题路径（如 'zigbee2mqtt'）
 * @param topic - 完整主题（如 'zigbee2mqtt/lamp/state'）
 * @returns 设备ID（如 'lamp'），不匹配时返回 null
 * @throws {TypeError} 当 base 或 topic 为空时抛出
 */
export function mapTopicToDeviceId(base: string, topic: string): string | null {
	validateTopicInputs(base, topic);

	const normalizedBase = base.trim().replace(/\/+$/, '');
	const normalizedTopic = topic.trim();
	const prefix = `${normalizedBase}/`;

	if (!normalizedTopic.startsWith(prefix)) {
		return null;
	}

	const remainder = normalizedTopic.slice(prefix.length);
	return extractDeviceIdFromTopic(remainder);
}
