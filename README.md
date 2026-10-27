<p align="center">
  <img src="assets/logo.png" alt="place-fill" width="160">
</p>

<h1 align="center">place-fill</h1>

<p align="center">面向表单联调、回归测试和演示录制的 Chrome MV3 测试数据填充插件</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-v0.9.9-4a6fa5?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="chrome mv3">
</p>

## 核心功能

- **一键填表**：生成姓名、手机号、身份证号、公司名称、统一社会信用代码、邮政编码等常用中文测试数据，支持单项复制、整组复制和自动填充。
- **智能识别**：支持原生及 Element UI / Element Plus 常见表单控件；跳过已有值和密码、验证码等敏感字段，有活动弹窗时只填充弹窗表单。
- **随机日期**：原生日期时间控件遵守 `min`、`max`、`step`，未设置边界时默认在当前日期前后一年内随机；Element UI / Element Plus 从当前日历面板未禁用的日期中随机选择，当前面板无可选项时跳过。组件未公开的业务或服务端校验仍需页面验证。
- **字段标注**：输入框旁快捷填充，支持右键手动标注，标注在同一系统内共享复用；可选配 OpenAI-compatible 接口辅助识别。
- **按系统隔离**：站点开关、常用数据、生成记录和字段标注按「业务系统」统一隔离，同一系统的本地、测试等不同环境共享配置，同一个 localhost 端口上的不同项目互不串数据；无法识别为系统时按下方兜底规则隔离。
- **系统标注**：数据管理页的「系统标注」标签页可查看和搜索系统，修改名称、标题关键词和环境（主机、端口、标识参数、末端路径），手动新增、删除系统，并查看识别异常提示。
- **数据管理**：按系统（或兜底站点）管理常用数据与生成记录，支持全字段搜索、点击字段即复制、详情抽屉内编辑（名称备注、格式提示、单字段或整组随机生成），可将常用数据复制到其他系统或站点，并按系统导入导出常用数据；页面实时同步并跟随系统暗色模式。
- **备份恢复**：支持全部数据导出与恢复、每周备份提醒；Chrome 122+ 可授权本地目录自动备份。

## 安装与使用

支持 **Chrome 109+**。

1. 从 [GitHub Releases](https://github.com/coldShan/place-fill/releases) 下载 `place-fill-v0.9.9.zip` 并解压。
2. 打开 `chrome://extensions`，开启“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择**直接包含 `manifest.json` 的解压目录**。
4. 在插件设置中为目标站点开启智能识别与右键标注，再使用悬浮面板或输入框旁的快捷入口填充。

站点功能默认关闭；悬浮图标可通过全局开关控制，仅在已启用站点自动显示。

### 按系统隔离配置

- **识别方式**：在未识别为系统的页面上开启功能时，立即以页面标题为名称新建一个系统；之后同一标签页内沿用该标识，标题包含已记录关键词的页面会归入同一系统（`Vite App`、`Document` 等通用标题和空标题不参与匹配）。开关开启后，标题命中的新主机会自动加入该系统；关闭开关只会把系统标为「已停用」，不会删除。
- **兜底规则**：未识别为系统时，本地主机（`localhost`、`127.0.0.1`、`[::1]`、`0.0.0.0`、`*.localhost`）按「主机名 + 端口」隔离；域名和外部 IP（含局域网 IP）按主机名隔离；`file://` 等无主机名页面共用一个本地范围。在未识别的页面上开启开关时会立即新建系统，并把兜底范围下已有的数据并入。
- **侧边栏**：显示当前系统（或「未识别」及其兜底范围），可跳转「管理系统」；在本地主机上可通过「切换系统」手动纠错，本标签页内手动选择优先于标题识别。
- **旧数据**：升级后自动迁移。域名类旧数据归入对应主机；旧的 localhost 数据没有端口信息，会出现在数据管理页的「旧数据」分组中，常用数据可复制到目标系统，生成记录仅供查看。

设置中可通过“清空用户数据”清除所有站点的自定义标注，执行前需二次确认；其他数据保留。

## 数据与隐私

- 配置、标注和常用数据保存在本地扩展存储中，可通过“备份全部数据 / 恢复全部数据”迁移。
- 本地目录自动备份默认关闭，启用后写入授权父目录下的 `place-fill-data/place-fill-user-data.json`；开启后可在设置中点击「更换目录」改为写入新目录，原目录的备份文件保留不动。Chrome 109–121 使用手动备份与恢复。
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

主要目录：`extension/src/` 为 JavaScript 模块，`extension/src-ts/` 为 TypeScript 源码（数据管理页位于 `extension/src-ts/pages/data-manager/`，使用 Preact + TSX），`extension/generated/` 为构建产物，`tests/` 为自动化测试。修改 TypeScript 后需重新构建，不要手动编辑构建产物。

打包与发布：

```bash
# 生成 ZIP 和伪装图片到 releases/，仅保留在本地；--carrier 可选，默认使用 nodata.png
node extension/scripts/package-release.mjs --carrier /tmp/place-fill-update.png

# 根据上一版本标签后的提交编写更新日志，再发布（提交、打标签、推送并创建 GitHub Release）
pnpm release <version> --notes-file /tmp/place-fill-release-notes.md --carrier /tmp/place-fill-update.png

# 验证当前版本的文档、产物及远程发布；传入 --carrier 时额外校验伪装图片使用的是该载体
pnpm release:verify --carrier /tmp/place-fill-update.png
```

`releases/place-fill.png` 由载体 PNG 与 ZIP 拼接而成，可当图片查看也可直接解压。载体可以是版本更新图，实现一图两用；需为完整 PNG，并放在仓库外以保持工作区干净。GitHub Release 仅上传 ZIP，`releases/place-fill.png` 保留在本地。完整开发与发布约定见 [AGENTS.md](AGENTS.md)。
