/**
 * 配置管理模块
 * 加载与校验 YAML 配置文件，提供只读配置对象
 */

import { readFile } from 'fs/promises';

import { parse as parseYaml } from 'yaml';

/**
 * 获取值的实际类型描述
 */
function getActualType(value: unknown): string {
	if (value === null) {
		return 'null';
	}
	if (Array.isArray(value)) {
		return 'array';
	}
	return typeof value;
}

/**
 * 验证文件路径
 */
function validateFilePath(filePath: string): void {
	if (typeof filePath !== 'string' || filePath.trim().length === 0) {
		throw new TypeError('filePath must be a non-empty string');
	}
}

/**
 * 读取配置文件内容
 */
async function readConfigFileContent(filePath: string): Promise<string> {
	try {
		return await readFile(filePath, 'utf-8');
	} catch (err: unknown) {
		const causeError = err instanceof Error ? err : new Error(String(err));
		const { message: errorMessage } = causeError;
		throw new Error(`Failed to read config file at "${filePath}": ${errorMessage}`, { cause: err });
	}
}

/**
 * 解析YAML内容
 */
function parseYamlContent(content: string, filePath: string): unknown {
	try {
		return parseYaml(content);
	} catch (err: unknown) {
		const causeError = err instanceof Error ? err : new Error(String(err));
		const { message: errorMessage } = causeError;
		throw new SyntaxError(`Failed to parse YAML in config file "${filePath}": ${errorMessage}`, {
			cause: err,
		});
	}
}

/**
 * 验证配置对象并返回类型守卫
 */
function validateConfigObject(
	parsed: unknown,
	filePath: string
): asserts parsed is Record<string, unknown> {
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		const actualType = getActualType(parsed);
		throw new TypeError(`Config file "${filePath}" root must be an object, got: ${actualType}`);
	}
}

/**
 * 从文件加载配置
 * @param filePath - 配置文件路径（YAML 格式）
 * @returns 配置对象（根节点必须为对象）
 * @throws {Error} 文件不存在或不可读时抛出 I/O 错误
 * @throws {SyntaxError} YAML 语法错误时抛出
 * @throws {TypeError} 根节点非对象时抛出
 */
export async function loadConfigFromFile(filePath: string): Promise<Record<string, unknown>> {
	validateFilePath(filePath);
	const content = await readConfigFileContent(filePath);
	const parsed = parseYamlContent(content, filePath);
	validateConfigObject(parsed, filePath);

	// validateConfigObject 使用断言保证类型安全
	return parsed;
}
