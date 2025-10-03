/**
 * 基础适配器模块
 * 为具体适配器提供基础的状态事件发射与订阅能力
 */

/**
 * 状态变更回调函数类型
 */
export type StateChangeCallback = (deviceId: string, state: Record<string, unknown>) => void;

/**
 * 状态发射器接口
 */
export interface StateEmitter {
	/**
	 * 订阅设备状态变更
	 * @param cb - 状态变更回调函数
	 */
	onDeviceStateChange: (cb: StateChangeCallback) => void;

	/**
	 * 发射设备状态变更
	 * @param deviceId - 设备ID（非空）
	 * @param state - 设备状态
	 * @throws {TypeError} deviceId 为空时抛出
	 */
	emitState: (deviceId: string, state: Record<string, unknown>) => void;
}

/**
 * 创建状态发射器
 * @returns 状态发射器实例
 */
export function createStateEmitter(): StateEmitter {
	const subscribers = new Set<StateChangeCallback>();

	return {
		onDeviceStateChange(cb: StateChangeCallback): void {
			if (typeof cb !== 'function') {
				throw new TypeError('Callback must be a function');
			}
			subscribers.add(cb);
		},

		emitState(deviceId: string, state: Record<string, unknown>): void {
			if (typeof deviceId !== 'string' || deviceId.trim().length === 0) {
				throw new TypeError('deviceId must be a non-empty string');
			}

			// 通知所有订阅者
			subscribers.forEach((cb) => {
				try {
					cb(deviceId, state);
				} catch (err) {
					// 捕获订阅者回调中的错误，避免影响其他订阅者
					console.error(`Error in state change callback for device "${deviceId}":`, err);
				}
			});
		},
	};
}
