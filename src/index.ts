#!/usr/bin/env node

/**
 * IoTex 进程入口与环境配置解析
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { createLogger } from './infrastructure/logger.js';
import { startMcpServer } from './mcp-server.js';

interface PackageJson {
	name: string;
	version: string;
}

// 读取 package.json
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);
const pkgPath = join(currentDirPath, '..', 'package.json');
const pkgContent = readFileSync(pkgPath, 'utf-8');
const pkgData: unknown = JSON.parse(pkgContent);

// 验证并解析 package.json 结构
function parsePackageJson(data: unknown): PackageJson {
	if (
		typeof data !== 'object' ||
		data === null ||
		!('name' in data) ||
		!('version' in data) ||
		typeof data.name !== 'string' ||
		typeof data.version !== 'string'
	) {
		throw new Error('Invalid package.json structure');
	}
	return { name: data.name, version: data.version };
}

const pkg = parsePackageJson(pkgData);

/**
 * 运行时配置接口
 */
export interface RuntimeConfig {
	mqttUrl?: string;
	configPath?: string;
}

/**
 * 从环境变量中获取并验证字符串值
 */
function getEnvString(env: NodeJS.ProcessEnv, key: string, errorName: string): string | undefined {
	if (!(key in env)) {
		return undefined;
	}

	const value = env[key];
	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw new TypeError(`${errorName} is provided but empty`);
	}

	return trimmed;
}

/**
 * 获取配置文件路径（支持多个环境变量名）
 */
function getConfigPath(env: NodeJS.ProcessEnv): string | undefined {
	// IOTEX_CONFIG 优先级高于 CONFIG_PATH
	const iotexConfig = getEnvString(env, 'IOTEX_CONFIG', 'IOTEX_CONFIG');
	if (iotexConfig !== undefined) {
		return iotexConfig;
	}

	return getEnvString(env, 'CONFIG_PATH', 'CONFIG_PATH');
}

/**
 * 从环境变量解析运行时配置
 * @param env - 环境变量对象（如 process.env）
 * @returns 配置对象，空值不返回该键
 * @throws {TypeError} 显式提供但为空字符串的关键变量时抛出
 */
export function resolveRuntimeConfigFromEnv(env: NodeJS.ProcessEnv): RuntimeConfig {
	const config: RuntimeConfig = {};

	const mqttUrl = getEnvString(env, 'MQTT_URL', 'MQTT_URL');
	if (mqttUrl !== undefined) {
		config.mqttUrl = mqttUrl;
	}

	const configPath = getConfigPath(env);
	if (configPath !== undefined) {
		config.configPath = configPath;
	}

	return config;
}

/**
 * 主函数：启动 IoTex MCP 服务器
 */
async function main(): Promise<void> {
	const logger = createLogger('main', 'info');

	try {
		// 解析运行时配置
		const runtimeConfig = resolveRuntimeConfigFromEnv(process.env);

		logger.info('Starting IoTex MCP Server', {
			version: pkg.version,
			node: process.version,
			config: runtimeConfig,
		});

		// 启动 MCP 服务器
		await startMcpServer({
			name: pkg.name,
			version: pkg.version,
		});
	} catch (err) {
		logger.error('Failed to start IoTex MCP Server', {
			error: err instanceof Error ? err.message : String(err),
		});
		process.exit(1);
	}
}

// 仅在直接运行时启动服务器（不是被导入时）
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((err: unknown) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
}
