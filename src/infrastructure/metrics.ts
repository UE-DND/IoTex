/**
 * 提供轻量级指标收集（计数器/仪表盘）接口，用于日志或后续导出
 */

/**
 * 计数器接口
 */
export interface Counter {
	inc: (n?: number) => void;
	get: () => number;
}

/**
 * 仪表盘接口
 */
export interface Gauge {
	set: (v: number) => void;
	get: () => number;
}

/**
 * 指标注册表接口
 */
export interface MetricsRegistry {
	counter: (name: string) => Counter;
	gauge: (name: string) => Gauge;
}

/**
 * 创建指标注册表，在内存中维护命名指标
 * @returns 指标注册表实例
 */
export function createMetricsRegistry(): MetricsRegistry {
	// 存储计数器
	const counters = new Map<string, Counter>();
	// 存储仪表盘
	const gauges = new Map<string, Gauge>();

	function counter(name: string): Counter {
		// 如果已存在，返回同一实例
		const existing = counters.get(name);
		if (existing !== undefined) {
			return existing;
		}

		// 创建新的计数器
		let value = 0;

		const counterInstance: Counter = {
			inc(n = 1): void {
				if (typeof n !== 'number' || !Number.isFinite(n)) {
					throw new TypeError('Counter increment must be a finite number');
				}
				if (n < 0) {
					throw new TypeError('Counter increment must be non-negative');
				}
				value += n;
			},
			get(): number {
				return value;
			},
		};

		counters.set(name, counterInstance);
		return counterInstance;
	}

	function gauge(name: string): Gauge {
		// 如果已存在，返回同一实例
		const existing = gauges.get(name);
		if (existing !== undefined) {
			return existing;
		}

		// 创建新的仪表盘
		let value = 0;

		const gaugeInstance: Gauge = {
			set(v: number): void {
				if (typeof v !== 'number' || !Number.isFinite(v)) {
					throw new TypeError('Gauge value must be a finite number');
				}
				value = v;
			},
			get(): number {
				return value;
			},
		};

		gauges.set(name, gaugeInstance);
		return gaugeInstance;
	}

	return {
		counter,
		gauge,
	};
}
