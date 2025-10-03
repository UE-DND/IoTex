/**
 * 事件追加存储（append-only），用于审计与调试（可选启用）
 */

import { existsSync } from 'node:fs';
import { appendFile, readdir, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\.log$/;
const MS_PER_DAY = 86_400_000; // 24 * 60 * 60 * 1000
const DATE_STRING_PADDING = 2;

/**
 * 事件对象结构
 */
export interface Event {
	/** 时间戳（毫秒） */
	ts: number;
	/** 事件类型 */
	type: string;
	/** 可选的负载数据 */
	payload?: unknown;
}

/**
 * 查询过滤器
 */
export interface EventFilter {
	/** 按类型过滤 */
	type?: string;
	/** 起始时间（毫秒） */
	since?: number;
	/** 结束时间（毫秒） */
	until?: number;
}

/**
 * 事件存储接口
 */
export interface EventStore {
	/**
	 * 追加事件
	 * @param evt 事件对象
	 */
	append: (evt: Event) => Promise<void>;

	/**
	 * 查询事件
	 * @param filter 可选的过滤器
	 * @returns 事件数组
	 */
	query: (filter?: EventFilter) => Promise<Event[]>;
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param date 日期对象
 * @returns 格式化的日期字符串
 */
function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(DATE_STRING_PADDING, '0');
	const day = String(date.getDate()).padStart(DATE_STRING_PADDING, '0');
	return `${year}-${month}-${day}`;
}

/**
 * 解析日期文件名为时间戳范围
 * @param filename 文件名（YYYY-MM-DD.log）
 * @returns 该日的起始和结束时间戳，如果文件名无效则返回 null
 */
function parseDateFilename(filename: string): { start: number; end: number } | null {
	const match = DATE_PATTERN.exec(filename);
	if (match === null) {
		return null;
	}

	const [, year, month, day] = match;
	const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
	if (isNaN(date.getTime())) {
		return null;
	}

	const start = date.getTime();
	const end = start + MS_PER_DAY - 1;

	return { start, end };
}

/**
 * 过滤相关的日志文件
 */
function filterRelevantFiles(logFiles: string[], filter?: EventFilter): string[] {
	const hasSince = filter?.since !== undefined;
	const hasUntil = filter?.until !== undefined;

	if (!hasSince && !hasUntil) {
		return logFiles;
	}

	return logFiles.filter((filename) => {
		const range = parseDateFilename(filename);
		if (range === null) {
			return false;
		}

		// 检查文件日期范围是否与查询时间窗口重叠
		if (hasSince && filter.since !== undefined && range.end < filter.since) {
			return false;
		}
		if (hasUntil && filter.until !== undefined && range.start > filter.until) {
			return false;
		}
		return true;
	});
}

/**
 * 应用事件过滤器
 */
function applyEventFilter(evt: Event, filter?: EventFilter): boolean {
	if (filter?.type !== undefined && evt.type !== filter.type) {
		return false;
	}
	if (filter?.since !== undefined && evt.ts < filter.since) {
		return false;
	}
	if (filter?.until !== undefined && evt.ts > filter.until) {
		return false;
	}
	return true;
}

/**
 * 类型守卫：检查对象是否为有效的 Event
 */
function isValidEvent(data: unknown): data is Event {
	if (data === null || typeof data !== 'object') {
		return false;
	}

	// 使用类型谓词和安全的类型检查
	const obj = data as { ts?: unknown; type?: unknown };

	return typeof obj.ts === 'number' && typeof obj.type === 'string';
}

/**
 * 解析单行事件
 */
function parseEventLine(line: string, filter?: EventFilter): Event | null {
	let parsedData: unknown;

	try {
		parsedData = JSON.parse(line);
	} catch {
		// 忽略无效的 JSON 行
		return null;
	}

	// 使用类型守卫
	if (!isValidEvent(parsedData)) {
		return null;
	}

	// 应用过滤器
	if (!applyEventFilter(parsedData, filter)) {
		return null;
	}

	return parsedData;
}

/**
 * 解析单个日志文件
 */
async function parseLogFile(
	dirPath: string,
	filename: string,
	filter?: EventFilter
): Promise<Event[]> {
	const filePath = join(dirPath, filename);
	const events: Event[] = [];

	try {
		const content = await readFile(filePath, 'utf-8');
		const lines = content.split('\n').filter((line) => line.trim().length > 0);

		for (const line of lines) {
			const evt = parseEventLine(line, filter);
			if (evt !== null) {
				events.push(evt);
			}
		}
	} catch {
		// 忽略单个文件读取失败
	}

	return events;
}

/**
 * 查询所有事件
 */
async function queryAllEvents(dirPath: string, filter?: EventFilter): Promise<Event[]> {
	// 读取目录中的所有日志文件
	const files = await readdir(dirPath);
	const logFiles = files.filter((f) => f.endsWith('.log'));

	// 筛选相关的日志文件
	const relevantFiles = filterRelevantFiles(logFiles, filter);

	// 读取并解析所有相关文件
	const eventArrays = await Promise.all(
		relevantFiles.map(async (filename) => parseLogFile(dirPath, filename, filter))
	);

	const allEvents = eventArrays.flat();

	// 按时间戳排序
	allEvents.sort((a, b) => a.ts - b.ts);

	return allEvents;
}

/**
 * 创建事件存储
 * @param dir 存储目录路径
 * @returns EventStore 实例
 */
export function createEventStore(dir: string): EventStore {
	if (typeof dir !== 'string' || dir.trim().length === 0) {
		throw new TypeError('dir must be a non-empty string');
	}

	/**
	 * 确保目录存在
	 */
	async function ensureDir(): Promise<void> {
		if (!existsSync(dir)) {
			try {
				await mkdir(dir, { recursive: true });
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`Failed to create event store directory ${dir}: ${message}`, {
					cause: error,
				});
			}
		}
	}

	/**
	 * 获取指定时间戳对应的日志文件路径
	 * @param ts 时间戳
	 * @returns 日志文件路径
	 */
	function getLogFilePath(ts: number): string {
		const date = new Date(ts);
		const filename = `${formatDate(date)}.log`;
		return join(dir, filename);
	}

	async function append(evt: Event): Promise<void> {
		// 校验事件对象
		if (typeof evt !== 'object') {
			throw new TypeError('evt must be an object');
		}

		if (typeof evt.ts !== 'number' || evt.ts < 0 || !Number.isFinite(evt.ts)) {
			throw new TypeError('evt.ts must be a non-negative finite number');
		}

		if (typeof evt.type !== 'string' || evt.type.trim().length === 0) {
			throw new TypeError('evt.type must be a non-empty string');
		}

		await ensureDir();

		// 序列化为 JSON 行
		const line = `${JSON.stringify(evt)}\n`;

		// 获取日志文件路径
		const logPath = getLogFilePath(evt.ts);

		try {
			await appendFile(logPath, line, 'utf-8');
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to append event to ${logPath}: ${message}`, {
				cause: error,
			});
		}
	}

	async function query(filter?: EventFilter): Promise<Event[]> {
		// 如果目录不存在，返回空数组
		if (!existsSync(dir)) {
			return [];
		}

		try {
			return await queryAllEvents(dir, filter);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to query events from ${dir}: ${message}`, {
				cause: error,
			});
		}
	}

	return {
		append,
		query,
	};
}
