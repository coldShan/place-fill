# 按「系统」统一配置隔离 设计文档

日期：2026-10-27

## 1. 背景与目的

当前各类配置按 URL 隔离，且粒度不统一：

| 数据 | 存储 key | 现有隔离粒度 |
| --- | --- | --- |
| 站点开关 | `ctdp.siteFeatureEnabled.v1` | `hostname`（不含端口） |
| 收藏 | `ctdp.favoriteProfiles.v1` | `hostname`（content-script `getCurrentScope`） |
| 生成历史 | `ctdp.generatedProfiles.v1` | `hostname` |
| 字段标注 | `ctdp.smartFillOverrides.v1` | `origin + 第一级路径`（含端口） |
| AI 字段映射 | `ctdp.aiFieldMappings.v1` | 随标注 key |

这个设计在实际使用中有两个问题：

1. **本地开发环境数据串在一起**：`localhost`、`127.0.0.1` 只有几个固定端口，上面会轮流跑各种不同的项目，配置因此混在一起。
2. **同一系统的配置被拆开**：本地开发环境和线上测试环境是同一个系统、同一套数据，配置却按 URL 互相隔离。

**目标**：把隔离单位从 URL 改为「业务系统」，并统一所有配置的底层隔离逻辑。

## 2. 目标 / 非目标 / 反目标

**目标**
- 站点开关、收藏、生成历史、字段标注（以及 AI 字段映射）使用同一套 scope 解析逻辑。
- 同一系统在不同环境（本地 / 测试 / 预发）下共享配置。
- 同一个 localhost 端口上运行的不同项目，配置互相隔离。
- 新增「系统标注」tab 页，让用户可以查看和维护系统识别信息。

**非目标**
- 不做跨浏览器或云端同步。
- 不做自动识别「同一系统、但标题不同」的环境。这种情况由用户在系统标注页手动合并或添加。

**反目标**（技术上能跑通，但出现即视为失败）
- 未开启开关的站点被自动记录为系统，导致系统列表被无关站点塞满。
- 旧数据（收藏、标注、开关）在升级后丢失或无法找回。生成历史不在此列。
- 同一个 localhost 端口换了项目后，仍沿用旧项目的系统标识。

## 3. 核心概念

### 3.1 系统（System）

```ts
type SystemProfile = {
  id: string;            // 首次记录时生成的唯一 ID，不可修改
  name: string;          // 默认取识别时的页面标题，可修改
  titles: string[];      // 用于匹配的标题关键词，默认 [首次记录时的标题]，可修改
  environments: SystemEnvironment[];
  enabled: boolean;      // 站点开关状态；关闭时不删除系统，只做状态标注
  createdAt: number;
  updatedAt: number;
};

type SystemEnvironment = {
  id: string;
  hostname: string;
  port: string;          // 空字符串表示默认端口
  query: Record<string, string>; // 仅包含用户勾选的「标识参数」
  lastPath: string;      // 末端 path，作为可选匹配条件（为空表示不参与匹配）
  autoAdded: boolean;    // 是否由「标题命中 + 新 host」自动加入
  createdAt: number;
};
```

存储 key：`ctdp.systemProfiles.v1`。这个 key 加入 `storage-mirror.js` 的 `STORAGE_KEYS`，参与完整备份与恢复。

### 3.2 Scope key

所有配置统一按 scope key 存储，格式如下：

- 已识别为系统：`system:<id>`
- 兜底：`host:<hostname>` 或 `host:<hostname>:<port>`（规则见 3.3）

### 3.3 兜底规则（无法识别为系统时）

| host 类型 | 兜底 scope |
| --- | --- |
| 本地 host：`localhost`、`127.0.0.1`、`[::1]`、`0.0.0.0`、`*.localhost` | `hostname + port` |
| 外部 IP（IPv4 / IPv6） | `hostname` |
| 域名 | `hostname` |
| `file://` 等无 hostname 的页面 | 固定 scope `file:` |

局域网 IP（`192.168.x`、`10.x` 等）按「外部 IP」处理，只按 hostname 区分。这是按用户给出的规则推导出的结果，见第 9 节。

## 4. 识别流程

识别只在顶层 frame 进行。识别结果写入页面的 sessionStorage（key：`ctdp.system`，值为 `{ id, name }`），同时上报给 background。

```
进入页面（顶层 frame）
 ├─ 读取 sessionStorage.ctdp.system
 │   ├─ 存在且对应系统仍存在：
 │   │   ├─ 非本地 host → 直接使用
 │   │   └─ 本地 host → 用当前标题校验（sessionStorage 带 manual 标记时跳过校验）：
 │   │        标题为空 → 等待标题出现，暂不判断
 │   │        标题命中旧系统的关键词 → 沿用
 │   │        标题有值但未命中旧系统的关键词 → 丢弃旧标识，进入匹配
 │   └─ 不存在或已失效 → 进入匹配
 ├─ 匹配
 │   ├─ 非本地 host：按 hostname(+port) 查找所属系统 → 命中即用
 │   │      （非本地 host 只能属于一个系统）
 │   ├─ 本地 host：标题关键词 + 端口 + 勾选的 query 参数 + 末端 path（若有）全部吻合 → 命中
 │   └─ 标题命中某个系统，但当前 host 不在该系统的环境中：
 │          → 仅当当前兜底 scope 的站点开关已开启时，自动把当前 host 加入该系统（autoAdded = true）；
 │            开关未开启则使用兜底 scope，不归入
 │          → 若当前 host 是非本地 host 且已属于其他系统：不加入，仍按 host 所属系统处理，
 │            并在系统标注页标记为「异常」（见 6.3）
 ├─ 未命中：
 │   ├─ 当前兜底 scope 的站点开关为开启 → 新建系统并写入 sessionStorage
 │   └─ 否则 → 使用兜底 scope，不新建系统
 └─ 识别结果上报 background（按 tabId 记录），供 iframe 查询
```

### 4.1 标题匹配

- 匹配方式为「包含关键词」，不要求全等。SPA 的标题通常是「用户列表 - 客户管理」这种形式。
- 标题可能异步设置，或在路由切换时变化，因此需要监听 `<title>` 变化，并以短延迟去抖后重新识别。
- 多个系统同时命中时，取匹配条件更多的那个；条件数仍相同时，取关键词更长的那个。
- 内置「通用标题」黑名单，例如 `Vite App`、`React App`、`Vue App`、`Document`、`Untitled`、空白标题，忽略大小写并去除首尾空白后比较。命中黑名单的标题不作为关键词记录，也不参与标题匹配；这类系统只能按「端口 + 标识参数（+ 末端 path）」识别。新建这类系统时，名称默认用兜底 scope 的值（例如 `localhost:5173`），由用户自行修改。

### 4.2 sessionStorage 的作用与局限

- 作用：同一标签页、同一 origin 下，系统内的各个页面共享标识，因此无需记录 path 变化。标识参数（query）通常只出现在入口 URL 上，后续页面依赖 sessionStorage 延续识别结果。
- 局限一：用 `target=_blank` 打开的新标签页默认是 noopener，不会复制 sessionStorage，需要重新识别。
- 局限二：页面登出时可能调用 `sessionStorage.clear()`。这不影响正确性，下次会重新识别。

### 4.3 iframe

- 跨域 iframe 读不到顶层页面的 sessionStorage，因此 iframe 中的 content script 向 background 查询当前 tab 的系统 scope。
- background 用 `chrome.storage.session` 按 tabId 保存识别结果，以应对 service worker 重启；`tabs.onRemoved` 时清理对应记录。
- 如果查询时顶层 frame 尚未识别完成，iframe 先使用自身的兜底 scope，收到 background 推送的识别结果后再切换。

## 5. 站点开关与系统的关系

- 未识别为系统的页面，开关状态存储在兜底 scope 下。
- 开关从关到开时：如果当前页面未命中任何系统，就**进行初次记录**，新建系统；新建时把兜底 scope 下已有的数据迁入该系统（见 7.2）。
- 开关从开到关时：**不删除系统**，只把 `enabled` 置为 false，并在系统标注页标注为「已停用」。
- 已停用的系统仍参与识别，以免重新开启时又新建一个重复的系统。

## 6. 系统标注 tab 页

数据管理页（`data-manager.html`）新增「系统标注」tab，与「收藏 / 历史」共用同一个入口。

### 6.1 列表
- 每个系统一行，显示名称、ID（只读，可复制）、环境数量、状态（启用 / 已停用 / 异常），以及关联的收藏、历史、标注数量。
- 支持搜索名称、标题关键词和 hostname。

### 6.2 编辑（ID 以外均可修改）
- 名称、标题关键词（可增删）。
- 环境记录：可增删改 hostname、端口、末端 path，以及标识参数的「参数名 = 值」；自动加入的环境显示「自动」标记。
- 手动新增系统：填写名称、标题关键词和至少一条环境记录。
- 删除系统：二次确认。系统下的收藏、历史和标注一并删除，或退回某个兜底 scope。默认退回兜底，具体规则见第 9 节。
- 校验：非本地 host 不能同时出现在两个系统中，保存时阻止并提示。

### 6.3 异常提醒
以下情况在列表和详情中显示异常标记和说明：
- 非本地 host 已属于系统 A，但页面标题命中系统 B。记录发生时间和 URL（只记录 origin 和 path，不记录 query），供用户判断是否需要调整归属。

### 6.4 侧边栏
- 显示当前识别出的系统名称，或「未识别（兜底：xxx）」。
- 在本地 host 上提供「手动切换系统」入口作为纠错手段：手动选择后写入 sessionStorage。
- 提供跳转到系统标注页对应系统的链接。

## 7. 数据迁移

升级时执行一次迁移，用一个迁移版本标记避免重复执行。

### 7.1 旧 key → 兜底 scope
| 旧数据 | 迁移目标 |
| --- | --- |
| 开关、收藏、历史中的域名 / 外部 IP | `host:<hostname>` |
| 开关、收藏、历史中的 `localhost` 等本地 host（旧数据无端口） | 「localhost（旧数据）」分组，scope 为 `legacy:<hostname>` |
| 标注 `origin + 第一级路径` | 按 3.3 规则折叠为兜底 scope；本地 host 保留端口 |

- 标注折叠后，同一 scope 下可能出现同一字段指纹的多条标注。冲突时保留 `updatedAt` 较新的一条；没有时间戳时保留第一级路径为空的那条。
- 旧的本地 host 开关值（例如 `localhost: true`）保留为「本地端口默认值」：某个本地 `hostname:port` 第一次访问、且自身还没有开关记录时，取这个默认值并写入该端口的兜底 scope。之后各端口独立。
- 「localhost（旧数据）」分组只在数据管理页显示，不参与页面识别。用户通过现有的「复制到其他站点」功能，把收藏手动复制到对应的系统或兜底 scope。生成历史不重要，不提供复制，只在该分组中保留查看。

### 7.2 新建系统时的数据迁入
新建系统时，把当前兜底 scope 下的收藏、历史、标注合并到 `system:<id>`，并清空兜底 scope 中的这些数据。

## 8. 约束

- 最低支持 Chrome 109：`chrome.storage.session` 从 102 开始可用。content script 不能直接访问 `storage.session`，一律经由 background 消息读写。
- 插件只往页面 sessionStorage 写入一个带命名空间的 key，不读写页面的其他存储。
- 不新增 manifest 权限（`tabs.onRemoved`、`sender.tab.id` 都不需要 `tabs` 权限）。
- 沿用现有模块模式：识别逻辑放在新的纯 JS 模块中（暂定 `extension/src/system-scope.js`），以 IIFE 加 CommonJS 导出，便于 node:test 测试；数据管理页的纯逻辑放在 `pages/data-manager/lib/`。
- 加载顺序：`system-scope.js` 必须在 `site-feature-toggle.js`、`smart-fill.js` 之前加载；background 也需要 `importScripts` 它。同步更新 AGENTS.md 和 `tests/background-runtime.test.mjs`。
- 不记录、不导出完整的 query 字符串，只保留用户勾选的标识参数。

## 9. 由实现者自行决定的部分（以及设计方的默认取舍）

- 唯一 ID 的生成方式：`crypto.randomUUID()` 或时间戳加随机数。
- 标题变化的去抖时长，以及 iframe 等待顶层识别结果的超时时间。
- 系统标注 tab 的具体视觉样式，沿用数据管理页现有的组件和样式。
- **设计方默认取舍（可推翻）**：
  - 末端 path 与 query 一样，作为用户勾选的可选匹配条件，默认不参与匹配。
  - AI 字段映射随标注一起统一到新的 scope。
  - 标注不再按第一级路径细分，同一系统内共享。
  - 删除系统时，数据默认退回兜底 scope 而不是直接删除。
  - 局域网 IP 按外部 IP 处理（只按 hostname 区分）。
  - 删除系统时，在确认弹窗中让用户选择数据退回到哪个环境的兜底 scope，默认选第一个环境。
  - 侧边栏手动切换系统后，在 sessionStorage 中带上 `manual: true` 标记；本标签页内手动选择优先于标题校验，直到用户再次切换或标签页关闭。
  - 恢复备份（完整备份、本地目录备份、IndexedDB 镜像）时按数据格式检测：发现旧格式 key 就重新执行迁移，迁移标记不纳入备份。