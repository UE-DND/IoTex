/**
 * 基于本地 JSON 文件的状态存储实现（轻量 KV），适合单机与小规模数据
 */

import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile, rename, mkdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { mergeDeviceState } from '../domain/device-state.js';

import type { StateStore } from './state-store.js';

const MAX_CONTENT_PREVIEW = 100;
const JSON_INDENT = 2;
const TEMP_FILE_RANDOM_BYTES = 8;

/**
 * JSON 存储配置选项
 */
export interface JsonStoreOptions {
	/** 是否使用原子写入（默认 true） */
	atomic?: boolean;
}

/**
 * 原子写入：使用安全的临时文件，然后重命名
 */
async function atomicWrite(filePath: string, content: string, dir: string): Promise<void> {
	// 生成唯一的临时文件名（使用加密安全的随机字节）
	const randomSuffix = randomBytes(TEMP_FILE_RANDOM_BYTES).toString('hex');
	const tempPath = join(dir, `.tmp-${randomSuffix}.json`);

	try {
		// 写入临时文件，设置严格权限（仅所有者可读写）
		await writeFile(tempPath, content, { encoding: 'utf-8', mode: 0o600 });
		// 原子重命名
		await rename(tempPath, filePath);
	} catch (error) {
		// 如果重命名失败，清理临时文件
		try {
			await unlink(tempPath);
		} catch {
			// 忽略清理错误
		}
		throw error;
	}
}

/**
 * 持久化数据到文件
 */
async function persistData(
	data: Record<string, unknown>,
	filePath: string,
	atomic: boolean
): Promise<void> {
	const content = JSON.stringify(data, null, JSON_INDENT);
	const dir = dirname(filePath);

	try {
		// 确保目录存在
		await mkdir(dir, { recursive: true });

		if (atomic) {
			await atomicWrite(filePath, content, dir);
		} else {
			// 直接写入，同样设置严格权限（仅所有者可读写）
			await writeFile(filePath, content, { encoding: 'utf-8', mode: 0o600 });
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to write to ${filePath}: ${message}`, {
			cause: error,
		});
	}
}

/**
 * 解析 JSON 内容
 */
function parseJsonContent(content: string): Record<string, unknown> {
	const parsed: unknown = JSON.parse(content);

	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new TypeError('JSON root must be an object');
	}

	// 类型守卫已确认 parsed 是非 null 对象且非数组
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- 运行时已验证为对象
	return parsed as Record<string, unknown>;
}

/**
 * 初始化存储文件
 */
async function initializeStorage(
	filePath: string,
	atomic: boolean
): Promise<Record<string, unknown>> {
	if (existsSync(filePath)) {
		const content = await readFile(filePath, 'utf-8');
		return parseJsonContent(content);
	}

	// 文件不存在，创建空对象
	const data: Record<string, unknown> = {};
	const dir = dirname(filePath);
	await mkdir(dir, { recursive: true });
	await persistData(data, filePath, atomic);
	return data;
}

/**
 * 创建基于 JSON 文件的状态存储
 * @param filePath JSON 文件路径
 * @param opts 配置选项
 * @returns StateStore 实例
 */
export function createJsonStateStore(filePath: string, opts?: JsonStoreOptions): StateStore {
	if (typeof filePath !== 'string' || filePath.trim().length === 0) {
		throw new TypeError('filePath must be a non-empty string');
	}

	const atomic = opts?.atomic ?? true;
	let data: Record<string, unknown> = {};
	let initPromise: Promise<void> | null = null;

	/**
	 * 确保已初始化
	 * @returns Promise<void>
	 */
	async function ensureInitialized(): Promise<void> {
		if (initPromise !== null) {
			return initPromise;
		}

		initPromise = (async (): Promise<void> => {
			try {
				data = await initializeStorage(filePath, atomic);
			} catch (error) {
				if (error instanceof SyntaxError) {
					const content = await readFile(filePath, 'utf-8');
					const preview =
						content.length > MAX_CONTENT_PREVIEW
							? `${content.slice(0, MAX_CONTENT_PREVIEW)}...`
							: content;
					const message = error instanceof Error ? error.message : String(error);
					throw new SyntaxError(
						`Failed to parse JSON from ${filePath}: ${message}. Content preview: ${preview}`,
						{ cause: error }
					);
				}
				if (error instanceof TypeError) {
					throw error;
				}
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`Failed to initialize JSON store at ${filePath}: ${message}`, {
					cause: error,
				});
			}
		})();

		return initPromise;
	}

	async function get<T = unknown>(key: string): Promise<T | undefined> {
		await ensureInitialized();

		if (typeof key !== 'string' || key.trim().length === 0) {
			throw new TypeError('key must be a non-empty string');
		}

		const value = data[key];
		// 使用类型断言，调用者负责确保类型正确性
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- 泛型类型由调用者保证
		return value === undefined ? undefined : (value as T);
	}

	async function set(key: string, val: unknown): Promise<void> {
		await ensureInitialized();

		if (typeof key !== 'string' || key.trim().length === 0) {
			throw new TypeError('key must be a non-empty string');
		}

		data[key] = val;
		await persistData(data, filePath, atomic);
	}

	async function patch<T extends Record<string, unknown>>(
		key: string,
		partial: Partial<T>
	): Promise<T> {
		await ensureInitialized();

		if (typeof key !== 'string' || key.trim().length === 0) {
			throw new TypeError('key must be a non-empty string');
		}

		// partial 的类型已经由 Partial<T>
		if (typeof partial !== 'object') {
			throw new TypeError('partial must be an object');
		}

		// 获取当前值，如果不存在则使用空对象
		const current = data[key];

		// 使用类型断言，调用者需确保类型兼容性
		const base: T =
			current === undefined
				? // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- 泛型类型由调用者保证
					({} as T)
				: // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- 泛型类型由调用者保证
					(current as T);

		// 使用 mergeDeviceState 进行不可变合并
		const merged = mergeDeviceState(base, partial);

		data[key] = merged;
		await persistData(data, filePath, atomic);

		return merged;
	}

	async function keys(prefix?: string): Promise<string[]> {
		await ensureInitialized();

		const allKeys = Object.keys(data);

		if (prefix === undefined || prefix.length === 0) {
			return allKeys;
		}

		return allKeys.filter((key) => key.startsWith(prefix));
	}

	return {
		get,
		set,
		patch,
		keys,
	};
}
