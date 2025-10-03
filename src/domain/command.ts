/**
 * 命令输入的基础校验与约束检查
 */

import { assertNonEmptyString } from '../utils/validators.js';

// 常量定义，避免魔数
const BRIGHTNESS_MIN = 0;
const BRIGHTNESS_MAX = 255;
const COLOR_TEMP_MIN = 1500;
const COLOR_TEMP_MAX = 6500;
const VALID_POWER_VALUES = ['ON', 'OFF', 'on', 'off'];

// 定义命令接口
interface Command {
	deviceId?: unknown;
	brightness?: unknown;
	colorTemp?: unknown;
	power?: unknown;
}

/**
 * 校验亮度参数
 */
function validateBrightness(brightness: unknown): void {
	if (
		typeof brightness !== 'number' ||
		brightness < BRIGHTNESS_MIN ||
		brightness > BRIGHTNESS_MAX
	) {
		throw new RangeError(
			`brightness must be a number between ${BRIGHTNESS_MIN} and ${BRIGHTNESS_MAX}`
		);
	}
}

/**
 * 校验色温参数
 */
function validateColorTemp(colorTemp: unknown): void {
	if (typeof colorTemp !== 'number' || colorTemp < COLOR_TEMP_MIN || colorTemp > COLOR_TEMP_MAX) {
		throw new RangeError(
			`color_temp must be a number between ${COLOR_TEMP_MIN} and ${COLOR_TEMP_MAX}`
		);
	}
}

/**
 * 校验功率参数
 */
function validatePower(power: unknown): void {
	if (typeof power !== 'string' || !VALID_POWER_VALUES.includes(power)) {
		throw new RangeError(`power must be one of: ${VALID_POWER_VALUES.join(', ')}`);
	}
}

/**
 * 校验通用字段并根据能力约束检查常见参数
 * @param cmd 待校验命令对象（可能来自 MCP 工具调用）
 * @param capabilities 设备能力列表（如 ['power','brightness','color_temp']）
 * @throws TypeError 当 deviceId 为空时
 * @throws RangeError 当参数超出约束范围时
 */
export function validateCommand(cmd: Command, capabilities: string[]): void {
	// 校验必须的 deviceId 字段
	assertNonEmptyString('deviceId', cmd.deviceId);

	// 校验各个能力参数
	if ('brightness' in cmd && capabilities.includes('brightness')) {
		validateBrightness(cmd.brightness);
	}

	if ('colorTemp' in cmd && capabilities.includes('color_temp')) {
		validateColorTemp(cmd.colorTemp);
	}

	if ('power' in cmd && capabilities.includes('power')) {
		validatePower(cmd.power);
	}
}
