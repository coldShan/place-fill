import type { FavoriteEntry } from "./page-model";
import { escapeHtml, formatDisplayTime } from "./view-helpers";

export function renderFavoritesView(scope: string, entries: FavoriteEntry[]): string {
  return [
    '<section class="dm-view dm-view-favorites" aria-labelledby="dm-view-title">',
    '  <div class="dm-view-head">',
    '    <div class="dm-view-copy">',
    '      <p class="dm-view-kicker">Reusable Profiles</p>',
    '      <h1 id="dm-view-title">常用数据</h1>',
    '      <p class="dm-view-description">把会反复复用的整组资料沉淀为模板，当前按作用域 <strong>' +
      escapeHtml(scope || "未识别") +
      "</strong> 单独管理。</p>",
    "    </div>",
    '    <button type="button" class="dm-primary-btn" data-action="open-create-favorite">新增常用数据</button>',
    "  </div>",
    entries.length
      ? [
          '<div class="dm-favorite-grid">',
          entries
            .map(function (entry) {
              return [
                '<article class="dm-card">',
                '  <div class="dm-card-topline">',
                '    <p class="dm-card-kicker">Template</p>',
                '    <span class="dm-card-time">更新于 ' + escapeHtml(formatDisplayTime(entry.updatedAt)) + "</span>",
                "  </div>",
                '  <h2 class="dm-card-title">' + escapeHtml(entry.name) + "</h2>",
                '  <div class="dm-card-summary">',
                '    <div><span class="dm-card-label">姓名</span><strong>' + escapeHtml(entry.profile.fullName || "未填写") + "</strong></div>",
                '    <div><span class="dm-card-label">公司</span><strong>' + escapeHtml(entry.profile.companyName || "未填写") + "</strong></div>",
                '    <div><span class="dm-card-label">手机</span><strong>' + escapeHtml(entry.profile.mobile || "未填写") + "</strong></div>",
                "  </div>",
                '  <div class="dm-card-actions">',
                '    <button type="button" class="dm-subtle-btn" data-action="favorite-copy" data-id="' + escapeHtml(entry.id) + '">复制整组</button>',
                '    <button type="button" class="dm-subtle-btn" data-action="favorite-edit" data-id="' + escapeHtml(entry.id) + '">编辑</button>',
                '    <button type="button" class="dm-subtle-btn is-danger" data-action="favorite-delete" data-id="' + escapeHtml(entry.id) + '">删除</button>',
                "  </div>",
                "</article>"
              ].join("");
            })
            .join(""),
          "</div>"
        ].join("")
      : [
          '<section class="dm-empty-state">',
          '  <p class="dm-empty-kicker">No favorites yet</p>',
          "  <h2>当前作用域还没有常用数据</h2>",
          "  <p>你可以手动新增模板，或者稍后从生成记录里收藏一组数据。</p>",
          '  <button type="button" class="dm-primary-btn" data-action="open-create-favorite">创建第一组模板</button>',
          "</section>"
        ].join(""),
    "</section>"
  ].join("");
}
