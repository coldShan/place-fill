export function formatDisplayTime(value: string): string {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "时间未知";
  return new Date(timestamp).toLocaleString("zh-CN");
}

export function moveId(ids: string[], id: string, targetId: string, placeBefore: boolean): string[] {
  if (id === targetId) return ids;
  const next = ids.filter(function (item) {
    return item !== id;
  });
  const targetIndex = next.indexOf(targetId);
  if (targetIndex < 0) return ids;
  next.splice(placeBefore ? targetIndex : targetIndex + 1, 0, id);
  return next;
}

export function shiftId(ids: string[], id: string, offset: number): string[] | null {
  const currentIndex = ids.indexOf(id);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ids.length) return null;
  const next = ids.slice();
  next.splice(currentIndex, 1);
  next.splice(nextIndex, 0, id);
  return next;
}

export const DEFAULT_FAVORITE_NAME = "常用数据";

export function getCustomFavoriteName(name: string): string {
  const trimmed = String(name || "").trim();
  return trimmed === DEFAULT_FAVORITE_NAME ? "" : trimmed;
}

export function getFavoriteTitle(entry: { name: string; profile: { fullName: string } }): string {
  return getCustomFavoriteName(entry.name) || entry.profile.fullName || "未命名数据";
}
