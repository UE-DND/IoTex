/**
 * 安全管理模块
 * 实现设备权限控制和操作审计
 */

import { createLogger, type Logger } from './logger.js';

/**
 * 安全级别
 */
export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 设备安全配置
 */
export interface DeviceSecurityConfig {
	/** 设备 ID */
	deviceId: string;
	/** 安全级别 */
	securityLevel: SecurityLevel;
	/** 是否需要确认 */
	requiresConfirmation: boolean;
	/** 允许的操作列表 */
	allowedOperations?: string[];
	/** 禁止的操作列表 */
	deniedOperations?: string[];
	/** 速率限制配置 */
	rateLimiting?: {
		maxRequestsPerMinute: number;
	};
}

/**
 * 操作审计日志条目
 */
export interface AuditLogEntry {
	timestamp: string;
	deviceId: string;
	operation: string;
	user?: string;
	clientId?: string;
	success: boolean;
	reason?: string;
	metadata?: Record<string, unknown>;
}

const DEFAULT_MAX_AUDIT_LOG_SIZE = 1000;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 分钟

/**
 * 按设备ID过滤审计日志
 */
function filterByDeviceId(entries: AuditLogEntry[], deviceId?: string): AuditLogEntry[] {
	if (typeof deviceId === 'string' && deviceId.length > 0) {
		return entries.filter((entry) => entry.deviceId === deviceId);
	}
	return entries;
}

/**
 * 按时间范围过滤审计日志
 */
function filterByTimeRange(
	entries: AuditLogEntry[],
	startTime?: string,
	endTime?: string
): AuditLogEntry[] {
	let filtered = entries;

	if (typeof startTime === 'string' && startTime.length > 0) {
		filtered = filtered.filter((entry) => entry.timestamp >= startTime);
	}

	if (typeof endTime === 'string' && endTime.length > 0) {
		filtered = filtered.filter((entry) => entry.timestamp <= endTime);
	}

	return filtered;
}

/**
 * 限制结果数量
 */
function limitResults(entries: AuditLogEntry[], limit?: number): AuditLogEntry[] {
	if (typeof limit === 'number' && limit > 0) {
		return entries.slice(-limit);
	}
	return entries;
}

/**
 * 速率限制追踪
 */
interface RateLimitTracker {
	count: number;
	resetTime: number;
}

/**
 * 安全管理器
 */
export class SecurityManager {
	private readonly configs = new Map<string, DeviceSecurityConfig>();
	private auditLog: AuditLogEntry[] = [];
	private readonly rateLimitTrackers = new Map<string, RateLimitTracker>();
	private readonly logger: Logger;
	private readonly maxAuditLogSize: number;

	public constructor(maxAuditLogSize = DEFAULT_MAX_AUDIT_LOG_SIZE) {
		this.logger = createLogger('security', 'info');
		this.maxAuditLogSize = maxAuditLogSize;
	}

	/**
	 * 配置设备安全策略
	 */
	public configureDevice(config: DeviceSecurityConfig): void {
		this.configs.set(config.deviceId, config);
		this.logger.info('Device security configured', {
			deviceId: config.deviceId,
			securityLevel: config.securityLevel,
		});
	}

	/**
	 * 批量配置设备安全策略
	 */
	public configureDevices(configs: DeviceSecurityConfig[]): void {
		for (const config of configs) {
			this.configureDevice(config);
		}
	}

	/**
	 * 检查操作是否被允许
	 */
	public checkPermission(
		deviceId: string,
		operation: string
	): { allowed: boolean; reason?: string } {
		const config = this.configs.get(deviceId);

		// 如果没有配置，使用默认策略（允许）
		if (!config) {
			return { allowed: true };
		}

		// 检查是否在禁止列表中
		if (config.deniedOperations?.includes(operation) === true) {
			return {
				allowed: false,
				reason: `Operation '${operation}' is explicitly denied`,
			};
		}

		// 检查是否在允许列表中
		if (config.allowedOperations && config.allowedOperations.length > 0) {
			if (!config.allowedOperations.includes(operation)) {
				return {
					allowed: false,
					reason: `Operation '${operation}' is not in the allowed list`,
				};
			}
		}

		// 检查速率限制
		if (config.rateLimiting) {
			const rateLimitCheck = this.checkRateLimit(
				deviceId,
				config.rateLimiting.maxRequestsPerMinute
			);
			if (!rateLimitCheck.allowed) {
				return rateLimitCheck;
			}
		}

		return { allowed: true };
	}

	/**
	 * 检查操作是否需要用户确认
	 */
	public requiresConfirmation(deviceId: string): boolean {
		const config = this.configs.get(deviceId);
		if (!config) {
			return false; // 默认不需要确认
		}

		// 根据安全级别和配置决定
		if (config.requiresConfirmation) {
			return true;
		}

		// 高安全级别的设备默认需要确认
		if (config.securityLevel === 'high' || config.securityLevel === 'critical') {
			return true;
		}

		return false;
	}

	/**
	 * 记录操作审计日志
	 */
	public logOperation(
		deviceId: string,
		operation: string,
		options: {
			success: boolean;
			metadata?: Record<string, unknown>;
		}
	): void {
		const { success, metadata } = options;
		const user = typeof metadata?.user === 'string' ? metadata.user : undefined;
		const clientId = typeof metadata?.clientId === 'string' ? metadata.clientId : undefined;
		const reason = typeof metadata?.reason === 'string' ? metadata.reason : undefined;

		// 提取额外的元数据（排除已处理的字段）
		const extra: Record<string, unknown> | undefined = metadata
			? Object.fromEntries(
					Object.entries(metadata).filter(([key]) => !['user', 'clientId', 'reason'].includes(key))
				)
			: undefined;

		const entry: AuditLogEntry = {
			timestamp: new Date().toISOString(),
			deviceId,
			operation,
			success,
			user,
			clientId,
			reason,
			metadata: extra,
		};

		this.auditLog.push(entry);

		// 限制审计日志大小
		if (this.auditLog.length > this.maxAuditLogSize) {
			this.auditLog.shift(); // 移除最旧的条目
		}

		// 记录到日志系统
		if (success) {
			this.logger.info('Operation executed', {
				deviceId,
				operation,
				user,
			});
		} else {
			this.logger.warn('Operation failed or denied', {
				deviceId,
				operation,
				reason,
				user,
			});
		}
	}

	/**
	 * 获取设备安全配置
	 */
	public getDeviceConfig(deviceId: string): DeviceSecurityConfig | undefined {
		return this.configs.get(deviceId);
	}

	/**
	 * 获取所有安全配置
	 */
	public getAllConfigs(): DeviceSecurityConfig[] {
		return Array.from(this.configs.values());
	}

	/**
	 * 获取审计日志
	 */
	public getAuditLog(options?: {
		deviceId?: string;
		startTime?: string;
		endTime?: string;
		limit?: number;
	}): AuditLogEntry[] {
		let filtered = this.auditLog;

		filtered = filterByDeviceId(filtered, options?.deviceId);
		filtered = filterByTimeRange(filtered, options?.startTime, options?.endTime);
		filtered = limitResults(filtered, options?.limit);

		return filtered;
	}

	/**
	 * 清除审计日志
	 */
	public clearAuditLog(): void {
		this.auditLog = [];
		this.logger.info('Audit log cleared');
	}

	/**
	 * 检查速率限制
	 */
	private checkRateLimit(
		deviceId: string,
		maxRequestsPerMinute: number
	): { allowed: boolean; reason?: string } {
		const now = Date.now();
		const tracker = this.rateLimitTrackers.get(deviceId);

		// 如果没有追踪器或已过期，创建新的
		if (!tracker || now >= tracker.resetTime) {
			this.rateLimitTrackers.set(deviceId, {
				count: 1,
				resetTime: now + RATE_LIMIT_WINDOW_MS,
			});
			return { allowed: true };
		}

		// 检查是否超过速率限制
		if (tracker.count >= maxRequestsPerMinute) {
			return {
				allowed: false,
				reason: `Rate limit exceeded: ${maxRequestsPerMinute} requests per minute`,
			};
		}

		// 增加计数
		tracker.count += 1;
		return { allowed: true };
	}
}

/**
 * 获取低安全级别设备配置
 */
function getLowSecurityConfig(deviceId: string): DeviceSecurityConfig {
	return {
		deviceId,
		securityLevel: 'low',
		requiresConfirmation: false,
		allowedOperations: ['read', 'status', 'control', 'on', 'off', 'toggle'],
		rateLimiting: { maxRequestsPerMinute: 60 },
	};
}

/**
 * 获取临界安全级别设备配置
 */
function getCriticalSecurityConfig(deviceId: string): DeviceSecurityConfig {
	return {
		deviceId,
		securityLevel: 'critical',
		requiresConfirmation: true,
		allowedOperations: ['read', 'status'],
		deniedOperations: ['unlock', 'disarm'],
		rateLimiting: { maxRequestsPerMinute: 10 },
	};
}

/**
 * 获取中等安全级别设备配置
 */
function getMediumSecurityConfig(deviceId: string): DeviceSecurityConfig {
	return {
		deviceId,
		securityLevel: 'medium',
		requiresConfirmation: false,
		allowedOperations: ['read', 'status', 'control', 'set_temperature'],
		rateLimiting: { maxRequestsPerMinute: 30 },
	};
}

/**
 * 获取传感器安全配置
 */
function getSensorSecurityConfig(deviceId: string): DeviceSecurityConfig {
	return {
		deviceId,
		securityLevel: 'low',
		requiresConfirmation: false,
		allowedOperations: ['read', 'status'],
		rateLimiting: { maxRequestsPerMinute: 120 },
	};
}

/**
 * 默认安全策略生成器
 */
export function generateDefaultSecurityConfig(
	deviceId: string,
	deviceType: string
): DeviceSecurityConfig {
	// 低安全级别设备
	if (['smart_light', 'smart_plug', 'switch'].includes(deviceType)) {
		return getLowSecurityConfig(deviceId);
	}

	// 临界安全级别设备
	if (['door_lock', 'security_camera', 'alarm'].includes(deviceType)) {
		return getCriticalSecurityConfig(deviceId);
	}

	// 中等安全级别设备
	if (['thermostat', 'air_conditioner', 'humidifier'].includes(deviceType)) {
		return getMediumSecurityConfig(deviceId);
	}

	// 传感器设备
	if (['sensor', 'motion_detector', 'temperature_sensor'].includes(deviceType)) {
		return getSensorSecurityConfig(deviceId);
	}

	// 默认中等安全策略
	return {
		deviceId,
		securityLevel: 'medium',
		requiresConfirmation: false,
		allowedOperations: ['read', 'status', 'control'],
		rateLimiting: { maxRequestsPerMinute: 30 },
	};
}

/**
 * 创建安全管理器实例
 */
export function createSecurityManager(maxAuditLogSize?: number): SecurityManager {
	return new SecurityManager(maxAuditLogSize);
}
