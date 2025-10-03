/**
 * HTTP 适配器模块
 * 将通用命令映射为 HTTP 请求
 */

/**
 * HTTP 请求描述接口
 */
export interface HttpRequest {
	method: 'POST';
	url: string;
	headers: Record<string, string>;
	body: Record<string, unknown>;
}

/**
 * 命令接口
 * 注意: device_id 字段使用 snake_case 命名以符合 REST API 规范
 */
export interface Command {
	// eslint-disable-next-line @typescript-eslint/naming-convention -- REST API 规范要求使用 snake_case
	device_id: string;
	action: 'on' | 'off';
	params?: Record<string, unknown>;
}

/**
 * 验证输入参数
 */
function validateInput(baseUrl: string, cmd: Command | null | undefined): void {
	if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
		throw new TypeError('baseUrl must be a non-empty string');
	}

	if (cmd === null || cmd === undefined || typeof cmd !== 'object' || Array.isArray(cmd)) {
		throw new TypeError('cmd must be a non-null object');
	}

	if (typeof cmd.device_id !== 'string' || cmd.device_id.trim().length === 0) {
		throw new TypeError('device_id must be a non-empty string');
	}

	const validActions = ['on', 'off'] as const;
	if (!validActions.includes(cmd.action)) {
		throw new RangeError(
			`cmd.action must be one of: ${validActions.join(', ')}. Got: ${cmd.action}`
		);
	}
}

/**
 * 将通用命令映射为 HTTP 请求
 * @param baseUrl - 基础 URL（如 'https://api.example.com'）
 * @param cmd - 命令对象
 * @returns HTTP 请求描述对象
 * @throws {TypeError} 当 baseUrl 或 deviceId 为空时抛出
 * @throws {RangeError} 当 action 不在枚举范围内时抛出
 */
export function buildRequestForCommand(baseUrl: string, cmd: Command): HttpRequest {
	validateInput(baseUrl, cmd);

	// 标准化 baseUrl：去除尾随斜杠
	const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

	// 构建请求 URL：baseUrl/devices/<device_id>/<action>
	const url = `${normalizedBaseUrl}/devices/${encodeURIComponent(cmd.device_id)}/${cmd.action}`;

	// 构建请求体
	const body: Record<string, unknown> = {
		action: cmd.action,
		// eslint-disable-next-line @typescript-eslint/naming-convention, camelcase -- REST API 规范要求使用 snake_case
		device_id: cmd.device_id,
		...cmd.params,
	};

	// 构建请求对象
	return {
		method: 'POST',
		url,
		headers: {
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header names are case-insensitive
			'Content-Type': 'application/json',
		},
		body,
	};
}
