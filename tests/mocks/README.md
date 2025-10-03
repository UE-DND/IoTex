# Mock Adapter 使用指南

可重用的 Mock 适配器，用于简化测试代码，提供灵活的配置选项支持各种测试场景。

## 快速开始

### 基础用法

```typescript
import { createMockAdapter } from './mocks/mock-adapter.js';

const adapter = createMockAdapter({ name: 'test-adapter' });

await adapter.initialize({});
await adapter.start();
await adapter.executeCommand('lamp-1', { action: 'on' });
await adapter.stop();
```

## 核心功能

### 1. 预设设备状态

```typescript
const initialStates = new Map([
	['lamp-1', { power: 'on', brightness: 150 }],
	['sensor-1', { temperature: 25, humidity: 60 }],
]);

const adapter = createMockAdapter({ deviceStates: initialStates });

const state = await adapter.getDeviceState('lamp-1');
// { power: 'on', brightness: 150 }
```

### 2. 监听命令执行

```typescript
const commands: any[] = [];

const adapter = createMockAdapter({
	onCommand: (deviceId, command) => {
		commands.push({ deviceId, command });
	},
});

await adapter.executeCommand('lamp-1', { action: 'on' });

// commands: [{ deviceId: 'lamp-1', command: { action: 'on' } }]
```

### 3. 状态变更事件

```typescript
const adapter = createMockAdapter();

adapter.onDeviceStateChange((deviceId, state) => {
	console.log(`${deviceId} state changed:`, state);
});

await adapter.executeCommand('lamp-1', { power: 'on' });
// 自动触发状态变更事件
```

### 4. 生命周期回调

```typescript
const adapter = createMockAdapter({
	onInitialize: async (config) => {
		console.log('Initialized with:', config);
	},
	onStart: async () => {
		console.log('Started');
	},
	onStop: async () => {
		console.log('Stopped');
	},
});
```

### 5. 错误模拟

```typescript
// 方式 1: 使用便捷函数
const adapter = createFailingMockAdapter('Connection failed');

await expect(adapter.start()).rejects.toThrow('Connection failed');

// 方式 2: 自定义配置
const adapter = createMockAdapter({
	shouldThrow: true,
	errorMessage: 'Device offline',
});
```

### 6. 延迟模拟

```typescript
// 方式 1: 使用便捷函数（默认 100ms）
const adapter = createSlowMockAdapter(50);

// 方式 2: 自定义配置
const adapter = createMockAdapter({
	commandDelay: 30,
});

await adapter.executeCommand('lamp-1', { action: 'on' });
// 会延迟 30ms
```

## 测试辅助方法

Mock Adapter 提供了额外的测试辅助方法：

### 命令历史

```typescript
const adapter = createMockAdapter();

await adapter.executeCommand('lamp-1', { action: 'on' });
await adapter.executeCommand('lamp-2', { action: 'off' });

// 获取命令历史
const history = adapter.getCommandHistory();
// [
//   { deviceId: 'lamp-1', command: { action: 'on' } },
//   { deviceId: 'lamp-2', command: { action: 'off' } }
// ]

// 清空历史
adapter.clearCommandHistory();
```

### 状态管理

```typescript
const adapter = createMockAdapter();

// 动态设置设备状态
adapter.setDeviceState('sensor-1', { temperature: 30 });

// 手动触发状态变更事件
adapter.emitStateChange('sensor-1', { temperature: 30 });

// 获取监听器数量
const count = adapter.getListenerCount();
```

## 配置选项

```typescript
interface MockAdapterOptions {
  name?: string;                    // 适配器名称，默认 'mock-adapter'
  deviceStates?: Map<...>;          // 初始设备状态
  onCommand?: (deviceId, cmd) => void;  // 命令执行回调
  onInitialize?: (config) => void;  // 初始化回调
  onStart?: () => void;             // 启动回调
  onStop?: () => void;              // 停止回调
  shouldThrow?: boolean;            // 是否抛出错误，默认 false
  errorMessage?: string;            // 错误消息
  commandDelay?: number;            // 命令延迟（毫秒），默认 0
  autoEmitStateChange?: boolean;    // 自动触发状态变更，默认 true
}
```

## 实际使用示例

### 替换现有的内联 Mock

**之前**:

```typescript
const mockAdapter: ProtocolAdapter = {
	name: 'test-adapter',
	async initialize() {},
	async start() {},
	async stop() {},
	async getDeviceState() {
		return {};
	},
	async executeCommand() {},
	onDeviceStateChange() {},
};
```

**现在**:

```typescript
const mockAdapter = createMockAdapter({ name: 'test-adapter' });
```

### 集成测试示例

```typescript
describe('设备控制流程', () => {
	it('完整的设备操作', async () => {
		const initialStates = new Map([
			['lamp-1', { power: 'off', brightness: 0 }],
		]);

		const commands: any[] = [];
		const stateChanges: any[] = [];

		const adapter = createMockAdapter({
			name: 'test-lamp',
			deviceStates: initialStates,
			onCommand: (deviceId, cmd) => commands.push({ deviceId, cmd }),
		});

		adapter.onDeviceStateChange((deviceId, state) => {
			stateChanges.push({ deviceId, state });
		});

		await adapter.initialize({});
		await adapter.start();

		// 执行命令
		await adapter.executeCommand('lamp-1', { power: 'on' });
		await adapter.executeCommand('lamp-1', { brightness: 200 });

		// 验证
		expect(commands).toHaveLength(2);
		expect(stateChanges).toHaveLength(2);

		const finalState = await adapter.getDeviceState('lamp-1');
		expect(finalState.power).toBe('on');
		expect(finalState.brightness).toBe(200);

		await adapter.stop();
	});
});
```

## 便捷工厂函数

### createFailingMockAdapter

创建一个总是抛出错误的适配器：

```typescript
const adapter = createFailingMockAdapter('Device not responding');
```

### createSlowMockAdapter

创建一个带延迟的适配器（模拟慢速设备）：

```typescript
const adapter = createSlowMockAdapter(100); // 100ms 延迟
```
