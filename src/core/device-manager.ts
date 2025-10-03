/**
 * 设备管理模块
 * 统一管理设备状态与命令分发
 */

import { buildDeviceResourceUri } from '../domain/device.js';

import type { StateStore } from '../storage/state-store.js';

/**
 * 设备元数据接口
 */
export interface DeviceMetadata {
	id: string;
	friendlyName: string;
	location: string;
	type: string;
	capabilities?: string[];
	protocol?: string;
}

/**
 * MCP 资源格式
 */
export interface McpResource {
	uri: string;
	name: string;
	title?: string;
	description?: string;
	mimeType: string;
	text?: string;
}

const JSON_INDENT_SPACES = 2;

/**
 * 获取patch的实际类型
 */
function getPatchType(patch: unknown): string {
	if (patch === null) {
		return 'null';
	}
	if (Array.isArray(patch)) {
		return 'array';
	}
	return typeof patch;
}

/**
 * 验证补丁对象
 */
function validatePatch(patch: unknown): asserts patch is Record<string, unknown> {
	if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
		const actualType = getPatchType(patch);
		throw new TypeError(`patch must be a plain object, got: ${actualType}`);
	}
}

/**
 * 设备管理器类
 */
export class DeviceManager {
	private readonly devices = new Map<string, DeviceMetadata>();

	public constructor(private readonly stateStore: StateStore) {}

	/**
	 * 注册设备
	 */
	public registerDevice(device: DeviceMetadata): void {
		if (!device.id || device.id.trim().length === 0) {
			throw new TypeError('Device id must be a non-empty string');
		}
		this.devices.set(device.id, device);
	}

	/**
	 * 获取所有设备列表
	 */
	public listDevices(): DeviceMetadata[] {
		return Array.from(this.devices.values());
	}

	/**
	 * 获取单个设备元数据
	 */
	public getDevice(deviceId: string): DeviceMetadata | undefined {
		return this.devices.get(deviceId);
	}

	/**
	 * 获取设备状态（从存储中）
	 */
	public async getDeviceState(deviceId: string): Promise<Record<string, unknown> | undefined> {
		return await this.stateStore.get<Record<string, unknown>>(deviceId);
	}

	/**
	 * 获取所有设备状态作为 MCP 资源
	 * @param filter - 可选的 URI 过滤字符串
	 */
	public async getDeviceStates(filter?: string): Promise<McpResource[]> {
		const devices = Array.from(this.devices.values());

		// 过滤设备（同步操作）
		const filteredDevices = devices
			.map((device) => {
				const uri = buildDeviceResourceUri({
					location: device.location,
					friendlyName: device.friendlyName,
				});

				// 应用过滤器
				if (typeof filter === 'string' && filter.length > 0 && !uri.includes(filter)) {
					return null;
				}

				return { device, uri };
			})
			.filter((item): item is { device: DeviceMetadata; uri: string } => item !== null);

		// 获取所有设备状态（并行）
		const resourcePromises = filteredDevices.map(async ({ device, uri }) => {
			const state = await this.getDeviceState(device.id);
			return {
				uri,
				name: device.friendlyName,
				title: `${device.location} - ${device.friendlyName}`,
				description: `Current state of ${device.type} device`,
				mimeType: 'application/json',
				text: state ? JSON.stringify(state, null, JSON_INDENT_SPACES) : '{}',
			};
		});

		return await Promise.all(resourcePromises);
	}

	/**
	 * 通过 URI 读取设备资源
	 */
	public async readDeviceResource(uri: string): Promise<McpResource | undefined> {
		const devices = Array.from(this.devices.values());

		// 查找匹配的设备
		const matchedDevice = devices.find((device) => {
			const deviceUri = buildDeviceResourceUri({
				location: device.location,
				friendlyName: device.friendlyName,
			});
			return deviceUri === uri;
		});

		if (!matchedDevice) {
			return undefined;
		}

		// 获取设备状态
		const state = await this.getDeviceState(matchedDevice.id);
		return {
			uri,
			name: matchedDevice.friendlyName,
			title: `${matchedDevice.location} - ${matchedDevice.friendlyName}`,
			description: `Current state of ${matchedDevice.type} device`,
			mimeType: 'application/json',
			text: state ? JSON.stringify(state, null, JSON_INDENT_SPACES) : '{}',
		};
	}

	/**
	 * 应用设备状态补丁
	 */
	public async applyStatePatch(
		deviceId: string,
		patch: Record<string, unknown>
	): Promise<Record<string, unknown>> {
		if (typeof deviceId !== 'string' || deviceId.trim().length === 0) {
			throw new TypeError('deviceId must be a non-empty string');
		}

		validatePatch(patch);

		try {
			const updatedState = await this.stateStore.patch<Record<string, unknown>>(deviceId, patch);

			return updatedState;
		} catch (err: unknown) {
			const causeError = err instanceof Error ? err : new Error(String(err));
			const { message: errorMessage } = causeError;
			throw new Error(`Failed to apply state patch for device "${deviceId}": ${errorMessage}`, {
				cause: err,
			});
		}
	}
}

/**
 * 应用设备状态补丁（已弃用，请使用 DeviceManager.applyStatePatch）
 * @deprecated 使用 DeviceManager.applyStatePatch 代替
 * @param deviceId - 设备ID（非空）
 * @param patch - 状态补丁对象
 * @param store - 状态存储实例
 * @returns 更新后的完整设备状态（不可变）
 * @throws {TypeError} deviceId 为空或 patch 非对象时抛出
 */
export async function applyDeviceStatePatch(
	deviceId: string,
	patch: Record<string, unknown>,
	store: StateStore
): Promise<Record<string, unknown>> {
	if (typeof deviceId !== 'string' || deviceId.trim().length === 0) {
		throw new TypeError('deviceId must be a non-empty string');
	}

	validatePatch(patch);

	// 验证 store 参数
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- 运行时验证必需
	if (store === null || store === undefined || typeof store !== 'object') {
		throw new TypeError('store must be a valid StateStore instance');
	}

	// 验证 patch 方法存在
	if (typeof store.patch !== 'function') {
		throw new TypeError('store must have a patch method');
	}

	try {
		const updatedState = await store.patch<Record<string, unknown>>(deviceId, patch);

		return updatedState;
	} catch (err: unknown) {
		const causeError = err instanceof Error ? err : new Error(String(err));
		const { message: errorMessage } = causeError;
		throw new Error(`Failed to apply state patch for device "${deviceId}": ${errorMessage}`, {
			cause: err,
		});
	}
}
