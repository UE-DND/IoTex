/**
 * Jest 测试环境设置
 * 在所有测试运行前执行
 */

// 设置测试环境的日志级别为 error，只显示错误信息
process.env.LOG_LEVEL = 'error';

// 静默 console.log 输出（保留 console.error）
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
	// 只在非 CI 环境且明确需要时才输出
	if (process.env.DEBUG_TESTS === 'true') {
		originalConsoleLog(...args);
	}
};
