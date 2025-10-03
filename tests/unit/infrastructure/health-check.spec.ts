/**
 * 单元测试：infrastructure/health-check.ts
 */

import { createHealthProbe } from '../../../src/infrastructure/health-check.js';
import type { HealthGetters } from '../../../src/infrastructure/health-check.js';

describe('infrastructure/health-check', () => {
	describe('createHealthProbe', () => {
		// 用例1：所有子系统健康
		it('所有子系统健康时返回 ok', () => {
			const getters: HealthGetters = {
				uptime: () => 1000,
				adaptersOk: () => true,
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(true);
			expect(status.details.uptime).toBe(1000);
			expect(status.details.adaptersOk).toBe(true);
			expect(status.details.storageOk).toBe(true);
		});

		// 用例2：adapters 不健康
		it('adapters 不健康时返回 not ok', () => {
			const getters: HealthGetters = {
				uptime: () => 1000,
				adaptersOk: () => false,
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(false);
			expect(status.details.adaptersOk).toBe(false);
		});

		// 用例3：storage 不健康
		it('storage 不健康时返回 not ok', () => {
			const getters: HealthGetters = {
				uptime: () => 1000,
				adaptersOk: () => true,
				storageOk: () => false,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(false);
			expect(status.details.storageOk).toBe(false);
		});

		// 用例4：uptime getter 抛出错误
		it('处理 uptime getter 错误', () => {
			const getters: HealthGetters = {
				uptime: () => {
					throw new Error('Uptime error');
				},
				adaptersOk: () => true,
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(false);
			expect(status.details.uptime).toEqual({
				ok: false,
				error: 'Uptime error',
			});
		});

		// 用例5：adapters getter 抛出错误
		it('处理 adapters getter 错误', () => {
			const getters: HealthGetters = {
				uptime: () => 1000,
				adaptersOk: () => {
					throw new Error('Adapters error');
				},
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(false);
			expect(status.details.adaptersOk).toEqual({
				ok: false,
				error: 'Adapters error',
			});
		});

		// 用例6：storage getter 抛出错误
		it('处理 storage getter 错误', () => {
			const getters: HealthGetters = {
				uptime: () => 1000,
				adaptersOk: () => true,
				storageOk: () => {
					throw new Error('Storage error');
				},
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(false);
			expect(status.details.storageOk).toEqual({
				ok: false,
				error: 'Storage error',
			});
		});

		// 用例7：多个子系统同时不健康
		it('处理多个不健康的子系统', () => {
			const getters: HealthGetters = {
				uptime: () => 1000,
				adaptersOk: () => false,
				storageOk: () => false,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(false);
			expect(status.details.adaptersOk).toBe(false);
			expect(status.details.storageOk).toBe(false);
		});

		// 用例8：所有子系统都抛出错误
		it('处理所有 getter 抛出错误', () => {
			const getters: HealthGetters = {
				uptime: () => {
					throw new Error('Uptime error');
				},
				adaptersOk: () => {
					throw new Error('Adapters error');
				},
				storageOk: () => {
					throw new Error('Storage error');
				},
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(false);
			expect(status.details.uptime).toEqual({
				ok: false,
				error: 'Uptime error',
			});
			expect(status.details.adaptersOk).toEqual({
				ok: false,
				error: 'Adapters error',
			});
			expect(status.details.storageOk).toEqual({
				ok: false,
				error: 'Storage error',
			});
		});

		// 用例9：非 Error 类型的异常
		it('处理非 Error 异常', () => {
			const getters: HealthGetters = {
				uptime: () => {
					throw 'String error';
				},
				adaptersOk: () => true,
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(false);
			expect(status.details.uptime).toEqual({
				ok: false,
				error: 'String error',
			});
		});

		// 用例9a：adaptersOk 抛出非 Error 异常
		it('处理 adaptersOk 的非 Error 异常', () => {
			const getters: HealthGetters = {
				uptime: () => 1000,
				adaptersOk: () => {
					throw 'Adapter error string';
				},
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(false);
			expect(status.details.adaptersOk).toEqual({
				ok: false,
				error: 'Adapter error string',
			});
		});

		// 用例9b：storageOk 抛出非 Error 异常
		it('处理 storageOk 的非 Error 异常', () => {
			const getters: HealthGetters = {
				uptime: () => 1000,
				adaptersOk: () => true,
				storageOk: () => {
					throw { code: 500, message: 'Storage failure' };
				},
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(false);
			expect(status.details.storageOk).toEqual({
				ok: false,
				error: '[object Object]',
			});
		});

		// 用例10：uptime 为零
		it('接受 uptime 为 0', () => {
			const getters: HealthGetters = {
				uptime: () => 0,
				adaptersOk: () => true,
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(true);
			expect(status.details.uptime).toBe(0);
		});

		// 用例11：多次调用 getStatus
		it('支持多次调用 getStatus', () => {
			let counter = 0;
			const getters: HealthGetters = {
				uptime: () => {
					counter += 1;
					return counter * 1000;
				},
				adaptersOk: () => true,
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);

			const status1 = probe.getStatus();
			expect(status1.details.uptime).toBe(1000);

			const status2 = probe.getStatus();
			expect(status2.details.uptime).toBe(2000);
		});

		// 用例12：getters 状态可以改变
		it('反映 getter 状态变化', () => {
			let adaptersHealthy = true;

			const getters: HealthGetters = {
				uptime: () => 1000,
				adaptersOk: () => adaptersHealthy,
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);

			const status1 = probe.getStatus();
			expect(status1.ok).toBe(true);

			adaptersHealthy = false;

			const status2 = probe.getStatus();
			expect(status2.ok).toBe(false);
		});

		// 用例13：大 uptime 值
		it('处理大数值 uptime', () => {
			const getters: HealthGetters = {
				uptime: () => Number.MAX_SAFE_INTEGER,
				adaptersOk: () => true,
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status.ok).toBe(true);
			expect(status.details.uptime).toBe(Number.MAX_SAFE_INTEGER);
		});

		// 用例14：返回对象结构完整性
		it('返回完整的 status 结构', () => {
			const getters: HealthGetters = {
				uptime: () => 1000,
				adaptersOk: () => true,
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			expect(status).toHaveProperty('ok');
			expect(status).toHaveProperty('details');
			expect(status.details).toHaveProperty('uptime');
			expect(status.details).toHaveProperty('adaptersOk');
			expect(status.details).toHaveProperty('storageOk');
		});

		// 用例15：部分错误不影响其他检查
		it('一个 getter 失败时继续检查其他', () => {
			const getters: HealthGetters = {
				uptime: () => {
					throw new Error('Uptime error');
				},
				adaptersOk: () => true,
				storageOk: () => true,
			};

			const probe = createHealthProbe(getters);
			const status = probe.getStatus();

			// uptime 错误，但其他检查继续
			expect(status.details.adaptersOk).toBe(true);
			expect(status.details.storageOk).toBe(true);
		});
	});
});
