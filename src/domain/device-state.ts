/**
 * 设备状态进行安全合并（不可变）与基本形状校验
 */

/**
 * 获取值的实际类型描述
 */
function getValueType(value: unknown): string {
	if (value === null) {
		return 'null';
	}
	if (Array.isArray(value)) {
		return 'array';
	}
	return typeof value;
}

/**
 * 验证状态对象
 */
function validateStateObject<T extends Record<string, unknown>>(
	prev: T,
	patch: Partial<T> | null | undefined
): void {
	// 检查 prev 是否为普通对象 - prev 泛型约束为 Record 类型，运行时仍需验证
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- 运行时类型检查
	if (prev === null || Array.isArray(prev) || typeof prev !== 'object') {
		const actualType = getValueType(prev);
		throw new TypeError(`prev must be a plain object, got: ${actualType}`);
	}

	if (patch === null || patch === undefined) {
		throw new TypeError('patch cannot be null or undefined');
	}
}

/**
 * 返回不可变合并结果，浅合并键冲突以 patch 为准
 * @param prev 原状态对象
 * @param patch 增量对象
 * @returns 新对象，prev 不被修改
 * @throws TypeError 若 prev 非对象或 patch 为 null
 */
export function mergeDeviceState<T extends Record<string, unknown>>(
	prev: T,
	patch: Partial<T> | null | undefined
): T {
	validateStateObject(prev, patch);

	const result = { ...prev };

	for (const key in patch) {
		if (Object.hasOwn(patch, key)) {
			const value = patch[key];
			if (value !== undefined) {
				result[key] = value;
			}
		}
	}

	return result;
}
