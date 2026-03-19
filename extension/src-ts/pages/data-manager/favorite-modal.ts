import { FIELD_KEYS, getFieldLabel, normalizeProfile, type FavoriteEntry, type ProfileFieldMap } from "./page-model";
import { escapeHtml } from "./view-helpers";

export function renderFavoriteModal(): string {
  return [
    '<div class="dm-modal" data-role="favorite-modal" hidden>',
    '  <button type="button" class="dm-modal-backdrop" data-action="close-favorite-modal" aria-label="关闭常用数据表单"></button>',
    '  <section class="dm-modal-card" role="dialog" aria-modal="true" aria-labelledby="dm-favorite-modal-title">',
    '    <div class="dm-modal-head">',
    '      <div class="dm-modal-copy">',
    '        <h2 id="dm-favorite-modal-title" data-role="favorite-modal-title">新增常用数据</h2>',
    '        <p class="dm-modal-note" data-role="favorite-modal-note">仅保存当前作用域下的数据。</p>',
    "      </div>",
    '      <button type="button" class="dm-icon-btn" data-action="close-favorite-modal" aria-label="关闭弹窗">关闭</button>',
    "    </div>",
    '    <form class="dm-modal-form" data-role="favorite-form">',
    '      <div class="dm-modal-grid">',
    FIELD_KEYS.map(function (fieldKey) {
      return [
        '<label class="dm-form-field">',
        "  <span>" + escapeHtml(getFieldLabel(fieldKey)) + "</span>",
        '  <input type="text" data-field-key="' + escapeHtml(fieldKey) + '" placeholder="填写' + escapeHtml(getFieldLabel(fieldKey)) + '">',
        "</label>"
      ].join("");
    }).join(""),
    "      </div>",
    '      <div class="dm-modal-actions">',
    '        <button type="button" class="dm-subtle-btn" data-action="close-favorite-modal">取消</button>',
    '        <button type="submit" class="dm-primary-btn">保存常用数据</button>',
    "      </div>",
    "    </form>",
    "  </section>",
    "</div>"
  ].join("");
}

export function readFavoriteDraft(form: HTMLFormElement | null): ProfileFieldMap {
  return normalizeProfile(
    Object.fromEntries(
      FIELD_KEYS.map(function (fieldKey) {
        return [
          fieldKey,
          form?.querySelector<HTMLInputElement>('[data-field-key="' + fieldKey + '"]')?.value || ""
        ];
      })
    )
  );
}

export function syncFavoriteForm(
  form: HTMLFormElement | null,
  titleNode: HTMLElement | null,
  noteNode: HTMLElement | null,
  entry: FavoriteEntry | null
): void {
  if (!form) return;
  if (titleNode) titleNode.textContent = entry ? "编辑常用数据" : "新增常用数据";
  if (noteNode) {
    noteNode.textContent = entry
      ? "保存后将覆盖当前这组常用数据。"
      : "仅保存当前作用域下的数据。";
  }
  const profile = normalizeProfile(entry ? entry.profile : undefined);
  FIELD_KEYS.forEach(function (fieldKey) {
    const input = form.querySelector<HTMLInputElement>('[data-field-key="' + fieldKey + '"]');
    if (input) input.value = profile[fieldKey];
  });
}
