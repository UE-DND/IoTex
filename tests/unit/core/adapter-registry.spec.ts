/**
 * 单元测试：core/adapter-registry.ts
 */

import { describe, it, expect } from '@jest/globals';
import { createAdapterRegistry } from '../../../src/core/adapter-registry.js';
import type { ProtocolAdapter } from '../../../src/domain/adapter-interface.js';
import { createMockAdapter } from '../../mocks/mock-adapter.js';

describe('core/adapter-registry', () => {
	describe('createAdapterRegistry', () => {
		// 用例1：创建注册表实例
		it('创建注册表实例', () => {
			const registry = createAdapterRegistry();
			expect(registry).toBeDefined();
			expect(registry.register).toBeInstanceOf(Function);
			expect(registry.get).toBeInstanceOf(Function);
			expect(registry.list).toBeInstanceOf(Function);
			expect(registry.has).toBeInstanceOf(Function);
		});

		// 用例2：初始状态应为空
		it('初始状态应为空', () => {
			const registry = createAdapterRegistry();
			expect(registry.list()).toEqual([]);
		});

		describe('register', () => {
			// 用例3：注册适配器
			it('注册适配器', () => {
				const registry = createAdapterRegistry();
				const adapter = createMockAdapter();

				registry.register('mqtt', adapter);
				expect(registry.has('mqtt')).toBe(true);
			});

			// 用例4：空名称应抛出 TypeError
			it('空名称应抛出 TypeError', () => {
				const registry = createAdapterRegistry();
				const adapter = createMockAdapter();

				expect(() => registry.register('', adapter)).toThrow(TypeError);
				expect(() => registry.register('', adapter)).toThrow(/non-empty string/);
			});

			// 用例5：空白名称应抛出 TypeError
			it('空白名称应抛出 TypeError', () => {
				const registry = createAdapterRegistry();
				const adapter = createMockAdapter();

				expect(() => registry.register('   ', adapter)).toThrow(TypeError);
			});

			// 用例6：非字符串名称应抛出 TypeError
			it('非字符串名称应抛出 TypeError', () => {
				const registry = createAdapterRegistry();
				const adapter = createMockAdapter();

				expect(() => registry.register(123 as any, adapter)).toThrow(TypeError);
			});

			// 用例7：重复注册应抛出 Error
			it('重复注册应抛出 Error', () => {
				const registry = createAdapterRegistry();
				const adapter = createMockAdapter();

				registry.register('mqtt', adapter);
				expect(() => registry.register('mqtt', adapter)).toThrow(Error);
				expect(() => registry.register('mqtt', adapter)).toThrow(/already registered/);
			});

			// 用例8：缺少必需方法的适配器应抛出错误
			it('缺少必需方法的适配器应抛出错误', () => {
				const registry = createAdapterRegistry();
				const invalidAdapter = {} as ProtocolAdapter;

				expect(() => registry.register('invalid', invalidAdapter)).toThrow();
			});

			// 用例9：注册多个适配器
			it('注册多个适配器', () => {
				const registry = createAdapterRegistry();
				const adapter1 = createMockAdapter();
				const adapter2 = createMockAdapter();
				const adapter3 = createMockAdapter();

				registry.register('mqtt', adapter1);
				registry.register('http', adapter2);
				registry.register('zigbee', adapter3);

				expect(registry.list()).toHaveLength(3);
				expect(registry.list()).toContain('mqtt');
				expect(registry.list()).toContain('http');
				expect(registry.list()).toContain('zigbee');
			});
		});

		describe('get', () => {
			// 用例10：获取已注册的适配器
			it('获取已注册的适配器', () => {
				const registry = createAdapterRegistry();
				const adapter = createMockAdapter();

				registry.register('mqtt', adapter);
				const retrieved = registry.get('mqtt');

				expect(retrieved).toBe(adapter);
			});

			// 用例11：获取未注册的适配器返回 undefined
			it('获取未注册的适配器返回 undefined', () => {
				const registry = createAdapterRegistry();
				const result = registry.get('nonexistent');
				expect(result).toBeUndefined();
			});

			// 用例12：多次获取返回同一实例
			it('多次获取返回同一实例', () => {
				const registry = createAdapterRegistry();
				const adapter = createMockAdapter();

				registry.register('mqtt', adapter);
				const first = registry.get('mqtt');
				const second = registry.get('mqtt');

				expect(first).toBe(second);
			});
		});

		describe('has', () => {
			// 用例13：检查已注册的适配器
			it('检查已注册的适配器', () => {
				const registry = createAdapterRegistry();
				const adapter = createMockAdapter();

				registry.register('mqtt', adapter);
				expect(registry.has('mqtt')).toBe(true);
			});

			// 用例14：检查未注册的适配器
			it('检查未注册的适配器', () => {
				const registry = createAdapterRegistry();
				expect(registry.has('mqtt')).toBe(false);
			});
		});

		describe('list', () => {
			// 用例15：列出所有适配器名称
			it('列出所有适配器名称', () => {
				const registry = createAdapterRegistry();
				const adapter = createMockAdapter();

				registry.register('mqtt', adapter);
				registry.register('http', adapter);

				const names = registry.list();
				expect(names).toHaveLength(2);
				expect(names).toContain('mqtt');
				expect(names).toContain('http');
			});

			// 用例16：保持插入顺序
			it('保持插入顺序', () => {
				const registry = createAdapterRegistry();
				const adapter = createMockAdapter();

				registry.register('first', adapter);
				registry.register('second', adapter);
				registry.register('third', adapter);

				const names = registry.list();
				expect(names).toEqual(['first', 'second', 'third']);
			});

			// 用例17：空注册表返回空数组
			it('空注册表返回空数组', () => {
				const registry = createAdapterRegistry();
				expect(registry.list()).toEqual([]);
			});
		});

		describe('Integration', () => {
			// 用例18：完整流程测试
			it('完整流程测试', () => {
				const registry = createAdapterRegistry();
				const adapter1 = createMockAdapter();
				const adapter2 = createMockAdapter();

				// 注册
				registry.register('mqtt', adapter1);
				registry.register('http', adapter2);

				// 检查
				expect(registry.has('mqtt')).toBe(true);
				expect(registry.has('http')).toBe(true);
				expect(registry.has('other')).toBe(false);

				// 获取
				expect(registry.get('mqtt')).toBe(adapter1);
				expect(registry.get('http')).toBe(adapter2);

				// 列出
				expect(registry.list()).toEqual(['mqtt', 'http']);
			});
		});
	});
});
