<p align="center">
  <img src="assets/logo.png" alt="place-fill" width="160">
</p>

<h1 align="center">place-fill</h1>

<p align="center">面向表单联调、回归测试和演示录制的 Chrome MV3 测试数据填充插件</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-v0.7.4-4a6fa5?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="chrome mv3">
</p>

## 功能

- 生成常用中文测试数据：统一社会信用代码、公司名称、姓名、身份证号、银行卡号、账号、手机号、邮箱、固定电话、地址。
- 右侧悬浮面板支持单项复制、整组复制、重新生成和页面自动填充。
- 智能识别输入框类型，并在输入框旁显示快速填充按钮。
- 支持右键手动标注字段类型；标注按域名和一级路径复用。
- 支持按站点开启/关闭智能识别、控制字段显示、管理常用数据和生成记录。
- 支持人工标注导入、导出、脱敏导出，以及全部数据备份/恢复。

## 安装

1. 在 [GitHub Releases](https://github.com/coldShan/place-fill/releases) 下载最新的 `place-fill-v0.7.4.zip`。
2. 解压后打开 `chrome://extensions`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择解压后的 `extension/` 目录。

解压目录里应直接包含 `manifest.json`。

## 数据存储

- 人工标注存储在扩展的 `chrome.storage.local`。
- 标注按 `domain + first-level subpath` 隔离，适合在同一业务模块内复用。
- 字段显示配置、站点功能开关和常用数据都保存在本地扩展存储中，可通过全部数据备份/恢复迁移。
- 后台会在扩展 IndexedDB 中维护本地数据镜像，`chrome.storage.local` 为空时会尝试从镜像恢复。
- 智能识别与右键标注默认按站点关闭，需要在插件设置里启用。

## 开发

```bash
# 安装依赖
pnpm install

# 构建 extension/generated/
pnpm build

# 检查 JS 语法
pnpm check

# 类型检查
pnpm typecheck

# 运行全部测试
pnpm test

# 打包发布 zip
node extension/scripts/package-release.mjs

# 发布新版本：更新版本、测试、打包、提交、打 tag、推送并创建 GitHub Release
pnpm release 0.7.5

# 验证当前 manifest 版本的 README、zip、tag 和 GitHub Release
pnpm release:verify
```

本地调试时，在 `chrome://extensions` 中加载 `extension/` 目录。手动验证页面位于 `mock-form/index.html`。

## 目录

```text
extension/       Chrome 扩展源码
extension/src/   原生 JS 内容脚本
extension/src-ts/ TypeScript 源码
extension/generated/ 构建产物
mock-form/       本地验证页面
tests/           自动化测试
releases/        本地发布包，勿提交
```
