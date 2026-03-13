<p align="center">
  <img src="assets/logo.png" alt="place-fill" width="200">
</p>

<h1 align="center">place-fill</h1>

<p align="center">
  为表单联调、回归测试和录屏演示而生的 Chrome 填充插件
</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-v0.5.0-4a6fa5?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="chrome mv3">
  <img src="https://img.shields.io/badge/零构建-纯原生JS-21e985?style=flat-square" alt="no build">
</p>

---

## 支持的数据字段

| 字段 | 说明 |
|------|------|
| 统一社会信用代码 | 符合国标校验规则的 18 位编码 |
| 公司名称 | 随机生成的企业全称 |
| 姓名 | 常见中文姓名组合 |
| 身份证号 | 含正确校验位的 18 位号码 |
| 银行卡号 | 符合 Luhn 算法校验的卡号 |
| 手机号 | 国内三大运营商号段 |
| 邮箱 | 常见域名格式 |
| 固定电话 | 含区号的座机号 |
| 地址 | 省市区街道完整格式 |

---

## 核心功能

### 📋 数据面板

- 页面右侧注入可展开 / 收起的悬浮侧边栏
- 每个字段支持**单项复制**、**整组一键复制**
- 支持**一键重新生成**全部数据
- 面板失焦后自动收起，不干扰页面操作
- 磨砂玻璃风格 UI，名片区域支持 3D 视差旋转

### 🔍 智能填充

- 聚焦可编辑输入框时，在输入区域旁自动浮现填充菜单
- 自动识别：邮箱、手机号、身份证号、银行卡号、姓名、公司名称、统一社会信用代码等
- 支持 `autocomplete` 属性辅助识别
- **右键手动标注**：无法自动识别时，可右键为输入框指定字段类型，标注结果按域名 + 一级路径复用

### ⚙️ 站点级设置

- 按当前站点独立控制每个字段的**显示 / 隐藏**
- 按当前站点单独**开启 / 关闭**智能识别与右键标注功能
- 所有配置存储在本地，互不干扰

### 📦 标注数据管理

- 支持**导出**人工标注数据（JSON）
- 支持**脱敏导出**（隐去生成值，仅保留字段映射）
- 支持**导入**已有标注，跨设备迁移

---

## 安装方法

### 从 Release 安装

1. 前往 [GitHub Releases](https://github.com/coldShan/place-fill/releases) 下载最新的 `place-fill-vx.x.x.zip`
2. 解压到本地任意目录
3. 打开 `chrome://extensions`，开启右上角**开发者模式**
4. 点击**加载已解压的扩展程序**，选择解压后的目录
5. 工具栏出现插件图标即安装成功

> **提示**：解压后的目录内应直接包含 `manifest.json`，无需进入子目录。

---

## 本地开发

本项目**零构建工具**，无 npm、无打包器，所有源码均为浏览器原生可直接运行的 JS。

```bash
# 语法检查
node --check extension/src/*.js

# 运行全部测试（88 个用例，基于 node:test）
node --test tests/*.test.mjs

# 同步 Lucide 图标（下载缺失、移除未使用）
node extension/scripts/localize-icons.mjs

# 打包发布 zip（版本号读取自 manifest.json）
node extension/scripts/package-release.mjs
```

### 目录结构

```
place-fill/
├── extension/
│   ├── manifest.json
│   ├── src/               # 内容脚本（按加载顺序依赖）
│   │   ├── field-meta.js
│   │   ├── generators.js
│   │   ├── smart-fill.js
│   │   ├── content-script-panel.js
│   │   ├── background.js
│   │   └── ...
│   ├── assets/
│   │   └── icons/lucide/  # 本地 SVG 图标
│   └── scripts/           # 构建辅助脚本
├── tests/                 # 单元测试
└── releases/              # 打包输出目录
```
