export function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type IconAssetsApi = {
  ACTION_ICONS?: Record<string, string>;
  renderIconMarkup?: (name: string, className?: string, label?: string) => string;
};

declare global {
  interface Window {
    ChromeTestDataIconAssets?: IconAssetsApi;
  }
}

export function renderActionButton(action: string, id: string, iconKey: string, label: string, extraClass = ""): string {
  const iconAssets = typeof window !== "undefined" ? window.ChromeTestDataIconAssets : undefined;
  const iconName = iconAssets?.ACTION_ICONS?.[iconKey] || iconKey;
  const iconMarkup = iconAssets?.renderIconMarkup ? iconAssets.renderIconMarkup(iconName, "dm-action-icon", "") : "";
  return [
    '<button type="button" class="dm-table-btn',
    escapeHtml(extraClass),
    '" data-action="',
    escapeHtml(action),
    '" data-id="',
    escapeHtml(id),
    '" aria-label="',
    escapeHtml(label),
    '" title="',
    escapeHtml(label),
    '">',
    iconMarkup,
    '<span class="dm-action-label">',
    escapeHtml(label),
    "</span></button>"
  ].join("");
}

export function formatDisplayTime(value: string): string {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "时间未知";
  return new Date(timestamp).toLocaleString("zh-CN");
}
