import type { HistoryEntry } from "./page-model";
import { escapeHtml, formatDisplayTime } from "./view-helpers";

export function renderHistoryView(scope: string, entries: HistoryEntry[]): string {
  return [
    '<section class="dm-view dm-view-history" aria-labelledby="dm-view-title">',
    '  <div class="dm-view-head">',
    '    <div class="dm-view-copy">',
    '      <p class="dm-view-kicker">Recent 30</p>',
    '      <h1 id="dm-view-title">生成记录</h1>',
    '      <p class="dm-view-description">这里只保留当前作用域 <strong>' +
      escapeHtml(scope || "未识别") +
      "</strong> 最近 30 条整组快照，单字段填充不会进入历史。</p>",
    "    </div>",
    '    <div class="dm-view-meta">按时间倒序排列</div>',
    "  </div>",
    entries.length
      ? [
          '<div class="dm-table-shell">',
          '  <table class="dm-table">',
          "    <thead><tr><th>时间</th><th>姓名</th><th>公司</th><th>手机</th><th>邮箱</th><th>操作</th></tr></thead>",
          "    <tbody>",
          entries
            .map(function (entry) {
              return [
                "<tr>",
                "  <td>" + escapeHtml(formatDisplayTime(entry.createdAt)) + "</td>",
                "  <td>" + escapeHtml(entry.profile.fullName) + "</td>",
                "  <td>" + escapeHtml(entry.profile.companyName) + "</td>",
                "  <td>" + escapeHtml(entry.profile.mobile) + "</td>",
                "  <td>" + escapeHtml(entry.profile.email) + "</td>",
                '  <td class="dm-table-actions">',
                '    <button type="button" class="dm-table-btn" data-action="history-favorite" data-id="' + escapeHtml(entry.id) + '">收藏</button>',
                '    <button type="button" class="dm-table-btn" data-action="history-copy" data-id="' + escapeHtml(entry.id) + '">复制</button>',
                "  </td>",
                "</tr>"
              ].join("");
            })
            .join(""),
          "    </tbody>",
          "  </table>",
          "</div>"
        ].join("")
      : [
          '<section class="dm-empty-state">',
          '  <p class="dm-empty-kicker">No history yet</p>',
          "  <h2>当前作用域还没有生成记录</h2>",
          "  <p>先从插件面板生成一组数据，再回到这里进行复制或收藏。</p>",
          "</section>"
        ].join(""),
    "</section>"
  ].join("");
}
