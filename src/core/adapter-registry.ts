/**
 * 集中管理协议适配器（注册、获取、枚举），供 device-manager 与 server 使用
 */

import { ensureAdapterImplements, type ProtocolAdapter } from '../domain/adapter-interface.js';

/**
 * 适配器注册表接口
 */
export interface AdapterRegistry {
	/**
	 * 注册适配器
	 * @param name 适配器名称
	 * @param adapter 适配器实例
	 * @throws TypeError 当 name 为空或 adapter 不满足契约时
	 * @throws Error 当重复注册同名适配器时
	 */
	register: (name: string, adapter: ProtocolAdapter) => void;

	/**
	 * 获取适配器
	 * @param name 适配器名称
	 * @returns 适配器实例或 undefined
	 */
	get: (name: string) => ProtocolAdapter | undefined;

	/**
	 * 列出所有已注册的适配器名称
	 * @returns 适配器名称数组
	 */
	list: () => string[];

	/**
	 * 检查适配器是否已注册
	 * @param name 适配器名称
	 * @returns 是否存在
	 */
	has: (name: string) => boolean;
}

/**
 * 创建适配器注册表
 * @returns AdapterRegistry 实例
 */
export function createAdapterRegistry(): AdapterRegistry {
	// 使用 Map 存储适配器，保证插入顺序
	const adapters = new Map<string, ProtocolAdapter>();

	function register(name: string, adapter: ProtocolAdapter): void {
		// 校验 name
		if (typeof name !== 'string' || name.trim().length === 0) {
			throw new TypeError('Adapter name must be a non-empty string');
		}

		// 检查是否已注册
		if (adapters.has(name)) {
			throw new Error(`Adapter "${name}" is already registered`);
		}

		// 校验 adapter 是否满足契约
		ensureAdapterImplements(adapter);

		// 注册适配器
		adapters.set(name, adapter);
	}

	function get(name: string): ProtocolAdapter | undefined {
		return adapters.get(name);
	}

	function list(): string[] {
		// 返回按插入顺序的适配器名称数组
		return Array.from(adapters.keys());
	}

	function has(name: string): boolean {
		return adapters.has(name);
	}

	return {
		register,
		get,
		list,
		has,
	};
}
