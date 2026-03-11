# place-fill

这是一个用于表单联调、回归测试和演示录屏的 Chrome 扩展，插件名为 `place-fill`。

## 功能说明

- 生成统一社会信用代码、公司名称、姓名、身份证号、银行卡号、手机号、邮箱、固定电话、地址
- 支持单项复制、整组复制和一键重新生成全部数据
- 在页面右侧注入可收起、可展开的悬浮测试数据面板
- 主面板右上角提供 GitHub 仓库入口，面板失焦时会自动收起
- 字段卡片、吸附标签和智能填充按钮统一使用本地化图标
- 扩展工具栏与扩展管理页使用同一套本地 PNG logo
- 聚焦可识别字段时，在输入区域旁显示对应字段的悬浮按钮并支持智能填充
- 支持在当前聚焦输入框上通过右键菜单手动标注字段类型，并可恢复自动识别
- 支持在主面板底部通过设置入口导出、导入和脱敏导出用户标注数据
- 主面板底部显示当前版本，并支持手动检查 GitHub Release 更新
- 支持在设置面板按站点勾选要展示的填充项，默认展示统一社会信用代码、公司名称、姓名、身份证号、银行卡号、手机号
- 右键手动标注始终提供全量字段，选择未启用字段时会自动加入当前站点的展示配置
- 支持邮箱、固定电话、地址、手机号、身份证号、姓名、银行卡号、统一社会信用代码等常见字段场景
- 包含 hover、copy、高亮脉冲与吸附滑入等轻量交互动效

## 插件导入说明

1. 打开 Chrome，进入 `chrome://extensions`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择下载的 `place-fill` 插件解压后的文件夹（即包含 `manifest.json` 的目录）
5. 导入后会显示插件名 `place-fill`

如果要配合本地示例页联调，可以直接在浏览器打开 `mock-form/index.html`。

## 资源指引

- 扩展源码目录：`extension/`
- 仓库级测试目录：`tests/`
- 本地联调页面：`mock-form/index.html`
- 发布产物目录：`releases/`
- README 预览图资源：`assets/img1.png`、`assets/img2.png`
- Lucide 本地图标目录：`extension/assets/icons/lucide/`
- 插件 Logo 资源目录：`extension/assets/app-icons/`

## 图标资源

- 同步当前实际用到但尚未本地化的 Lucide 图标：
  `node extension/scripts/localize-icons.mjs`
  会同时移除 `assets/icons/lucide` 下未被当前代码使用的多余 `.svg` 文件。
- 强制用官方源覆盖当前已存在的本地图标：
  `node extension/scripts/localize-icons.mjs --force`

## 发布

- 发布 zip 只包含 `extension/` 目录内容，产物文件名会自动带上 `manifest.json` 里的版本号，例如 `releases/place-fill-v0.3.4.zip`：
  `node extension/scripts/package-release.mjs`
