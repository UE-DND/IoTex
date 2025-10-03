/**
 * 定义设备状态存储接口与内存默认实现，供 core/device-manager 读写
 */

import { mergeDeviceState } from '../domain/device-state.js';

/**
 * 设备状态存储接口
 */
export interface StateStore {
	/**
	 * 获取指定键的值
	 * @param key 键名
	 * @returns 值或 undefined
	 */
	get: <T = unknown>(key: string) => Promise<T | undefined>;

	/**
	 * 设置指定键的值
	 * @param key 键名
	 * @param val 值
	 */
	set: (key: string, val: unknown) => Promise<void>;

	/**
	 * 部分更新指定键的值（不可变合并）
	 * @param key 键名
	 * @param partial 部分值
	 * @returns 更新后的完整值
	 */
	patch: <T extends Record<string, unknown>>(key: string, partial: Partial<T>) => Promise<T>;

	/**
	 * 获取所有匹配前缀的键
	 * @param prefix 可选的键名前缀
	 * @returns 键名数组
	 */
	keys: (prefix?: string) => Promise<string[]>;
}

/**
 * 创建基于内存的状态存储实现
 * @returns StateStore 实例
 */
export function createInMemoryStateStore(): StateStore {
	// 使用 Map 存储状态
	const store = new Map<string, unknown>();

	async function get<T = unknown>(key: string): Promise<T | undefined> {
		if (typeof key !== 'string' || key.trim().length === 0) {
			throw new TypeError('key must be a non-empty string');
		}
		const value = store.get(key);
		// 使用类型断言，调用者负责确保类型正确性
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- 泛型类型由调用者保证
		return Promise.resolve(value === undefined ? undefined : (value as T));
	}

	async function set(key: string, val: unknown): Promise<void> {
		if (typeof key !== 'string' || key.trim().length === 0) {
			throw new TypeError('key must be a non-empty string');
		}
		store.set(key, val);
		return Promise.resolve();
	}

	async function patch<T extends Record<string, unknown>>(
		key: string,
		partial: Partial<T>
	): Promise<T> {
		if (typeof key !== 'string' || key.trim().length === 0) {
			throw new TypeError('key must be a non-empty string');
		}

		// partial 的类型已经由 Partial<T> 保证不会是 null
		if (typeof partial !== 'object') {
			throw new TypeError('partial must be an object');
		}

		// 获取当前值，如果不存在则使用空对象
		const current = store.get(key);

		// 使用类型断言，调用者需确保类型兼容性
		const base: T =
			current === undefined
				? // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- 泛型类型由调用者保证
					({} as T)
				: // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- 泛型类型由调用者保证
					(current as T);

		// 使用 mergeDeviceState 进行不可变合并
		const merged = mergeDeviceState(base, partial);

		// 保存合并后的结果
		store.set(key, merged);

		return Promise.resolve(merged);
	}

	async function keys(prefix?: string): Promise<string[]> {
		const allKeys = Array.from(store.keys());

		// 如果没有提供前缀，返回所有键
		if (prefix === undefined || prefix.length === 0) {
			return Promise.resolve(allKeys);
		}

		// 过滤出匹配前缀的键
		return Promise.resolve(allKeys.filter((key) => key.startsWith(prefix)));
	}

	return {
		get,
		set,
		patch,
		keys,
	};
}
