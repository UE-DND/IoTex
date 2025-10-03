/**
 * 命令队列模块
 * 提供设备命令的内存队列（FIFO），可配置最大长度
 */

const DEFAULT_MAX_QUEUE_SIZE = 1000;

/**
 * 命令队列接口
 */
export interface CommandQueue<T = unknown> {
	/**
	 * 入队命令
	 * @param cmd - 命令对象
	 * @returns 入队后的队列长度
	 * @throws {RangeError} 队列已满时抛出
	 */
	enqueue: (cmd: T) => number;

	/**
	 * 出队命令
	 * @returns 最早的命令，队列为空时返回 undefined
	 */
	dequeue: () => T | undefined;

	/**
	 * 获取当前队列长度
	 * @returns 队列中的命令数量
	 */
	size: () => number;
}

/**
 * 创建命令队列
 * @param maxSize - 队列最大长度，默认 1000
 * @returns 命令队列实例
 * @throws {RangeError} maxSize <= 0 时抛出
 */
export function createCommandQueue<T = unknown>(maxSize = DEFAULT_MAX_QUEUE_SIZE): CommandQueue<T> {
	if (!Number.isInteger(maxSize) || maxSize <= 0) {
		throw new RangeError(`maxSize must be a positive integer, got: ${maxSize}`);
	}

	const queue: T[] = [];

	return {
		enqueue(cmd: T): number {
			if (queue.length >= maxSize) {
				throw new RangeError(`Command queue is full (max: ${maxSize}), cannot enqueue`);
			}
			queue.push(cmd);
			return queue.length;
		},

		dequeue(): T | undefined {
			return queue.shift();
		},

		size(): number {
			return queue.length;
		},
	};
}
