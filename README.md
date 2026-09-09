<p align="center">
  <img src="assets/logo.png" alt="place-fill" width="160">
</p>

<h1 align="center">place-fill</h1>

<p align="center">面向表单联调、回归测试和演示录制的 Chrome MV3 测试数据填充插件</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-v0.9.6-4a6fa5?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="chrome mv3">
</p>

## 核心功能

- **一键填表**：生成姓名、手机号、身份证号、公司名称、统一社会信用代码等常用中文测试数据，支持单项复制、整组复制和自动填充。
- **智能识别**：支持原生及 Element UI / Element Plus 常见表单控件；跳过已有值和密码、验证码等敏感字段，有活动弹窗时只填充弹窗表单。
- **字段标注**：输入框旁快捷填充，支持右键手动标注，标注按域名和一级路径复用；可选配 OpenAI-compatible 接口辅助识别。
- **常用数据**：收藏页面数据、维护常用值和备注、查看生成记录，自定义显示字段。
- **备份恢复**：支持全部数据导出与恢复、每周备份提醒；Chrome 122+ 可授权本地目录自动备份。

## 安装与使用

支持 **Chrome 109+**。

1. 从 [GitHub Releases](https://github.com/coldShan/place-fill/releases) 下载 `place-fill-v0.9.6.zip` 并解压。
2. 打开 `chrome://extensions`，开启“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择**直接包含 `manifest.json` 的解压目录**。
4. 在插件设置中为目标站点开启智能识别与右键标注，再使用悬浮面板或输入框旁的快捷入口填充。

站点功能默认关闭；悬浮图标可通过全局开关控制，仅在已启用站点自动显示。

设置中可通过“清空用户数据”清除所有站点的自定义标注，执行前需二次确认；其他数据保留。

## 数据与隐私

- 配置、标注和常用数据保存在本地扩展存储中，可通过“备份全部数据 / 恢复全部数据”迁移。
- 本地目录自动备份默认关闭，启用后写入授权父目录下的 `place-fill-data/place-fill-user-data.json`；Chrome 109–121 使用手动备份与恢复。
- AI 识别需自行配置 HTTPS 接口，只发送脱敏后的表单控件摘要，不发送输入框当前值；API Key 不进入备份或本地数据镜像。

## 开发

```bash
pnpm install       # 安装依赖
pnpm build         # 构建运行时资源
pnpm build:watch   # 监听构建
pnpm check         # JS 语法检查
pnpm typecheck     # TypeScript 类型检查
pnpm test          # 全部测试
```

本地调试：在 `chrome://extensions` 加载 `extension/`。手动验证页面见 [mock-form/](mock-form/)，包含原生、Element UI 和 Element Plus 示例。

主要目录：`extension/src/` 为 JavaScript 模块，`extension/src-ts/` 为 TypeScript 源码，`extension/generated/` 为构建产物，`tests/` 为自动化测试。修改 TypeScript 后需重新构建，不要手动编辑构建产物。

打包与发布：

```bash
# 生成 ZIP 和图片载体到 releases/，仅保留在本地
node extension/scripts/package-release.mjs

# 根据上一版本标签后的提交编写更新日志，再发布（提交、打标签、推送并创建 GitHub Release）
pnpm release <version> --notes-file /tmp/place-fill-release-notes.md

# 验证当前版本的文档、产物及远程发布
pnpm release:verify
```

GitHub Release 仅上传 ZIP，`releases/place-fill.png` 保留在本地。完整开发与发布约定见 [AGENTS.md](AGENTS.md)。
