/**
 * 协议适配器接口定义与运行时契约校验
 */

/**
 * 协议适配器接口
 */
export interface ProtocolAdapter {
	name: string;
	initialize: (config: unknown) => Promise<void>;
	start: () => Promise<void>;
	stop: () => Promise<void>;
	getDeviceState: (deviceId: string) => Promise<Record<string, unknown>>;
	executeCommand: (deviceId: string, command: unknown) => Promise<void>;
	onDeviceStateChange: (cb: (deviceId: string, state: Record<string, unknown>) => void) => void;
	scanDevices?: () => Promise<{ id: string; type: string }[]>;
}

/**
 * 必需的方法列表
 */
const REQUIRED_METHODS = [
	'initialize',
	'start',
	'stop',
	'getDeviceState',
	'executeCommand',
	'onDeviceStateChange',
] as const;

const EXPECTED_PARAMS = 2;

/**
 * 验证适配器名称
 */
function validateAdapterName(adapterObj: Partial<Record<string, unknown>>): void {
	if (typeof adapterObj.name !== 'string' || adapterObj.name.trim().length === 0) {
		throw new TypeError('Adapter must have a non-empty "name" property');
	}
}

/**
 * 验证必需方法
 */
function validateRequiredMethods(adapterObj: Partial<Record<string, unknown>>): void {
	for (const methodName of REQUIRED_METHODS) {
		if (typeof adapterObj[methodName] !== 'function') {
			throw new TypeError(`Adapter must implement method "${methodName}" as a function`);
		}
	}
}

/**
 * 验证 executeCommand 参数数量
 */
function validateExecuteCommandParams(adapterObj: Partial<Record<string, unknown>>): void {
	const { executeCommand } = adapterObj;
	if (typeof executeCommand === 'function') {
		if (executeCommand.length !== EXPECTED_PARAMS) {
			throw new TypeError(
				`Adapter method "executeCommand" must accept exactly ${EXPECTED_PARAMS} parameters (deviceId, command), got ${executeCommand.length}`
			);
		}
	}
}

/**
 * 验证可选的 scanDevices 方法
 */
function validateOptionalScanDevices(adapterObj: Partial<Record<string, unknown>>): void {
	if ('scanDevices' in adapterObj && typeof adapterObj.scanDevices !== 'function') {
		throw new TypeError('Adapter property "scanDevices", if present, must be a function');
	}
}

/**
 * 在运行时对适配器实例进行契约性检查
 * @param adapter 运行时适配器实例
 * @throws TypeError 当适配器不满足接口契约时
 */
export function ensureAdapterImplements(adapter: unknown): asserts adapter is ProtocolAdapter {
	// 检查 adapter 是否存在且为对象
	if (adapter === null || adapter === undefined || typeof adapter !== 'object') {
		throw new TypeError('Adapter must be a non-null object');
	}

	// 使用类型守卫检查 adapter 结构
	const adapterObj = adapter as Partial<Record<string, unknown>>;

	// 检查 name 属性
	validateAdapterName(adapterObj);

	// 检查每个必需方法
	validateRequiredMethods(adapterObj);

	// 检查 executeCommand 的参数数量
	validateExecuteCommandParams(adapterObj);

	// 检查可选的 scanDevices 方法
	validateOptionalScanDevices(adapterObj);
}
