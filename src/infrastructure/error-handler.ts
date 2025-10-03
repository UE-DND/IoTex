/**
 * 集中化错误归一与捕获包装，统一错误对象形态与日志输出
 */

import type { Logger } from './logger.js';

/**
 * 规范化的错误对象结构
 */
export interface NormalizedError {
	name: string;
	message: string;
	stack?: string;
	component?: string;
	cause?: unknown;
}

/**
 * 安全地将值转换为字符串
 */
function safeStringify(value: unknown): string {
	try {
		if (typeof value === 'object' && value !== null) {
			// 尝试提取可能的 toString 或 message
			if ('message' in value && typeof value.message === 'string') {
				return value.message;
			}
			// 对于对象，使用 JSON.stringify
			return JSON.stringify(value);
		}
		return String(value);
	} catch {
		return 'Error cannot be converted to string';
	}
}

/**
 * 处理 Error 实例
 */
function normalizeErrorInstance(err: Error, component?: string): NormalizedError {
	const normalized: NormalizedError = {
		name: err.name,
		message: err.message,
	};

	if (component !== undefined && component.length > 0) {
		normalized.component = component;
	}

	if (err.stack !== undefined && err.stack.length > 0) {
		normalized.stack = err.stack;
	}

	if ('cause' in err && err.cause !== undefined) {
		normalized.cause = err.cause;
	}

	return normalized;
}

/**
 * 将任意 unknown 转换为规范化错误对象（可安全序列化）
 * @param err 任意错误值
 * @param component 可选的组件名称
 * @returns 标准错误对象
 */
export function normalizeError(err: unknown, component?: string): NormalizedError {
	// 如果是 Error 实例，提取标准属性
	if (err instanceof Error) {
		return normalizeErrorInstance(err, component);
	}

	// 创建基础错误对象
	const normalized: NormalizedError = {
		name: 'UnknownError',
		message: 'An unknown error occurred',
	};

	if (component !== undefined && component.length > 0) {
		normalized.component = component;
	}

	// 如果是字符串，直接作为消息
	if (typeof err === 'string') {
		normalized.message = err;
		return normalized;
	}

	// 其他非空值，尝试转换为字符串
	if (err !== null && err !== undefined) {
		normalized.message = safeStringify(err);
		normalized.cause = err;
	}

	return normalized;
}

/**
 * 执行异步函数并捕获异常，使用 logger.error 输出规范化错误后重新抛出
 * @param fn 异步函数
 * @param logger 可选的日志记录器
 * @returns fn 的返回值
 * @throws 捕获的错误（规范化后）
 */
export async function wrapAsync<T>(fn: () => Promise<T>, logger?: Logger): Promise<T> {
	try {
		return await fn();
	} catch (err) {
		const normalized = normalizeError(err);

		// 如果提供了 logger，记录错误
		if (logger !== undefined) {
			logger.error('Async operation failed', {
				error: normalized,
			});
		}

		// 重新抛出原始错误（如果是 Error）或规范化后的错误
		if (err instanceof Error) {
			throw err;
		}

		const error = new Error(normalized.message);
		error.name = normalized.name;
		if (normalized.cause !== undefined) {
			// 使用 Error.cause (ES2022+)
			Object.defineProperty(error, 'cause', {
				value: normalized.cause,
				enumerable: false,
				configurable: true,
			});
		}
		throw error;
	}
}
