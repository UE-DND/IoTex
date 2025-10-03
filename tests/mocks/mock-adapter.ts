/**
 * 测试用可重用 Mock 适配器
 * 提供灵活的配置选项，支持各种测试场景
 */

import type { ProtocolAdapter } from '../../src/domain/adapter-interface.js';

/**
 * Mock 适配器配置选项
 */
export interface MockAdapterOptions {
	/** 适配器名称，默认 'mock-adapter' */
	name?: string;
	/** 初始设备状态，键为 deviceId */
	deviceStates?: Map<string, Record<string, unknown>>;
	/** 命令执行回调 */
	onCommand?: (deviceId: string, command: Record<string, unknown>) => void;
	/** 初始化回调 */
	onInitialize?: (config: Record<string, unknown>) => void | Promise<void>;
	/** 启动回调 */
	onStart?: () => void | Promise<void>;
	/** 停止回调 */
	onStop?: () => void | Promise<void>;
	/** 是否在操作时抛出错误 */
	shouldThrow?: boolean;
	/** 自定义错误消息 */
	errorMessage?: string;
	/** 命令执行延迟（毫秒），用于模拟异步操作 */
	commandDelay?: number;
	/** 是否自动触发状态变更事件 */
	autoEmitStateChange?: boolean;
}

/**
 * Mock 适配器实例接口
 * 扩展 ProtocolAdapter，添加测试辅助方法
 */
export interface MockAdapter extends ProtocolAdapter {
	/** 获取执行的命令历史 */
	getCommandHistory: () => Array<{ deviceId: string; command: Record<string, unknown> }>;
	/** 清空命令历史 */
	clearCommandHistory: () => void;
	/** 手动触发状态变更事件 */
	emitStateChange: (deviceId: string, state: Record<string, unknown>) => void;
	/** 设置设备状态 */
	setDeviceState: (deviceId: string, state: Record<string, unknown>) => void;
	/** 获取状态变更监听器数量 */
	getListenerCount: () => number;
}

/**
 * 创建可重用的 Mock 适配器
 * @param options 配置选项
 * @returns Mock 适配器实例
 * @example
 * ```typescript
 * // 基础用法
 * const adapter = createMockAdapter({ name: 'test-adapter' });
 *
 * // 带初始状态
 * const states = new Map([['device-1', { power: 'on' }]]);
 * const adapter = createMockAdapter({ deviceStates: states });
 *
 * // 监听命令执行
 * const commands: any[] = [];
 * const adapter = createMockAdapter({
 *   onCommand: (deviceId, cmd) => commands.push({ deviceId, cmd })
 * });
 *
 * // 模拟错误
 * const adapter = createMockAdapter({
 *   shouldThrow: true,
 *   errorMessage: 'Device not found'
 * });
 * ```
 */
export function createMockAdapter(options: MockAdapterOptions = {}): MockAdapter {
	const {
		name = 'mock-adapter',
		deviceStates = new Map<string, Record<string, unknown>>(),
		onCommand,
		onInitialize,
		onStart,
		onStop,
		shouldThrow = false,
		errorMessage = 'Mock adapter error',
		commandDelay = 0,
		autoEmitStateChange = true,
	} = options;

	// 状态变更监听器列表
	const stateListeners: Array<(deviceId: string, state: Record<string, unknown>) => void> = [];

	// 命令执行历史
	const commandHistory: Array<{ deviceId: string; command: Record<string, unknown> }> = [];

	/**
	 * 手动触发状态变更事件
	 */
	function emitStateChange(deviceId: string, state: Record<string, unknown>): void {
		stateListeners.forEach((listener) => {
			try {
				listener(deviceId, state);
			} catch {
				// 忽略监听器错误，不影响其他监听器
			}
		});
	}

	/**
	 * 延迟执行（如果配置了延迟）
	 */
	async function delay(): Promise<void> {
		if (commandDelay > 0) {
			await new Promise<void>((resolve) => {
				setTimeout(resolve, commandDelay);
			});
		}
	}

	return {
		name,

		async initialize(config: unknown = {}): Promise<void> {
			if (shouldThrow) {
				throw new Error(errorMessage);
			}
			if (onInitialize !== undefined) {
				// 类型断言，假设 config 为对象
				await onInitialize((config ?? {}) as Record<string, unknown>);
			}
		},

		async start(): Promise<void> {
			if (shouldThrow) {
				throw new Error(errorMessage);
			}
			if (onStart !== undefined) {
				await onStart();
			}
		},

		async stop(): Promise<void> {
			if (shouldThrow) {
				throw new Error(errorMessage);
			}
			if (onStop !== undefined) {
				await onStop();
			}
		},

		async getDeviceState(deviceId: string): Promise<Record<string, unknown>> {
			if (shouldThrow) {
				throw new Error(errorMessage);
			}
			await delay();
			return deviceStates.get(deviceId) ?? { deviceId };
		},

		async executeCommand(deviceId: string, command: unknown): Promise<void> {
			if (shouldThrow) {
				throw new Error(errorMessage);
			}

			await delay();

			// 类型断言，假设 command 为对象
			const cmdObj = (command ?? {}) as Record<string, unknown>;

			// 记录命令历史
			commandHistory.push({ deviceId, command: cmdObj });

			// 调用自定义回调
			if (onCommand !== undefined) {
				onCommand(deviceId, cmdObj);
			}

			// 更新设备状态
			const currentState = deviceStates.get(deviceId) ?? {};
			const newState: Record<string, unknown> = {
				...currentState,
				...cmdObj,
				deviceId,
				timestamp: Date.now(),
			};
			deviceStates.set(deviceId, newState);

			// 自动触发状态变更事件
			if (autoEmitStateChange) {
				emitStateChange(deviceId, newState);
			}
		},

		onDeviceStateChange(
			callback: (deviceId: string, state: Record<string, unknown>) => void
		): void {
			stateListeners.push(callback);
		},

		// 测试辅助方法

		getCommandHistory(): Array<{ deviceId: string; command: Record<string, unknown> }> {
			return [...commandHistory];
		},

		clearCommandHistory(): void {
			commandHistory.length = 0;
		},

		emitStateChange,

		setDeviceState(deviceId: string, state: Record<string, unknown>): void {
			deviceStates.set(deviceId, state);
		},

		getListenerCount(): number {
			return stateListeners.length;
		},
	};
}

/**
 * 创建一个总是抛出错误的 Mock 适配器
 * @param errorMessage 错误消息
 * @returns Mock 适配器实例
 */
export function createFailingMockAdapter(errorMessage = 'Device error'): MockAdapter {
	return createMockAdapter({
		name: 'failing-adapter',
		shouldThrow: true,
		errorMessage,
	});
}

/**
 * 创建一个带延迟的 Mock 适配器（模拟慢速设备）
 * @param delayMs 延迟毫秒数
 * @returns Mock 适配器实例
 */
export function createSlowMockAdapter(delayMs = 100): MockAdapter {
	return createMockAdapter({
		name: 'slow-adapter',
		commandDelay: delayMs,
	});
}
