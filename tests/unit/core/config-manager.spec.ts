/**
 * 单元测试：core/config-manager.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync } from 'node:fs';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfigFromFile } from '../../../src/core/config-manager.js';

describe('core/config-manager', () => {
	const testDir = join(process.cwd(), 'test-tmp-config');

	beforeEach(async () => {
		// 清理测试目录
		if (existsSync(testDir)) {
			await rm(testDir, { recursive: true, force: true });
		}
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		// 清理测试目录
		if (existsSync(testDir)) {
			await rm(testDir, { recursive: true, force: true });
		}
	});

	describe('loadConfigFromFile', () => {
		// 用例1：空 filePath 应抛出 TypeError
		it('空 filePath 应抛出 TypeError', async () => {
			await expect(loadConfigFromFile('')).rejects.toThrow(TypeError);
			await expect(loadConfigFromFile('')).rejects.toThrow(/non-empty string/);
		});

		// 用例2：空白 filePath 应抛出 TypeError
		it('空白 filePath 应抛出 TypeError', async () => {
			await expect(loadConfigFromFile('   ')).rejects.toThrow(TypeError);
		});

		// 用例3：非字符串 filePath 应抛出 TypeError
		it('非字符串 filePath 应抛出 TypeError', async () => {
			await expect(loadConfigFromFile(123 as any)).rejects.toThrow(TypeError);
		});

		// 用例4：文件不存在应抛出 Error
		it('文件不存在应抛出 Error', async () => {
			const filePath = join(testDir, 'nonexistent.yaml');
			await expect(loadConfigFromFile(filePath)).rejects.toThrow(Error);
			await expect(loadConfigFromFile(filePath)).rejects.toThrow(/Failed to read/);
		});

		// 用例5：加载有效的 YAML 文件
		it('加载有效的 YAML 文件', async () => {
			const filePath = join(testDir, 'config.yaml');
			const yaml = 'key: value\nnumber: 123\nflag: true';
			await writeFile(filePath, yaml, 'utf-8');

			const config = await loadConfigFromFile(filePath);
			expect(config).toEqual({
				key: 'value',
				number: 123,
				flag: true,
			});
		});

		// 用例6：加载嵌套对象
		it('加载嵌套对象', async () => {
			const filePath = join(testDir, 'nested.yaml');
			const yaml = `
parent:
  child:
    grandchild: value
  sibling: 42
`;
			await writeFile(filePath, yaml, 'utf-8');

			const config = await loadConfigFromFile(filePath);
			expect(config).toEqual({
				parent: {
					child: {
						grandchild: 'value',
					},
					sibling: 42,
				},
			});
		});

		// 用例7：加载数组值
		it('加载数组值', async () => {
			const filePath = join(testDir, 'arrays.yaml');
			const yaml = `
items:
  - one
  - two
  - three
numbers:
  - 1
  - 2
  - 3
`;
			await writeFile(filePath, yaml, 'utf-8');

			const config = await loadConfigFromFile(filePath);
			expect(config).toEqual({
				items: ['one', 'two', 'three'],
				numbers: [1, 2, 3],
			});
		});

		// 用例8：无效的 YAML 应抛出 SyntaxError
		it('无效的 YAML 应抛出 SyntaxError', async () => {
			const filePath = join(testDir, 'invalid.yaml');
			const yaml = 'key: value\n  invalid: indent\n[broken';
			await writeFile(filePath, yaml, 'utf-8');

			await expect(loadConfigFromFile(filePath)).rejects.toThrow(SyntaxError);
			await expect(loadConfigFromFile(filePath)).rejects.toThrow(/Failed to parse YAML/);
		});

		// 用例9：根节点为数组应抛出 TypeError
		it('根节点为数组应抛出 TypeError', async () => {
			const filePath = join(testDir, 'array-root.yaml');
			const yaml = '- item1\n- item2';
			await writeFile(filePath, yaml, 'utf-8');

			await expect(loadConfigFromFile(filePath)).rejects.toThrow(TypeError);
			await expect(loadConfigFromFile(filePath)).rejects.toThrow(/root must be an object/);
		});

		// 用例10：根节点为字符串应抛出 TypeError
		it('根节点为字符串应抛出 TypeError', async () => {
			const filePath = join(testDir, 'string-root.yaml');
			const yaml = 'just a string';
			await writeFile(filePath, yaml, 'utf-8');

			await expect(loadConfigFromFile(filePath)).rejects.toThrow(TypeError);
		});

		// 用例11：根节点为 null 应抛出 TypeError
		it('根节点为 null 应抛出 TypeError', async () => {
			const filePath = join(testDir, 'null-root.yaml');
			const yaml = 'null';
			await writeFile(filePath, yaml, 'utf-8');

			await expect(loadConfigFromFile(filePath)).rejects.toThrow(TypeError);
			await expect(loadConfigFromFile(filePath)).rejects.toThrow(/null/);
		});

		// 用例12：空文件应抛出 TypeError
		it('空文件应抛出 TypeError', async () => {
			const filePath = join(testDir, 'empty.yaml');
			await writeFile(filePath, '', 'utf-8');

			// 空 YAML 文件会被解析为 null，应该抛出错误
			await expect(loadConfigFromFile(filePath)).rejects.toThrow(TypeError);
			await expect(loadConfigFromFile(filePath)).rejects.toThrow(/root must be an object/);
		});

		// 用例13：加载复杂配置
		it('加载复杂配置', async () => {
			const filePath = join(testDir, 'complex.yaml');
			const yaml = `
server:
  host: localhost
  port: 3000
  ssl:
    enabled: true
    cert: /path/to/cert

adapters:
  mqtt:
    broker: mqtt://localhost:1883
    clientId: test-client
  http:
    timeout: 5000

devices:
  - id: device1
    type: sensor
    config:
      interval: 60
  - id: device2
    type: actuator
    config:
      mode: auto
`;
			await writeFile(filePath, yaml, 'utf-8');

			const config = await loadConfigFromFile(filePath);
			expect(config).toHaveProperty('server');
			expect(config).toHaveProperty('adapters');
			expect(config).toHaveProperty('devices');
			expect((config as any).server.port).toBe(3000);
			expect((config as any).devices).toHaveLength(2);
		});

		// 用例14：处理特殊字符
		it('处理特殊字符', async () => {
			const filePath = join(testDir, 'special.yaml');
			const yaml = `
message: "Hello, World!"
path: "/path/to/file"
quoted: 'single quotes'
multiline: |
  This is a
  multiline string
`;
			await writeFile(filePath, yaml, 'utf-8');

			const config = await loadConfigFromFile(filePath);
			expect((config as any).message).toBe('Hello, World!');
			expect((config as any).path).toBe('/path/to/file');
			expect((config as any).multiline).toContain('multiline');
		});
	});
});
