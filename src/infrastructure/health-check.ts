/**
 * 暴露内部健康状态探针，供 HTTP 健康检查或自检使用
 */

/**
 * 健康检查详情
 */
export interface HealthDetails {
	uptime?: number | { ok: boolean; error: string };
	adaptersOk?: boolean | { ok: boolean; error: string };
	storageOk?: boolean | { ok: boolean; error: string };
}

/**
 * 健康状态响应
 */
export interface HealthStatus {
	ok: boolean;
	details: HealthDetails;
}

/**
 * 健康探针接口
 */
export interface HealthProbe {
	getStatus: () => HealthStatus;
}

/**
 * 健康检查 getter 函数集合
 */
export interface HealthGetters {
	uptime: () => number;
	adaptersOk: () => boolean;
	storageOk: () => boolean;
}

/**
 * 检查 uptime 状态
 */
function checkUptime(uptimeGetter: () => number): {
	ok: boolean;
	value: number | { ok: boolean; error: string };
} {
	try {
		const uptime = uptimeGetter();
		return { ok: true, value: uptime };
	} catch (err) {
		return {
			ok: false,
			value: {
				ok: false,
				error: err instanceof Error ? err.message : String(err),
			},
		};
	}
}

/**
 * 检查 adapters 状态
 */
function checkAdapters(adaptersOkGetter: () => boolean): {
	ok: boolean;
	value: boolean | { ok: boolean; error: string };
} {
	try {
		const adaptersOk = adaptersOkGetter();
		if (!adaptersOk) {
			return { ok: false, value: adaptersOk };
		}
		return { ok: true, value: adaptersOk };
	} catch (err) {
		return {
			ok: false,
			value: {
				ok: false,
				error: err instanceof Error ? err.message : String(err),
			},
		};
	}
}

/**
 * 检查 storage 状态
 */
function checkStorage(storageOkGetter: () => boolean): {
	ok: boolean;
	value: boolean | { ok: boolean; error: string };
} {
	try {
		const storageOk = storageOkGetter();
		if (!storageOk) {
			return { ok: false, value: storageOk };
		}
		return { ok: true, value: storageOk };
	} catch (err) {
		return {
			ok: false,
			value: {
				ok: false,
				error: err instanceof Error ? err.message : String(err),
			},
		};
	}
}

/**
 * 创建健康探针，汇总关键子系统状态
 * @param getters 包含各子系统状态获取函数的对象
 * @returns 健康探针对象
 */
export function createHealthProbe(getters: HealthGetters): HealthProbe {
	function getStatus(): HealthStatus {
		let overallOk = true;
		const details: HealthDetails = {};

		// 检查 uptime
		const uptimeResult = checkUptime(getters.uptime);
		details.uptime = uptimeResult.value;
		if (!uptimeResult.ok) {
			overallOk = false;
		}

		// 检查 adapters
		const adaptersResult = checkAdapters(getters.adaptersOk);
		details.adaptersOk = adaptersResult.value;
		if (!adaptersResult.ok) {
			overallOk = false;
		}

		// 检查 storage
		const storageResult = checkStorage(getters.storageOk);
		details.storageOk = storageResult.value;
		if (!storageResult.ok) {
			overallOk = false;
		}

		return {
			ok: overallOk,
			details,
		};
	}

	return {
		getStatus,
	};
}
