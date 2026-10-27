import { parseScopeKey, type SystemProfile } from "../../../shared/system-scope";

export const DELETED_SYSTEM_LABEL = "已删除的系统";
export const LOCAL_FILE_LABEL = "本地文件";

/** Human-readable name for a storage scope key; unknown or un-migrated keys are shown as stored. */
export function formatScopeLabel(scope: string, systems: SystemProfile[]): string {
  const parsed = parseScopeKey(scope);
  if (!parsed) return scope;
  if (parsed.kind === "system") {
    const system = systems.find(function (item) {
      return item.id === parsed.value;
    });
    if (!system) return DELETED_SYSTEM_LABEL;
    return system.name.trim() || "未命名系统";
  }
  if (parsed.kind === "legacy") return parsed.value + "（旧数据）";
  if (parsed.kind === "file") return LOCAL_FILE_LABEL;
  return parsed.value;
}
