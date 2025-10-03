# IoTex MCP Server 文档

本目录包含 IoTex MCP Server 的技术文档。

## 文档结构

### API 参考文档

API 文档通过 TypeDoc 自动生成，包含所有公开接口、类型定义和函数签名。

**生成 API 文档：**

```bash
npm run docs
```

**实时预览：**

```bash
npm run docs:serve
```

生成的文档位于 `docs/api/` 目录，通过浏览器打开 `docs/api/index.html` 查看。

## 协议规范文档

- [MCP 协议规范](./specification/MCP/index.mdx) - Model Context
  Protocol 官方协议文档
- [MCP 架构设计](./specification/MCP/architecture/) - MCP 协议架构说明
- [MCP 基础概念](./specification/MCP/basic/) - MCP 协议基础概念和使用方法
- [MCP 客户端开发](./specification/MCP/client/) - MCP 客户端开发指南
- [MCP 服务端开发](./specification/MCP/server/) - MCP 服务端开发指南
- [MCP 协议变更日志](./specification/MCP/changelog.mdx) - MCP 协议版本更新记录
- [MCP 协议模式定义](./specification/MCP/schema.mdx) - MCP 协议完整模式定义
