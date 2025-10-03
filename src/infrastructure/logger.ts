/**
 * 提供结构化 JSON 日志，统一时间戳、级别、组件与可选 traceId
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
	debug: (msg: string, extra?: Record<string, unknown>) => void;
	info: (msg: string, extra?: Record<string, unknown>) => void;
	warn: (msg: string, extra?: Record<string, unknown>) => void;
	error: (msg: string, extra?: Record<string, unknown>) => void;
}

interface LogEntry {
	ts: string;
	level: LogLevel;
	component: string;
	msg: string;
	extra?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

function isLogLevel(value: unknown): value is LogLevel {
	return typeof value === 'string' && Object.hasOwn(LOG_LEVELS, value);
}

/**
 * 构造分组件 Logger，输出到 stdout（error 到 stderr），JSON 行格式
 * @param component 组件名称，非空字符串
 * @param level 最低输出级别，默认 'info'（可通过环境变量 LOG_LEVEL 覆盖）
 * @returns Logger 对象，包含四个方法
 * @throws TypeError 当 component 为空时
 * @throws RangeError 当 level 未知时
 */
export function createLogger(component: string, level: LogLevel = 'info'): Logger {
	if (!component || typeof component !== 'string' || component.trim().length === 0) {
		throw new TypeError('component must be a non-empty string');
	}

	// 支持从环境变量读取日志级别（测试环境可以设置为 'error' 以减少输出）
	const rawEnvLevel = process.env.LOG_LEVEL;
	const effectiveLevel = isLogLevel(rawEnvLevel) ? rawEnvLevel : level;

	if (!Object.keys(LOG_LEVELS).includes(effectiveLevel)) {
		throw new RangeError(`Unknown log level: ${effectiveLevel}`);
	}

	const minLevelValue = LOG_LEVELS[effectiveLevel];

	function logMessage(logLevel: LogLevel, msg: string, extra?: Record<string, unknown>): void {
		if (LOG_LEVELS[logLevel] < minLevelValue) {
			return; // 级别过滤
		}

		const entry: LogEntry = {
			ts: new Date().toISOString(),
			level: logLevel,
			component,
			msg,
		};

		if (extra && Object.keys(extra).length > 0) {
			entry.extra = extra;
		}

		const output = JSON.stringify(entry);

		// error 级别输出到 stderr，其他输出到 stdout
		if (logLevel === 'error') {
			process.stderr.write(`${output}\n`);
		} else {
			process.stdout.write(`${output}\n`);
		}
	}

	return {
		debug: (msg: string, extra?: Record<string, unknown>): void => {
			logMessage('debug', msg, extra);
		},
		info: (msg: string, extra?: Record<string, unknown>): void => {
			logMessage('info', msg, extra);
		},
		warn: (msg: string, extra?: Record<string, unknown>): void => {
			logMessage('warn', msg, extra);
		},
		error: (msg: string, extra?: Record<string, unknown>): void => {
			logMessage('error', msg, extra);
		},
	};
}
