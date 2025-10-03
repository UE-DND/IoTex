# GitHub Actions 工作流说明

本项目使用 GitHub Actions 进行持续集成和持续部署（CI/CD）。

## 工作流列表

### 🔄 CI - 持续集成 (`ci.yml`)

**触发条件**：

- 推送到 `main` 或 `dev` 分支
- 针对 `main` 或 `dev` 分支的 Pull Request

**包含任务**：

1. **代码检查 (lint)**
   - 运行 ESLint 检查代码规范
   - 检查代码格式（Prettier）

2. **类型检查 (typecheck)**
   - TypeScript 类型检查
   - 确保类型安全

3. **测试 (test)**
   - 在多个操作系统上运行测试：
     - Ubuntu (Linux)
     - Windows
     - macOS
   - 生成测试覆盖率报告（仅 Ubuntu）

4. **构建 (build)**
   - 编译 TypeScript 代码
   - 验证构建产物
   - 上传构建产物为 artifact

5. **文档生成 (docs)**
   - 生成 TypeDoc API 文档
   - 使用官方 GitHub Actions 部署到 GitHub Pages（仅 main 分支）

6. **安全检查 (security)**
   - 检查依赖漏洞
   - 检查过期依赖

### 🚀 Release - 发布 (`release.yml`)

**触发条件**：

- 推送版本标签（格式：`v*.*.*`）

**包含任务**：

1. **发布到 npm**
   - 运行测试
   - 构建项目
   - 发布到 npm registry

2. **创建 GitHub Release**
   - 从 CHANGELOG 提取版本信息
   - 创建 GitHub Release
   - 附加构建产物

**使用方法**：

```bash
# 1. 使用 changesets 创建版本
npm run changeset

# 2. 更新版本号
npm run version

# 3. 创建并推送标签
git tag v1.0.0
git push origin v1.0.0
```

### 🔒 CodeQL - 代码安全分析 (`codeql.yml`)

**触发条件**：

- 推送到 `main` 或 `dev` 分支
- Pull Request
- 每周一定时运行

**功能**：

- 自动检测安全漏洞
- 代码质量分析
- 安全最佳实践检查

## 依赖管理

### 📦 Dependabot (`dependabot.yml`)

**功能**：

- 每周一自动检查依赖更新
- 自动创建 PR 更新依赖
- 包括 npm 依赖和 GitHub Actions

**配置**：

- npm 依赖：每周检查，最多 10 个 PR
- GitHub Actions：每周检查，最多 5 个 PR

## 所需 Secrets

为了正常运行所有工作流，需要在仓库设置中配置以下 secrets：

### 必需 Secrets

| Secret 名称 | 用途       | 获取方式                                                     |
| ----------- | ---------- | ------------------------------------------------------------ |
| `NPM_TOKEN` | 发布到 npm | [npm Access Tokens](https://www.npmjs.com/settings/~/tokens) |

## GitHub Pages 设置

如果要启用自动文档部署，需要：

1. 进入仓库 Settings → Pages
2. Source 选择 **"GitHub Actions"**
3. 工作流会自动创建 `github-pages` 环境并部署文档

## 本地测试 CI

在提交之前，可以本地运行这些检查：

```bash
# 代码检查
npm run lint

# 类型检查
npm run type-check

# 格式检查
npm run format:check

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 构建
npm run build

# 生成文档
npm run docs
```

## 工作流徽章

可以在 README.md 中使用以下徽章：

```markdown
[![CI](https://github.com/UE-DND/iotex/actions/workflows/ci.yml/badge.svg)](https://github.com/UE-DND/iotex/actions/workflows/ci.yml)
[![Release](https://github.com/UE-DND/iotex/actions/workflows/release.yml/badge.svg)](https://github.com/UE-DND/iotex/actions/workflows/release.yml)
[![CodeQL](https://github.com/UE-DND/iotex/actions/workflows/codeql.yml/badge.svg)](https://github.com/UE-DND/iotex/actions/workflows/codeql.yml)
```

## 故障排查

### CI 失败

1. **ESLint 错误**：运行 `npm run lint:fix` 自动修复
2. **类型错误**：运行 `npm run type-check` 查看详细错误
3. **测试失败**：运行 `npm test` 本地调试
4. **构建失败**：检查 TypeScript 配置和代码

### 发布失败

1. 确保 `NPM_TOKEN` 已正确配置
2. 检查 package.json 中的版本号
3. 确保标签格式正确（v1.0.0）

## 更多信息

- [GitHub Actions 文档](https://docs.github.com/actions)
- [npm 发布指南](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [Changesets 使用指南](https://github.com/changesets/changesets)
