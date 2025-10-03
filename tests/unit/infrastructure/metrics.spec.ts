/**
 * 单元测试：infrastructure/metrics.ts
 */

import { createMetricsRegistry } from '../../../src/infrastructure/metrics.js';

describe('infrastructure/metrics', () => {
	describe('createMetricsRegistry', () => {
		// 用例1：创建指标注册表
		it('创建指标注册表', () => {
			const registry = createMetricsRegistry();
			expect(registry).toBeDefined();
			expect(registry.counter).toBeInstanceOf(Function);
			expect(registry.gauge).toBeInstanceOf(Function);
		});

		describe('Counter', () => {
			// 用例2：创建计数器并增加
			it('创建计数器并递增', () => {
				const registry = createMetricsRegistry();
				const counter = registry.counter('test_counter');

				expect(counter.get()).toBe(0);
				counter.inc();
				expect(counter.get()).toBe(1);
			});

			// 用例3：计数器增加指定值
			it('按指定值递增', () => {
				const registry = createMetricsRegistry();
				const counter = registry.counter('test_counter');

				counter.inc(5);
				expect(counter.get()).toBe(5);
				counter.inc(3);
				expect(counter.get()).toBe(8);
			});

			// 用例4：相同名称返回同一实例
			it('相同名称返回同一实例', () => {
				const registry = createMetricsRegistry();
				const counter1 = registry.counter('test_counter');
				const counter2 = registry.counter('test_counter');

				counter1.inc(10);
				expect(counter2.get()).toBe(10);
				expect(counter1).toBe(counter2);
			});

			// 用例5：负数增量应抛出 TypeError
			it('负数增量抛出 TypeError', () => {
				const registry = createMetricsRegistry();
				const counter = registry.counter('test_counter');

				expect(() => counter.inc(-1)).toThrow(TypeError);
				expect(() => counter.inc(-1)).toThrow(/non-negative/);
			});

			// 用例6：非数字增量应抛出 TypeError
			it('非数字增量抛出 TypeError', () => {
				const registry = createMetricsRegistry();
				const counter = registry.counter('test_counter');

				expect(() => counter.inc('5' as any)).toThrow(TypeError);
			});

			// 用例7：无限大增量应抛出 TypeError
			it('无限大增量抛出 TypeError', () => {
				const registry = createMetricsRegistry();
				const counter = registry.counter('test_counter');

				expect(() => counter.inc(Infinity)).toThrow(TypeError);
				expect(() => counter.inc(Infinity)).toThrow(/finite number/);
			});

			// 用例8：NaN 增量应抛出 TypeError
			it('NaN 增量抛出 TypeError', () => {
				const registry = createMetricsRegistry();
				const counter = registry.counter('test_counter');

				expect(() => counter.inc(NaN)).toThrow(TypeError);
			});

			// 用例9：零增量应正常工作
			it('接受零增量', () => {
				const registry = createMetricsRegistry();
				const counter = registry.counter('test_counter');

				counter.inc(5);
				counter.inc(0);
				expect(counter.get()).toBe(5);
			});
		});

		describe('Gauge', () => {
			// 用例10：创建仪表盘并设置值
			it('创建 gauge 并设置值', () => {
				const registry = createMetricsRegistry();
				const gauge = registry.gauge('test_gauge');

				expect(gauge.get()).toBe(0);
				gauge.set(100);
				expect(gauge.get()).toBe(100);
			});

			// 用例11：仪表盘可以设置负值
			it('允许负值', () => {
				const registry = createMetricsRegistry();
				const gauge = registry.gauge('test_gauge');

				gauge.set(-50);
				expect(gauge.get()).toBe(-50);
			});

			// 用例12：仪表盘值可以覆盖
			it('覆盖之前的值', () => {
				const registry = createMetricsRegistry();
				const gauge = registry.gauge('test_gauge');

				gauge.set(100);
				gauge.set(200);
				expect(gauge.get()).toBe(200);
			});

			// 用例13：相同名称返回同一实例
			it('相同名称返回同一实例', () => {
				const registry = createMetricsRegistry();
				const gauge1 = registry.gauge('test_gauge');
				const gauge2 = registry.gauge('test_gauge');

				gauge1.set(42);
				expect(gauge2.get()).toBe(42);
				expect(gauge1).toBe(gauge2);
			});

			// 用例14：非数字值应抛出 TypeError
			it('非数字值抛出 TypeError', () => {
				const registry = createMetricsRegistry();
				const gauge = registry.gauge('test_gauge');

				expect(() => gauge.set('100' as any)).toThrow(TypeError);
			});

			// 用例15：无限大值应抛出 TypeError
			it('无限大值抛出 TypeError', () => {
				const registry = createMetricsRegistry();
				const gauge = registry.gauge('test_gauge');

				expect(() => gauge.set(Infinity)).toThrow(TypeError);
				expect(() => gauge.set(Infinity)).toThrow(/finite number/);
			});

			// 用例16：NaN 值应抛出 TypeError
			it('NaN 值抛出 TypeError', () => {
				const registry = createMetricsRegistry();
				const gauge = registry.gauge('test_gauge');

				expect(() => gauge.set(NaN)).toThrow(TypeError);
			});

			// 用例17：零值应正常工作
			it('接受零值', () => {
				const registry = createMetricsRegistry();
				const gauge = registry.gauge('test_gauge');

				gauge.set(0);
				expect(gauge.get()).toBe(0);
			});
		});

		describe('Multiple metrics', () => {
			// 用例18：不同名称的计数器应独立
			it('维护独立的计数器', () => {
				const registry = createMetricsRegistry();
				const counter1 = registry.counter('counter1');
				const counter2 = registry.counter('counter2');

				counter1.inc(10);
				counter2.inc(20);

				expect(counter1.get()).toBe(10);
				expect(counter2.get()).toBe(20);
			});

			// 用例19：不同名称的仪表盘应独立
			it('维护独立的 gauge', () => {
				const registry = createMetricsRegistry();
				const gauge1 = registry.gauge('gauge1');
				const gauge2 = registry.gauge('gauge2');

				gauge1.set(100);
				gauge2.set(200);

				expect(gauge1.get()).toBe(100);
				expect(gauge2.get()).toBe(200);
			});

			// 用例20：计数器和仪表盘命名空间独立
			it('维护独立的计数器和 gauge 命名空间', () => {
				const registry = createMetricsRegistry();
				const counter = registry.counter('metric');
				const gauge = registry.gauge('metric');

				counter.inc(10);
				gauge.set(20);

				expect(counter.get()).toBe(10);
				expect(gauge.get()).toBe(20);
			});
		});
	});
});
