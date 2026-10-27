# 按「系统」统一配置隔离 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把站点开关、收藏、生成历史、字段标注、AI 字段映射的隔离单位从 URL 改为「系统」，无法识别时按统一兜底规则隔离，并在数据管理页新增「系统标注」tab。

**Architecture:** 新增 TypeScript 共享模块：`system-scope.ts` 负责纯识别逻辑，`system-registry.ts` 负责系统存储，`scope-migration.ts` 负责旧数据迁移。三者通过 IIFE bridge 打包为 `generated/system-scope-api.js`，供 content script 和 background 使用。系统识别和注册表写入都集中在 background 完成，以避免多标签页并发写冲突：顶层 frame 采集页面信息和 sessionStorage 标识，发给 background；background 识别后返回 scope，并按 tabId 记入 `chrome.storage.session`，iframe 也从这里查询。现有各存储改为统一使用 scope key。

**Tech Stack:** Chrome MV3、纯 JS IIFE 模块、TypeScript + Vite（IIFE bridge）、Preact TSX、node:test / tsx --test。

**Spec:** `docs/superpowers/specs/2026-10-27-system-scope-design.md`

## Global Constraints

- 最低支持 Chrome 109：不使用原生 CSS 嵌套；`chrome.storage.session` 只在 background 中访问（content script 无权访问）。
- 不新增 manifest 权限。
- 修改 `extension/src-ts/` 后运行 `pnpm build`，并一起提交 `extension/generated/`；不手改 `generated/`。
- 纯 JS 模块使用 IIFE + `ChromeTestData*` 全局 + CommonJS 导出；controller 依赖通过 `options` 注入。
- 写入页面 sessionStorage 的 key 只有一个：`ctdp.system`。
- 新存储 key：`ctdp.systemProfiles.v1`，加入 `storage-mirror.js` 的 `STORAGE_KEYS`。
- 不记录、不导出完整 query，只保留用户勾选的标识参数；异常记录只保存 origin + path。
- 本地 host 包括：`localhost`、`127.0.0.1`、`[::1]`、`0.0.0.0`、`*.localhost`。局域网 IP 按外部 IP 处理。
- 通用标题黑名单：`Vite App`、`React App`、`Vue App`、`Document`、`Untitled`，以及空白标题。比较时忽略大小写并去除首尾空白。
- 提交信息使用 Conventional Commit 前缀 + 中文摘要。工作区中有与本任务无关的未提交改动，每次 `git add` 只添加本任务列出的文件。

## 计划层面的决定（spec 未定、由本计划确定）

- **开关状态统一存在 `ctdp.siteFeatureEnabled.v1`，按 scope key 记录（包括 `system:<id>`），`SystemProfile` 不再单独保存 `enabled` 字段。** 系统标注页从该 map 读取「已停用」状态。这样开关只有一个数据来源。
- **迁移不使用迁移标记，改为按数据形态判断。** scope key 不带 `system:` / `host:` / `legacy:` / `file:` 前缀，就视为旧格式。迁移是幂等的，在 background 启动时执行，并在相关 key 的 `storage.onChanged` 中再次触发，因此天然覆盖备份恢复的各条路径。
- **非本地 host 只按 hostname 判断归属和唯一性，不看端口。** 与域名兜底规则保持一致。
- **IPv6 hostname 编码**：去掉方括号，加 `v6-` 前缀，并把 `:` 替换为 `-`（例如 `[::1]` → `v6---1`）。原因有两个：标注 key 用 `::` 作为分隔符，以及 `normalizeScopeKey` 只允许 `[a-z0-9.\-:]`。
- **标注 key 的格式**改为 `<scope>::<frameScope>::<fingerprint>`，原先的 `origin+第一级路径` 部分由 scope 替代。迁移冲突时，优先保留第一级路径为空的那条，其次按 key 字典序取第一条。AI 映射冲突时保留 `updatedAt` 较新的那条。

## Review Focus

1. **同一 localhost 端口在两个标签页里运行不同项目**：两个标签页各自识别出不同的系统，互不覆盖（tab scope 按 tabId 记录，不按 origin 记录）。→ Task 6 测试
2. **SPA 首屏标题为空，随后才设置为真实标题**：首屏不新建系统；标题出现后重新识别，命中已有系统。→ Task 1、Task 7 测试
3. **备份恢复写回了旧格式数据**：background 的 `storage.onChanged` 触发迁移，迁移结果与首次迁移一致，重复执行不再产生变化。→ Task 3、Task 6 测试
4. **用户在系统标注页把一个非本地 host 加到第二个系统**：保存时被阻止，并给出中文提示。→ Task 2、Task 8 测试
5. **新建系统时，兜底 scope 下已有收藏、标注**：数据全部迁入 `system:<id>`，兜底 scope 下不再残留，也不会出现重复。→ Task 2 测试

---

### Task 1: 纯识别逻辑 `system-scope.ts`

**Files:**
- Create: `extension/src-ts/shared/system-scope.ts`
- Test: `tests/system-scope.test.ts`

**Interfaces:**
- Produces（后续任务都依赖这些）：
  ```ts
  export type HostKind = "local" | "ip" | "domain" | "none";
  export type ScopeKind = "system" | "host" | "legacy" | "file";
  export interface SystemEnvironment { id: string; hostname: string; port: string; query: Record<string, string>; lastPath: string; autoAdded: boolean; createdAt: number }
  export interface SystemAnomaly { titleSystemId: string; url: string; at: number } // url = origin + pathname
  export interface SystemProfile { id: string; name: string; titles: string[]; environments: SystemEnvironment[]; anomalies: SystemAnomaly[]; createdAt: number; updatedAt: number }
  export interface PageInfo { protocol: string; hostname: string; port: string; query: Record<string, string>; lastPath: string; title: string; origin: string; pathname: string }
  export interface SessionMarker { id: string; name: string; manual: boolean }
  export type ScopeDecision =
    | { action: "use"; systemId: string; anomaly: null | { hostSystemId: string; titleSystemId: string } }
    | { action: "auto-add"; systemId: string }
    | { action: "create" }
    | { action: "fallback" };
  export const GENERIC_TITLES: readonly string[];
  export function classifyHost(hostname: string): HostKind;
  export function encodeHostname(hostname: string): string;
  export function getFallbackScope(info: Pick<PageInfo, "protocol" | "hostname" | "port">): string;
  export function buildSystemScope(id: string): string;            // "system:" + id
  export function parseScopeKey(scope: string): { kind: ScopeKind; value: string } | null;
  export function isLegacyScopeKey(scope: string): boolean;         // 非空且不带四种前缀
  export function isGenericTitle(title: string): boolean;
  export function titleMatchesSystem(system: SystemProfile, title: string): string; // 返回命中的关键词，未命中返回 ""
  export function readPageInfo(loc: { protocol: string; hostname: string; port: string; search: string; pathname: string; origin: string }, title: string): PageInfo;
  export function normalizeSessionMarker(raw: unknown): SessionMarker | null;
  export function decideScope(input: { systems: SystemProfile[]; info: PageInfo; marker: SessionMarker | null; fallbackEnabled: boolean }): ScopeDecision;
  ```

- [ ] **Step 1: 写失败测试**，覆盖以下用例（使用 `node:test` + `assert/strict`，与 `tests/data-records.test.ts` 同风格）：
  - `classifyHost`：`localhost`、`127.0.0.1`、`[::1]`、`0.0.0.0`、`app.localhost` 都返回 `"local"`；`192.168.1.2`、`10.0.0.5`、`8.8.8.8`、`[2001:db8::1]` 返回 `"ip"`；`test.crm.com` 返回 `"domain"`；`""` 返回 `"none"`。
  - `getFallbackScope`：
    - `{protocol:"http:",hostname:"localhost",port:"5173"}` → `"host:localhost:5173"`
    - `{hostname:"localhost",port:""}` → `"host:localhost"`
    - `{hostname:"192.168.1.2",port:"8080"}` → `"host:192.168.1.2"`
    - `{hostname:"Test.CRM.com",port:"8443"}` → `"host:test.crm.com"`
    - `{protocol:"file:",hostname:""}` → `"file:"`
    - `{hostname:"[::1]",port:"3000"}` → `"host:v6---1:3000"`
  - `parseScopeKey("system:abc")` 返回 `{kind:"system",value:"abc"}`；`isLegacyScopeKey("example.com")` 为 true；`isLegacyScopeKey("host:example.com")` 为 false。
  - `isGenericTitle`：`"  vite app "` 为 true；`""` 为 true；`"客户管理"` 为 false。
  - `titleMatchesSystem`：系统 titles 为 `["客户管理"]`，标题 `"用户列表 - 客户管理"` 返回 `"客户管理"`；titles 中的通用标题项被忽略。
  - `readPageInfo`：`search:"?app=crm&token=x"` 解析为 `query:{app:"crm",token:"x"}`；`pathname:"/a/b/login"` 得到 `lastPath:"login"`；`pathname:"/"` 得到 `lastPath:""`。
  - `decideScope`（核心表驱动用例）：
    1. 带 marker 且 `manual:true` → `use` marker.id（即使标题命中另一个系统）。
    2. 本地 host，marker 指向系统 A，标题为空 → `use` A。
    3. 本地 host，marker 指向 A，标题命中 A 的关键词 → `use` A。
    4. 本地 host，marker 指向 A，标题有值但不命中 A → 丢弃 marker，按后续规则判断；若标题命中 B 的环境 → `use` B。
    5. 本地 host，marker 指向一个没有可用关键词的系统 A，且 `hostname:port` 在 A 的环境中 → `use` A。
    6. marker 指向的系统已不存在 → 忽略 marker。
    7. 本地 host 环境匹配：A、B 两个系统都有 `localhost:5173` 环境，A 的标题为「客户管理」，B 的标题为「办公平台」，当前标题是「办公平台」→ `use` B。
    8. 本地 host 标识参数：同端口下 A 要求 `query:{app:"crm"}`，B 要求 `{app:"oa"}`，两者标题都是通用标题；当前 query 为 `app=oa` → `use` B；query 缺少 `app` → 两者都不命中。
    9. 打分：都命中时，条件更多的胜出；条件一样多时，命中关键词更长的胜出。
    10. 非本地 host `test.crm.com` 属于 A，标题命中 B → `{action:"use", systemId:A, anomaly:{hostSystemId:A,titleSystemId:B}}`。
    11. 新 host、标题命中 A，`fallbackEnabled:true` → `auto-add` A；`fallbackEnabled:false` → `fallback`。
    12. 什么都不命中，`fallbackEnabled:true` → `create`；`false` → `fallback`。
    13. 本地 host 标题为空且没有 marker → 不按标题匹配；命中仅靠端口/参数的系统时 `use`，否则在 `fallbackEnabled:true` 时**也返回 `fallback`**（标题为空时暂不新建，见 Review Focus 2）。

- [ ] **Step 2: 运行测试，确认失败**
  Run: `npx tsx --test tests/system-scope.test.ts`
  Expected: FAIL（模块不存在）

- [ ] **Step 3: 在 `extension/src-ts/shared/system-scope.ts` 中实现上述接口**
  匹配规则：
  - 非本地 host：找 `environment.hostname === encodeHostname(info.hostname)` 的系统（忽略端口）。
  - 本地 host：环境需满足 hostname 与端口相等、`query` 中每个键值都相等、`lastPath` 非空时也相等。若该系统有非通用标题关键词，还要求标题命中其中之一。
  - 得分 = 1（端口）+ query 键数 + （lastPath 非空 ? 1 : 0）+ （标题命中 ? 1 : 0）。
  - `titleMatchesSystem` 忽略大小写，按包含关系匹配。

- [ ] **Step 4: 运行测试，确认通过**
  Run: `npx tsx --test tests/system-scope.test.ts`
  Expected: PASS

- [ ] **Step 5: 提交**
  ```bash
  git add extension/src-ts/shared/system-scope.ts tests/system-scope.test.ts
  git commit -m "feat: 添加系统识别纯逻辑"
  ```

---

### Task 2: 系统注册表 `system-registry.ts`

**Files:**
- Create: `extension/src-ts/shared/system-registry.ts`
- Modify: `extension/src-ts/shared/data-records.ts`（导出按 scope 整体迁移收藏/历史的函数）
- Test: `tests/system-registry.test.ts`

**Interfaces:**
- Consumes: Task 1 的全部类型、`getFallbackScope`、`buildSystemScope`、`encodeHostname`、`classifyHost`、`isGenericTitle`、`decideScope`。
- Produces:
  ```ts
  export const SYSTEM_PROFILES_STORAGE_KEY = "ctdp.systemProfiles.v1";
  export const SITE_FEATURE_STORAGE_KEY = "ctdp.siteFeatureEnabled.v1";
  export interface RegistryEnv { storageArea?: chrome.storage.StorageArea; now?: () => number; createId?: () => string }
  export async function readSystems(env?: RegistryEnv): Promise<SystemProfile[]>;
  export async function writeSystems(systems: SystemProfile[], env?: RegistryEnv): Promise<void>;
  export function validateSystems(systems: SystemProfile[]): { ok: true } | { ok: false; message: string }; // 非本地 host 重复归属时 ok:false
  export async function saveSystem(system: SystemProfile, env?: RegistryEnv): Promise<{ ok: boolean; message?: string }>; // 新增或更新，id 不可变
  export async function deleteSystem(id: string, targetScope: string, env?: RegistryEnv): Promise<void>; // 数据迁回 targetScope
  export async function moveScopeData(fromScope: string, toScope: string, env?: RegistryEnv): Promise<void>; // 收藏/历史/标注/AI映射/开关
  export async function readScopeEnabled(scope: string, env?: RegistryEnv): Promise<boolean>; // 本地 host 兜底 scope 无记录时回退 legacy:<hostname>，hostname 从 scope 解析
  export async function writeScopeEnabled(scope: string, enabled: boolean, env?: RegistryEnv): Promise<void>;
  export interface ScopeResolution { scope: string; fallbackScope: string; system: { id: string; name: string } | null; marker: SessionMarker | null }
  export async function resolvePageScope(input: { info: PageInfo; marker: SessionMarker | null }, env?: RegistryEnv): Promise<ScopeResolution>;
  export async function dismissAnomalies(systemId: string, env?: RegistryEnv): Promise<void>;
  ```
- `data-records.ts` 新增：`export async function moveScopeRecords(fromScope: string, toScope: string, env?: DataRecordsEnv): Promise<void>`。按 `isSameProfile` 去重合并收藏；历史合并后按时间倒序，截断到 `MAX_GENERATED_RECORDS`；最后删除 `fromScope`。

- [ ] **Step 1: 写失败测试**（内存版 storageArea，同 `tests/data-records.test.ts` 的写法；`createId` 注入固定值）：
  - `readScopeEnabled("host:localhost:5173")`：无记录但存在 `"legacy:localhost": true` 时返回 true；自身记录为 false 时返回 false。
  - `resolvePageScope`：
    - fallback 开关为 true、无任何系统时，新建系统：名称和 titles 取标题；若标题是通用标题，名称取 `"localhost:5173"`，titles 为 `[]`。环境的 query 为 `{}`，lastPath 为 `""`。返回 `scope:"system:<id>"`、`marker:{id,name,manual:false}`。
    - 新建系统时，兜底 scope 下的收藏、标注（key 以 `host:localhost:5173::` 开头）、开关都迁入 `system:<id>`，兜底 scope 下不再残留（Review Focus 5）。
    - `auto-add`：给系统追加一条 `autoAdded:true` 的环境，并持久化。
    - 异常：给 host 所属系统追加 `anomalies` 记录（url 不含 query），同一 url + titleSystemId 不重复追加，最多保留 20 条。
    - fallback 开关为 false 时，返回 `scope` 等于兜底 scope，`system:null`，`marker:null`。
  - `validateSystems`：两个系统都含 `test.crm.com`（端口不同）时，返回 `ok:false`，message 为 `"test.crm.com 已属于系统「A」"`；两个系统都含 `localhost:5173` 时返回 `ok:true`。
  - `saveSystem`：校验失败时不写入存储；更新时如果传入的 id 不存在，就当作新增。
  - `deleteSystem("id", "host:test.crm.com")`：数据迁回 target，系统被移除，`system:<id>` 的开关记录也被删除。

- [ ] **Step 2: 运行测试，确认失败**
  Run: `npx tsx --test tests/system-registry.test.ts`
  Expected: FAIL

- [ ] **Step 3: 实现 `system-registry.ts` 与 `moveScopeRecords`**
  `moveScopeData` 负责处理标注（`ctdp.smartFillOverrides.v1`）和 AI 映射（`ctdp.aiFieldMappings.v1`）：把 key 前缀从 `fromScope + "::"` 替换为 `toScope + "::"`，冲突时保留目标 scope 中已有的那条。开关处理规则：目标 scope 没有开关记录时，继承来源 scope 的值。

- [ ] **Step 4: 运行测试，确认通过**
  Run: `npx tsx --test tests/system-registry.test.ts tests/data-records.test.ts`
  Expected: PASS

- [ ] **Step 5: 提交**
  ```bash
  git add extension/src-ts/shared/system-registry.ts extension/src-ts/shared/data-records.ts tests/system-registry.test.ts
  git commit -m "feat: 添加系统注册表与按 scope 迁移数据"
  ```

---

### Task 3: 旧数据迁移 + bridge 打包

**Files:**
- Create: `extension/src-ts/shared/scope-migration.ts`
- Create: `extension/src-ts/bridges/system-scope-global.ts`
- Modify: `scripts/build-extension.mjs`（新增 IIFE entry，输出 `system-scope-api.js`，name 为 `ChromeTestDataSystemScopeBundle`）
- Modify: `extension/src/storage-mirror.js`（`STORAGE_KEYS` 增加 `ctdp.systemProfiles.v1`）
- Test: `tests/scope-migration.test.ts`、`tests/storage-mirror.test.mjs`
- Generated: `extension/generated/system-scope-api.js`

**Interfaces:**
- Produces:
  - `export async function migrateLegacyScopes(env?: RegistryEnv): Promise<{ changed: boolean }>`
  - 全局 `globalThis.ChromeTestDataSystemScope`：包含 Task 1、Task 2 的全部导出，以及 `migrateLegacyScopes`。

- [ ] **Step 1: 写失败测试**
  - 收藏/历史：`example.com` → `host:example.com`；`192.168.1.2` → `host:192.168.1.2`；`localhost`、`127.0.0.1` → `legacy:localhost`、`legacy:127.0.0.1`。
  - 开关：`{"example.com":true,"localhost":true}` → `{"host:example.com":true,"legacy:localhost":true}`。
  - 标注：`http://localhost:5173/admin::top::fp1` → `host:localhost:5173::top::fp1`；`https://test.crm.com/crm::*::fp2` → `host:test.crm.com::*::fp2`。
  - 冲突：`http://a.com::top::fp` 与 `http://a.com/x::top::fp` 同时存在时，保留无路径那条的值。
  - AI 映射冲突时保留 `updatedAt` 较新的那条。
  - 幂等：对迁移结果再执行一次，返回 `{changed:false}`，且不调用 `storageArea.set`。
  - 已是新格式的 key 与旧格式 key 混在一起时（模拟恢复了旧备份），只迁移旧格式 key，并与已有的新格式 key 合并。
  - `tests/storage-mirror.test.mjs`：`STORAGE_KEYS` 中包含 `ctdp.systemProfiles.v1`。

- [ ] **Step 2: 运行测试，确认失败**
  Run: `npx tsx --test tests/scope-migration.test.ts && node --test tests/storage-mirror.test.mjs`
  Expected: FAIL

- [ ] **Step 3: 实现迁移函数、bridge、构建 entry 和 STORAGE_KEYS**
  旧 key 解析：收藏、历史、开关里的 key 是 hostname，直接按 `classifyHost` 判断；本地 host → `legacy:<hostname>`，否则走 `getFallbackScope`。标注和 AI 映射的 key 第一段是 `origin[/path]`，用 `new URL()` 解析后走 `getFallbackScope`。解析失败的 key 原样保留。

- [ ] **Step 4: 构建并运行测试**
  Run: `pnpm build && npx tsx --test tests/scope-migration.test.ts && node --test tests/storage-mirror.test.mjs`
  Expected: PASS；`extension/generated/system-scope-api.js` 存在。

- [ ] **Step 5: 提交**
  ```bash
  git add extension/src-ts/shared/scope-migration.ts extension/src-ts/bridges/system-scope-global.ts scripts/build-extension.mjs extension/src/storage-mirror.js extension/generated tests/scope-migration.test.ts tests/storage-mirror.test.mjs
  git commit -m "feat: 迁移旧版站点数据到统一 scope"
  ```

---

### Task 4: 站点开关改为按 scope key

**Files:**
- Modify: `extension/src/site-feature-toggle.js`
- Test: `tests/site-feature-toggle.test.mjs`

**Interfaces:**
- Produces（签名变更，env 必须带 `scope`）：
  - `readSiteFeatureEnabled(env: { scope: string, hostname?: string, storageArea? }) => Promise<boolean>`：没有 `scope` 时返回默认值 false。本地 host 的兜底 scope 没有自身记录时，读取 `legacy:<hostname>`。
  - `writeSiteFeatureEnabled(enabled, env: { scope, storageArea? }) => Promise<boolean>`
  - 移除 `getLocationHostname` 读取 `location` 的隐式行为。

- [ ] **Step 1: 改写测试**：按 scope 读写；读取 `host:localhost:5173` 时回退到 `legacy:localhost`；`system:abc` 能独立读写；不传 scope 时返回 false 且不写入。
- [ ] **Step 2: 运行，确认失败** — Run: `node --test tests/site-feature-toggle.test.mjs`，Expected: FAIL
- [ ] **Step 3: 实现**，读取逻辑与 Task 2 的 `readScopeEnabled` 保持一致。scope 的 hostname 从 `parseScopeKey` 的 value 中取冒号前的部分。
- [ ] **Step 4: 运行，确认通过** — Run: `node --test tests/site-feature-toggle.test.mjs`，Expected: PASS
- [ ] **Step 5: 提交** — `git add extension/src/site-feature-toggle.js tests/site-feature-toggle.test.mjs && git commit -m "refactor: 站点开关按统一 scope 存储"`

---

### Task 5: 标注与 AI 映射改为按 scope key

**Files:**
- Modify: `extension/src/smart-fill.js`（`getPageScope`、`getSiteScope`、`foldPageScopeToFirstLevelPath` 及其调用处）
- Test: `tests/smart-fill.test.mjs`

**Interfaces:**
- Produces: `smartFillApi.setScopeResolver(fn: () => string): void`。`getPageScope(env)` 和 `getSiteScope(env)` 都按以下优先级返回同一个值：`env.scope` → resolver 的返回值 → `ChromeTestDataSystemScope.getFallbackScope(location)`。删除 `foldPageScopeToFirstLevelPath`（若有导出，同时从 api 中移除）。

- [ ] **Step 1: 改写/新增测试**：`env.scope = "system:abc"` 时，`setManualFieldOverride` 写入的 key 为 `system:abc::top::<fp>`；同一系统下不同第一级路径共享标注；`applyAiFieldMappings` 写入的 key 前缀同样是 scope；不同 scope 的标注互不可见。删除依赖「第一级路径隔离」的旧断言。
- [ ] **Step 2: 运行，确认失败** — Run: `node --test tests/smart-fill.test.mjs`，Expected: FAIL
- [ ] **Step 3: 实现**
- [ ] **Step 4: 运行，确认通过** — Run: `node --test tests/smart-fill.test.mjs`，Expected: PASS
- [ ] **Step 5: 提交** — `git add extension/src/smart-fill.js tests/smart-fill.test.mjs && git commit -m "refactor: 字段标注按系统 scope 共享"`

---

### Task 6: background 识别服务、tab scope 与迁移触发

**Files:**
- Modify: `extension/background.js`
- Modify: `extension/manifest.json`（content_scripts 的 js 列表：在 `src/field-meta.js` 之后、`src/site-feature-toggle.js` 之前插入 `generated/system-scope-api.js`）
- Test: `tests/background-runtime.test.mjs`、`tests/background-actions.test.mjs`、`tests/manifest.test.mjs`

**Interfaces:**
- Consumes: `ChromeTestDataSystemScope.resolvePageScope`、`writeScopeEnabled`、`migrateLegacyScopes`、`readSystems`、`buildSystemScope`。
- Produces（runtime 消息，均通过 `sendResponse` 异步返回）：
  - `{type:"resolve-page-scope", info: PageInfo, marker: SessionMarker|null}` → `ScopeResolution`。只接受 `sender.frameId === 0` 的请求。结果写入 `chrome.storage.session` 的 `ctdp.tabScopes`（`{[tabId]: ScopeResolution}`），并向该 tab 所有 frame 广播 `{type:"page-scope-changed", resolution}`。
  - `{type:"get-tab-scope"}` → `ScopeResolution | null`（供 iframe 使用）。
  - `{type:"set-site-feature-enabled", enabled, scope, info, marker}` → 先 `writeScopeEnabled(scope, enabled)`；若 enabled 为 true 且 scope 不是 system scope，再执行一次 `resolve-page-scope` 流程（此时会新建系统或自动加入），返回新的 `ScopeResolution`。
  - `{type:"select-system", systemId|null}` → 把 tab scope 设为该系统（传 null 表示恢复自动识别），返回 `ScopeResolution`。marker 由 content script 写入。
  - `{type:"list-systems"}` → `Array<{id,name}>`（供侧边栏手动切换使用）。
- 迁移触发：worker 顶层执行一次 `migrateLegacyScopes()`；`chrome.storage.onChanged` 中，`favoriteProfiles` / `generatedProfiles` / `smartFillOverrides` / `siteFeatureEnabled` / `aiFieldMappings` 任一变化时再执行一次。
- 用一个 promise 队列串行执行所有注册表写入：`resolve-page-scope`、`set-site-feature-enabled`、`select-system`、迁移。
- `chrome.tabs.onRemoved` 时清理 `ctdp.tabScopes[tabId]`。
- `backgroundImports`：在 `src/site-feature-toggle.js` 之前插入 `generated/system-scope-api.js`。
- 右键菜单的开关同步：`sync-site-feature-context-menu` 保持不变（content script 负责传 enabled）。

- [ ] **Step 1: 写失败测试**（沿用 `tests/background-runtime.test.mjs` 中的 chrome mock）：
  - `backgroundImports` 的顺序包含 `generated/system-scope-api.js`，且位于 `src/site-feature-toggle.js` 之前。
  - manifest 的 content_scripts 中，`generated/system-scope-api.js` 位于 `src/site-feature-toggle.js` 之前。
  - 同一 tab 上，`frameId !== 0` 发来的 `resolve-page-scope` 被拒绝（返回 null）。
  - **Review Focus 1**：tab 1 和 tab 2 都是 `localhost:5173`，标题分别命中系统 A、B，两者的 `get-tab-scope` 分别返回 A、B。
  - `tabs.onRemoved` 后，`get-tab-scope` 返回 null。
  - **Review Focus 3**：`storage.onChanged` 收到旧格式的 `ctdp.favoriteProfiles.v1` 后会触发迁移；迁移自身的写入再次触发 onChanged 时，不会产生第二次 set。
  - 开关链路：fallback scope 上执行 `set-site-feature-enabled(true)` 后，返回 system scope，且该系统已被持久化。
- [ ] **Step 2: 运行，确认失败** — Run: `node --test tests/background-runtime.test.mjs tests/background-actions.test.mjs tests/manifest.test.mjs`，Expected: FAIL
- [ ] **Step 3: 实现**
- [ ] **Step 4: 运行，确认通过** — 同上命令，并执行 `pnpm check`。Expected: PASS
- [ ] **Step 5: 提交** — `git add extension/background.js extension/manifest.json tests/background-runtime.test.mjs tests/background-actions.test.mjs tests/manifest.test.mjs && git commit -m "feat: background 统一识别页面所属系统"`

---

### Task 7: content script 接入 scope（含侧边栏系统显示与手动切换）

**Files:**
- Create: `extension/src/content-script-scope.js`（`ChromeTestDataContentScriptScope`）
- Modify: `extension/manifest.json`（在 `src/content-script-panel.js` 之前加入 `src/content-script-scope.js`）
- Modify: `extension/src/content-script.js`、`extension/src/content-script-panel.js`、`extension/src/content-script-smartfill.js`（如需）
- Test: `tests/content-script-scope.test.mjs`（新）、`tests/content-script-orchestration.test.mjs`、`tests/panel-card-ui.test.mjs`

**Interfaces:**
- Consumes: Task 6 的消息；Task 1 的 `readPageInfo`、`normalizeSessionMarker`、`getFallbackScope`。
- Produces:
  ```js
  createScopeClient(options: { window, document, sendRuntimeMessage, systemScopeApi, isTopFrame: boolean, titleDebounceMs?: number /* 默认 300 */ }) => {
    start(): Promise<ScopeResolution>,      // 顶层 frame：读取 marker，发送 resolve-page-scope，写回 marker，然后开始监听 <title>；iframe：先用自身兜底 scope，再发 get-tab-scope
    getScope(): string,                     // 同步返回当前 scope（未完成识别时返回兜底 scope）
    getResolution(): ScopeResolution,
    setSiteFeatureEnabled(enabled: boolean): Promise<ScopeResolution>,
    selectSystem(systemId: string | null): Promise<ScopeResolution>, // 选择系统时写入 marker 并带 manual:true；传 null 时清除 marker 并重新识别
    listSystems(): Promise<Array<{id: string, name: string}>>,
    onChange(listener: (resolution: ScopeResolution) => void): () => void
  }
  ```
  - 写 marker：`sessionStorage.setItem("ctdp.system", JSON.stringify(marker))`；marker 为 null 时调用 `removeItem`。所有访问都包在 try/catch 中。
  - 标题监听：用 `MutationObserver` 观察 `document.head` 的 `childList` / `subtree` / `characterData`。标题变化且去抖后重新执行 `resolve-page-scope`。
  - 也监听 `page-scope-changed` 消息（iframe 依赖它更新）。
- content-script.js 的接线：
  - 删除本地的 `getCurrentScope`，改为传入 `scopeClient.getScope`。
  - 先 `await scopeClient.start()`，再加载标注、执行 `panelController.mount()`。
  - 调用 `smartFillApi.setScopeResolver(scopeClient.getScope)`。
  - 所有 `siteFeatureToggleApi.readSiteFeatureEnabled()` 调用都改为传入 `{ scope: scopeClient.getScope() }`。
  - `scopeClient.onChange` 时：重新读取开关、调用 `panelController.reloadScope()`、执行 `syncActiveSmartTarget()`。
- panel 的 options 新增 `scopeClient`：
  - `getCurrentScopeKey` 改为 `scopeClient.getScope()`。
  - `toggleSiteFeatureEnabled` 改为调用 `scopeClient.setSiteFeatureEnabled`。
  - 新增 `reloadScope()`：重新加载开关状态和收藏。
  - 设置区在开关下方显示一行：已识别时为「当前系统：<name>」，未识别时为「未识别（<fallbackScope>）」。
  - 仅本地 host：显示「切换系统」下拉框，选项为列表中的系统加「自动识别」。
  - 已识别时显示「管理系统」链接：发送 `open-data-manager-page`，参数为 `scope: system:<id>` 和 `view: "systems"`。

- [ ] **Step 1: 写失败测试**（`tests/content-script-scope.test.mjs`，使用 fake window/document/sessionStorage/MutationObserver 和 fake `sendRuntimeMessage`）：
  - `start()` 把 sessionStorage 中的 marker 原样放进 `resolve-page-scope` 消息；返回结果中的 marker 被写回。
  - sessionStorage 访问抛错时，`start()` 仍正常完成。
  - **Review Focus 2**：首屏标题为空，start 后 scope 为兜底 scope；随后标题变为「客户管理」，去抖结束后再次发送 resolve，`getScope()` 变为 `system:a`，`onChange` 被调用一次。
  - iframe（`isTopFrame:false`）不发送 `resolve-page-scope`，只发送 `get-tab-scope`；收到 `page-scope-changed` 后更新 scope。
  - `selectSystem("b")` 写入 `{id:"b",manual:true}`；`selectSystem(null)` 删除 marker。
  - `tests/panel-card-ui.test.mjs`：设置区渲染「当前系统」行；非本地 host 不渲染「切换系统」下拉框。
  - `tests/content-script-orchestration.test.mjs`：`panelController.mount` 在 `scopeClient.start` resolve 之后才调用。
- [ ] **Step 2: 运行，确认失败** — Run: `node --test tests/content-script-scope.test.mjs tests/content-script-orchestration.test.mjs tests/panel-card-ui.test.mjs`，Expected: FAIL
- [ ] **Step 3: 实现**（新增文案只用中文；样式写在 `sidepanel.css`，使用平铺选择器）
- [ ] **Step 4: 运行，确认通过** — `pnpm check && pnpm run test:js`，Expected: PASS
- [ ] **Step 5: 手动验证**：加载 unpacked 扩展，打开 `mock-form/index.html`（`file:` scope），再用本地静态服务以两个不同的 `<title>` 在同一端口打开，确认两边的开关、收藏互不影响；开启开关后，数据管理页出现新系统。
- [ ] **Step 6: 提交** — `git add extension/src/content-script-scope.js extension/src/content-script.js extension/src/content-script-panel.js extension/src/content-script-smartfill.js extension/src/sidepanel.css extension/manifest.json tests/content-script-scope.test.mjs tests/content-script-orchestration.test.mjs tests/panel-card-ui.test.mjs && git commit -m "feat: 内容脚本按系统 scope 读写配置"`

---

### Task 8: 数据管理页「系统标注」tab

**Files:**
- Modify: `extension/src-ts/shared/data-manager-routing.ts`（`DATA_MANAGER_VIEWS` 增加 `"systems"`；`buildDataManagerPageUrl` 增加可选参数 `systemId`，对应 `?system=` 查询参数）
- Modify: `extension/src-ts/pages/data-manager/app.tsx`、`components/toolbar.tsx`（`VIEW_LABELS.systems = "系统标注"`）、`components/header.tsx`、`components/copy-to-sites-dialog.tsx`
- Create: `extension/src-ts/pages/data-manager/lib/scope-label.ts`、`state/use-systems.ts`、`components/systems-table.tsx`、`components/system-editor.tsx`
- Modify: `extension/src-ts/pages/data-manager/style.css`
- Test: `tests/data-manager-routing.test.ts`、`tests/data-manager-lib.test.ts`、`tests/data-manager-page-ui.test.mjs`
- Generated: `extension/generated/data-manager.js`、`data-manager.css`

**Interfaces:**
- Consumes: Task 2 的 `readSystems`、`saveSystem`、`deleteSystem`、`validateSystems`、`dismissAnomalies`；`ctdp.siteFeatureEnabled.v1`。
- Produces:
  - `formatScopeLabel(scope: string, systems: SystemProfile[]): string`：`system:<id>` 返回系统名（找不到时返回「已删除的系统」）；`host:x` 返回 `x`；`legacy:localhost` 返回「localhost（旧数据）」；`file:` 返回「本地文件」。
  - `useSystems(): { systems: SystemProfile[]; enabledMap: Record<string, boolean>; save; remove; dismiss }`：监听 `chrome.storage.onChanged`，与 `use-records.ts` 的写法一致。
- 页面行为（对应 spec 第 6 节）：
  - 列表列：名称、ID（只读 + 复制按钮）、环境数、状态（启用 / 已停用 / 异常，异常优先显示）、收藏数、标注数（统计 overrides 中以 `system:<id>::` 开头的 key 数量）。
  - 搜索：名称、关键词、hostname。
  - 编辑抽屉：可改名称、关键词（增删），环境的 hostname / 端口 / 末端 path / 标识参数（`参数名=值`，可增删），自动加入的环境显示「自动」标签。保存时先校验，失败用 toast 显示 `validateSystems` 返回的 message（Review Focus 4）。
  - 「新增系统」按钮：必须填写名称和至少一条环境，否则无法保存。
  - 删除：确认弹窗里用单选列出各环境对应的兜底 scope（默认选第一个），确认后调用 `deleteSystem`。
  - 异常：详情中列出 `anomalies`（命中的系统名、url、时间），并提供「忽略」按钮（调用 `dismissAnomalies`）。
  - Header 和复制弹窗中的 scope 一律通过 `formatScopeLabel` 显示。
  - URL 带 `?view=systems&system=<id>` 时，直接打开该系统的编辑抽屉。

- [ ] **Step 1: 写失败测试**：
  - routing：`normalizeDataManagerView("systems") === "systems"`；`buildDataManagerPageUrl(base, "system:a", "systems", "a")` 生成的 URL 包含 `view=systems&system=a`；解析 URL 时得到 `systemId`。
  - lib：`formatScopeLabel` 的四种情况以及「已删除的系统」。
  - page-ui：toolbar 中有「系统标注」tab；`style.css` 中不出现原生嵌套。
- [ ] **Step 2: 运行，确认失败** — Run: `npx tsx --test tests/data-manager-routing.test.ts tests/data-manager-lib.test.ts && node --test tests/data-manager-page-ui.test.mjs`，Expected: FAIL
- [ ] **Step 3: 实现**（复用现有的 `DrawerShell`、`Dialog`、`IconButton`、`useConfirm`、`useToast`；如需新图标，按 Icon Workflow 下载并运行 `node extension/scripts/localize-icons.mjs`）
- [ ] **Step 4: 构建并运行** — `pnpm build && pnpm typecheck && pnpm test`，Expected: PASS
- [ ] **Step 5: 手动验证**：系统标注页能新增、编辑、删除系统；给非本地 host 设置重复归属时被阻止；删除系统后数据回到所选的兜底 scope。
- [ ] **Step 6: 提交** — `git add extension/src-ts extension/generated extension/assets/icons extension/src/icon-assets.js tests/data-manager-routing.test.ts tests/data-manager-lib.test.ts tests/data-manager-page-ui.test.mjs && git commit -m "feat: 数据管理页新增系统标注"`

---

### Task 9: 文档同步与全量验证

**Files:**
- Modify: `AGENTS.md`（Content Script Load Order 加入 `generated/system-scope-api.js` 和 `src/content-script-scope.js`；Background Worker Load Order 更新；Storage Isolation 改写为按系统 / 兜底规则说明；`generated/` 列表加入 `system-scope-api.js`；Extension Pages 中加入系统标注 tab）
- Modify: `README.md`（功能说明：按系统隔离、兜底规则、系统标注页）

- [ ] **Step 1: 更新两份文档**，内容与 spec 第 3、5、6 节一致。
- [ ] **Step 2: 全量验证**
  Run: `pnpm build && pnpm check && pnpm typecheck && pnpm test && git status --short extension/generated && git diff --check`
  Expected: 全部通过；`extension/generated` 没有未提交的差异。
- [ ] **Step 3: 提交** — `git add AGENTS.md README.md && git commit -m "docs: 同步按系统隔离配置的说明"`
