/**
 * 单元测试：http-adapter.ts
 * 测试将通用命令映射为 HTTP 请求
 */

import { buildRequestForCommand } from '../../../../src/adapters/http/http-adapter.js';

describe('adapters/http/http-adapter', () => {
	describe('buildRequestForCommand', () => {
		it('on 命令生成正确 URL 与体', () => {
			const request = buildRequestForCommand('https://api.example.com', {
				device_id: 'light-1',
				action: 'on',
			});

			expect(request.method).toBe('POST');
			expect(request.url).toBe('https://api.example.com/devices/light-1/on');
			expect(request.body).toEqual({
				action: 'on',
				device_id: 'light-1',
			});
		});

		it('off 命令生成正确 URL 与体', () => {
			const request = buildRequestForCommand('https://api.example.com', {
				device_id: 'light-1',
				action: 'off',
			});

			expect(request.method).toBe('POST');
			expect(request.url).toBe('https://api.example.com/devices/light-1/off');
			expect(request.body).toEqual({
				action: 'off',
				device_id: 'light-1',
			});
		});

		it('返回 headers 包含 Content-Type: application/json', () => {
			const request = buildRequestForCommand('https://api.example.com', {
				device_id: 'light-1',
				action: 'on',
			});

			expect(request.headers).toHaveProperty('Content-Type', 'application/json');
		});

		it('缺少 device_id 抛出 TypeError', () => {
			expect(() =>
				buildRequestForCommand(
					'https://api.example.com',
					{ action: 'on' } as any // 故意省略必填字段测试运行时校验
				)
			).toThrow(TypeError);

			expect(() =>
				buildRequestForCommand(
					'https://api.example.com',
					{ action: 'on' } as any // 故意省略必填字段测试运行时校验
				)
			).toThrow('device_id must be a non-empty string');
		});

		it('device_id 为空字符串抛出 TypeError', () => {
			expect(() =>
				buildRequestForCommand('https://api.example.com', {
					device_id: '',
					action: 'on',
				})
			).toThrow(TypeError);
		});

		it('device_id 为纯空白抛出 TypeError', () => {
			expect(() =>
				buildRequestForCommand('https://api.example.com', {
					device_id: '   ',
					action: 'on',
				})
			).toThrow(TypeError);
		});

		it('未知 action 抛出 RangeError', () => {
			expect(() =>
				buildRequestForCommand('https://api.example.com', {
					device_id: 'light-1',
					// @ts-expect-error - 故意传入非法值测试运行时校验
					action: 'toggle',
				})
			).toThrow(RangeError);

			expect(() =>
				buildRequestForCommand('https://api.example.com', {
					device_id: 'light-1',
					// @ts-expect-error - 故意传入非法值测试运行时校验
					action: 'invalid',
				})
			).toThrow(/must be one of: on, off/);
		});

		it('baseUrl 为空抛出 TypeError', () => {
			expect(() =>
				buildRequestForCommand('', {
					device_id: 'light-1',
					action: 'on',
				})
			).toThrow(TypeError);

			expect(() =>
				buildRequestForCommand('', {
					device_id: 'light-1',
					action: 'on',
				})
			).toThrow('baseUrl must be a non-empty string');
		});

		it('baseUrl 为纯空白抛出 TypeError', () => {
			expect(() =>
				buildRequestForCommand('   ', {
					device_id: 'light-1',
					action: 'on',
				})
			).toThrow(TypeError);
		});

		it('baseUrl 含尾随斜杠被正确处理', () => {
			const request = buildRequestForCommand('https://api.example.com/', {
				device_id: 'light-1',
				action: 'on',
			});

			expect(request.url).toBe('https://api.example.com/devices/light-1/on');
		});

		it('baseUrl 含多个尾随斜杠被正确处理', () => {
			const request = buildRequestForCommand('https://api.example.com///', {
				device_id: 'light-1',
				action: 'on',
			});

			expect(request.url).toBe('https://api.example.com/devices/light-1/on');
		});

		it('device_id 包含特殊字符会被正确编码', () => {
			const request = buildRequestForCommand('https://api.example.com', {
				device_id: 'light #1',
				action: 'on',
			});

			expect(request.url).toContain(encodeURIComponent('light #1'));
			expect(request.url).toBe('https://api.example.com/devices/light%20%231/on');
		});

		it('params 字段被合并到请求体', () => {
			const request = buildRequestForCommand('https://api.example.com', {
				device_id: 'light-1',
				action: 'on',
				params: {
					brightness: 80,
					color_temp: 4000,
				},
			});

			expect(request.body).toEqual({
				action: 'on',
				device_id: 'light-1',
				brightness: 80,
				color_temp: 4000,
			});
		});

		it('空 params 不影响请求体', () => {
			const request = buildRequestForCommand('https://api.example.com', {
				device_id: 'light-1',
				action: 'on',
				params: {},
			});

			expect(request.body).toEqual({
				action: 'on',
				device_id: 'light-1',
			});
		});

		it('params 为 undefined 不影响请求体', () => {
			const request = buildRequestForCommand('https://api.example.com', {
				device_id: 'light-1',
				action: 'on',
				params: undefined,
			});

			expect(request.body).toEqual({
				action: 'on',
				device_id: 'light-1',
			});
		});

		it('cmd 为 null 抛出 TypeError', () => {
			expect(() =>
				// @ts-expect-error - 故意传入 null 测试运行时校验
				buildRequestForCommand('https://api.example.com', null)
			).toThrow(TypeError);

			expect(() =>
				// @ts-expect-error - 故意传入 null 测试运行时校验
				buildRequestForCommand('https://api.example.com', null)
			).toThrow('cmd must be a non-null object');
		});

		it('cmd 不是对象抛出 TypeError', () => {
			expect(() =>
				// @ts-expect-error - 故意传入非法类型测试运行时校验
				buildRequestForCommand('https://api.example.com', 'not-an-object')
			).toThrow(TypeError);
		});

		it('HTTP URL 正常工作', () => {
			const request = buildRequestForCommand('http://localhost:8080', {
				device_id: 'light-1',
				action: 'on',
			});

			expect(request.url).toBe('http://localhost:8080/devices/light-1/on');
		});

		it('复杂 params 对象被正确合并', () => {
			const request = buildRequestForCommand('https://api.example.com', {
				device_id: 'light-1',
				action: 'on',
				params: {
					brightness: 100,
					color: { r: 255, g: 0, b: 0 },
					schedule: ['08:00', '20:00'],
				},
			});

			expect(request.body).toEqual({
				action: 'on',
				device_id: 'light-1',
				brightness: 100,
				color: { r: 255, g: 0, b: 0 },
				schedule: ['08:00', '20:00'],
			});
		});
	});
});
