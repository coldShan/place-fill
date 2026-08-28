<p align="center">
  <img src="assets/logo.png" alt="place-fill" width="160">
</p>

<h1 align="center">place-fill</h1>

<p align="center">面向表单联调、回归测试和演示录制的 Chrome MV3 测试数据填充插件</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-v0.9.2-4a6fa5?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="chrome mv3">
</p>

## 功能

- 生成常用中文测试数据：统一社会信用代码、公司名称、姓名、身份证号、银行卡号、账号、手机号、邮箱、固定电话、地址。
- 右侧悬浮面板支持单项复制、整组复制、重新生成和页面自动填充；一键填充支持原生及 Element UI / Element Plus 的文本框、下拉框、单选、多选、开关与日期时间控件，悬浮球划过后可直接触发。
- 智能识别输入框类型，并在输入框旁显示快速填充按钮；当前字段存在常用值时自动展示选择列表，五星按钮可添加当前页面已识别的非空字段，黄色状态下确认后可移除对应整组常用数据。
- 可配置 OpenAI-compatible 接口进行脱敏表单识别，复核本地识别并补充未知字段。
- 支持右键手动标注字段类型；标注按域名和一级路径复用。
- 支持按站点开启/关闭智能识别、控制字段显示、管理常用数据和生成记录。
- 支持人工标注导入、导出、脱敏导出，以及全部数据备份/恢复；每周五上午 10 点通过悬浮球提醒备份，页面暂不可用时会自动补发，点击提醒即可备份全部数据。

## 安装

1. 在 [GitHub Releases](https://github.com/coldShan/place-fill/releases) 下载最新的 `place-fill-v0.9.2.zip`。
2. 解压后打开 `chrome://extensions`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择解压后的 `extension/` 目录。

解压目录里应直接包含 `manifest.json`。

## 数据存储

- 人工标注存储在扩展的 `chrome.storage.local`。
- 标注按 `domain + first-level subpath` 隔离，适合在同一业务模块内复用。
- 字段显示配置、站点功能开关和常用数据都保存在本地扩展存储中，可通过全部数据备份/恢复迁移。
- AI 识别配置保存在本地扩展存储中；API Key 不会进入全部数据备份、脱敏导出或 IndexedDB 镜像。
- AI 识别只支持 HTTPS Base URL，并只上传脱敏后的表单控件摘要，不上传输入框当前值。
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

# 打包发布 zip，并生成伪装图片 releases/place-fill.png
node extension/scripts/package-release.mjs

# 分析上一版本标签后的相关 Git commits，人工编写更新日志后再发布；只上传 zip，place-fill.png 保留在本地
pnpm release <version> --notes-file /tmp/place-fill-release-notes.md

# 验证当前版本的文档、zip、伪装图片、tag 和 GitHub Release
pnpm release:verify
```

本地调试时，在 `chrome://extensions` 中加载 `extension/` 目录。原生、Element UI 和 Element Plus 手动验证页面分别位于 `mock-form/index.html`、`mock-form/element-ui-demo.html` 和 `mock-form/element-plus-demo.html`。

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
