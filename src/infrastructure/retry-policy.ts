/**
 * 提供通用重试策略（指数退避 + 抖动），用于设备命令与网络调用的稳健性保障
 */

// 常量定义
const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_MS = 100;
const DEFAULT_MAX_MS = 5000;
const EXPONENTIAL_BASE = 2;
const JITTER_MIN_FACTOR = 0.8;
const JITTER_RANGE = 0.4;

/**
 * 重试选项
 */
export interface RetryOptions {
	/** 重试次数，默认 3 */
	retries?: number;
	/** 基础延迟（毫秒），默认 100 */
	baseMs?: number;
	/** 最大延迟（毫秒），默认 5000 */
	maxMs?: number;
	/** 是否启用抖动，默认 true */
	jitter?: boolean;
	/** 重试回调函数 */
	onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
}

/**
 * 计算延迟配置
 */
interface DelayConfig {
	attempt: number;
	baseMs: number;
	maxMs: number;
	jitter: boolean;
}

/**
 * 单次尝试结果
 */
type AttemptResult<T> = { success: true; value: T } | { success: false; error: unknown };

/**
 * 计算延迟时间（指数退避 + 可选抖动）
 * @param config 延迟计算配置
 * @returns 延迟时间（毫秒）
 */
function calculateDelay(config: DelayConfig): number {
	// 指数退避：baseMs * 2^(attempt-1)
	const exponentialDelay = config.baseMs * EXPONENTIAL_BASE ** (config.attempt - 1);
	let delay = Math.min(exponentialDelay, config.maxMs);

	// 如果启用抖动，添加随机因子（±20%）
	if (config.jitter) {
		const jitterFactor = JITTER_MIN_FACTOR + Math.random() * JITTER_RANGE;
		delay *= jitterFactor;
	}

	return Math.floor(delay);
}

/**
 * 延迟指定毫秒数
 * @param ms 延迟毫秒数
 * @returns Promise
 */
async function sleep(ms: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
}

/**
 * 验证重试参数
 */
function validateRetryParams(retries: number, baseMs: number, maxMs: number): void {
	if (retries < 0 || !Number.isInteger(retries)) {
		throw new RangeError('retries must be a non-negative integer');
	}

	if (baseMs <= 0 || !Number.isFinite(baseMs)) {
		throw new RangeError('baseMs must be a positive finite number');
	}

	if (maxMs <= 0 || !Number.isFinite(maxMs)) {
		throw new RangeError('maxMs must be a positive finite number');
	}
}

/**
 * 执行单次重试尝试
 */
async function executeSingleAttempt<T>(config: {
	op: () => Promise<T>;
	attempt: number;
	maxAttempts: number;
	baseMs: number;
	maxMs: number;
	jitter: boolean;
	onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
}): Promise<AttemptResult<T>> {
	try {
		const value = await config.op();
		return { success: true, value };
	} catch (error) {
		// 如果是最后一次尝试，返回错误
		if (config.attempt === config.maxAttempts) {
			return { success: false, error };
		}

		// 计算延迟时间
		const delayMs = calculateDelay({
			attempt: config.attempt,
			baseMs: config.baseMs,
			maxMs: config.maxMs,
			jitter: config.jitter,
		});

		// 调用重试回调
		if (config.onRetry !== undefined) {
			try {
				config.onRetry(error, config.attempt, delayMs);
			} catch {
				// 忽略回调中的错误
			}
		}

		// 等待后返回
		await sleep(delayMs);
		return { success: false, error };
	}
}

/**
 * 执行重试循环
 */
async function executeWithRetry<T>(config: {
	op: () => Promise<T>;
	maxAttempts: number;
	baseMs: number;
	maxMs: number;
	jitter: boolean;
	onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
}): Promise<T> {
	let lastError: unknown;

	// 顺序执行每个尝试（必须使用 await in loop，因为需要顺序重试）
	for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
		// eslint-disable-next-line no-await-in-loop -- 重试逻辑必须顺序执行
		const result = await executeSingleAttempt({
			...config,
			attempt,
		});

		if (result.success) {
			return result.value;
		}

		lastError = result.error;
	}

	// 抛出最后一次错误
	throw lastError;
}

/**
 * 使用重试策略执行异步操作
 * @param op 异步操作函数
 * @param opts 重试选项
 * @returns 操作成功的结果
 * @throws 超出重试次数后抛出最后一次错误
 */
export async function withRetry<T>(op: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
	const {
		retries = DEFAULT_RETRIES,
		baseMs = DEFAULT_BASE_MS,
		maxMs = DEFAULT_MAX_MS,
		jitter = true,
		onRetry,
	} = opts;

	// 参数校验
	validateRetryParams(retries, baseMs, maxMs);

	const maxAttempts = retries + 1; // 初始尝试 + 重试次数

	return executeWithRetry({
		op,
		maxAttempts,
		baseMs,
		maxMs,
		jitter,
		onRetry,
	});
}
