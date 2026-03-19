<p align="center">
  <img src="assets/logo.png" alt="place-fill" width="200">
</p>

<h1 align="center">place-fill</h1>

<p align="center">
  为表单联调、回归测试而生的 Chrome 填充插件
</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-v0.5.3-4a6fa5?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="chrome mv3">
  <img src="https://img.shields.io/badge/渐进迁移-JS%20%2B%20TS-21e985?style=flat-square" alt="js and ts">
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

### 🗂️ 数据管理页

- 从插件面板进入独立的数据管理页
- 按**域名 / IP** 隔离展示和管理数据
- 页面内分为两个独立路由：`常用数据` 与 `生成记录`
- 默认进入当前域名 / IP 的 `常用数据`，不支持手动切换其他作用域
- `生成记录` 记录当前作用域最近 30 条整组生成快照，仅展示单行 table 数据
- `常用数据` 支持整组数据的**新增 / 编辑 / 删除 / 收藏 / 复制**
- 新增与编辑共用弹窗表单组件，可从生成记录一键收藏到常用数据

### 📦 标注数据管理

- 支持**导出**人工标注数据（JSON）
- 支持**脱敏导出**（隐去生成值，仅保留字段映射）
- 支持**导入**已有标注，跨设备迁移

---

## 安装方法

### 从 Release 安装

1. 前往 [GitHub Releases](https://github.com/coldShan/place-fill/releases) 下载最新的 `place-fill-v0.5.3.zip`
2. 解压到本地任意目录
3. 打开 `chrome://extensions`，开启右上角**开发者模式**
4. 点击**加载已解压的扩展程序**，选择解压后的目录
5. 工具栏出现插件图标即安装成功

> **提示**：解压后的目录内应直接包含 `manifest.json`，无需进入子目录。

---

## 本地开发

项目当前处于**渐进式 TypeScript 迁移阶段**：

- 现有 content script / smart fill 主体仍保持原生 JS
- 数据管理页、共享数据存储和桥接模块通过 `TypeScript + Vite` 构建到 `extension/generated/`
- 加载 unpacked extension 前需要先执行一次构建

```bash
# 安装依赖
pnpm install

# 构建数据管理页和 TS 桥接产物
pnpm build

# TS 类型检查
pnpm typecheck

# JS 语法检查
pnpm check

# 运行全部 TS 测试
pnpm run test:ts

# 运行现有 JS 测试
node --test tests/*.test.mjs

# 同步 Lucide 图标（下载缺失、移除未使用）
node extension/scripts/localize-icons.mjs

# 同步 README 版本号（读取 manifest.json）
node extension/scripts/sync-readme-version.mjs

# 打包发布 zip（版本号读取自 manifest.json）
node extension/scripts/package-release.mjs
```

### 目录结构

```
place-fill/
├── extension/
│   ├── data-manager.html    # 独立数据管理页入口
│   ├── generated/           # Vite 生成的 TS 运行时产物
│   ├── src-ts/              # 新功能与共享模块的 TS 源码
│   ├── manifest.json
│   ├── background.js
│   ├── src/                 # 现有原生 JS 内容脚本
│   ├── assets/
│   └── scripts/
├── scripts/                 # 仓库级构建脚本
├── tests/
├── package.json
└── pnpm-lock.yaml
```

### 加载调试

1. 执行 `pnpm install`
2. 执行 `pnpm build`
3. 打开 `chrome://extensions`
4. 选择 `extension/` 目录作为 unpacked extension
