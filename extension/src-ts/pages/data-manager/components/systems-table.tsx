import type { SystemProfile } from "../../../shared/system-scope";
import { getSystemStatus, SYSTEM_STATUS_LABELS } from "../lib/systems";
import type { SystemStats } from "../state/use-systems";
import { Highlight } from "./highlight";
import { IconButton } from "./icon-button";

export function SystemsTable(props: {
  systems: SystemProfile[];
  enabledMap: Record<string, boolean>;
  stats: Record<string, SystemStats>;
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCopyId: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div class="dm-table-shell">
      <table class="dm-table dm-systems-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>ID</th>
            <th class="dm-col-number">环境</th>
            <th>状态</th>
            <th class="dm-col-number">常用</th>
            <th class="dm-col-number">记录</th>
            <th class="dm-col-number">标注</th>
            <th class="dm-col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          {props.systems.map(function (system) {
            const status = getSystemStatus(system, props.enabledMap);
            const stats = props.stats[system.id] || { favorites: 0, history: 0, annotations: 0 };
            return (
              <tr
                key={system.id}
                data-system-id={system.id}
                tabIndex={0}
                class={"dm-row" + (props.selectedId === system.id ? " is-selected" : "")}
                onClick={function () { props.onSelect(system.id); }}
                onKeyDown={function (event) {
                  if (event.key === "Enter" && event.target === event.currentTarget) props.onSelect(system.id);
                }}
              >
                <td>
                  <div class="dm-title-cell">
                    <span class="dm-title-text">
                      <Highlight text={system.name || "未命名系统"} query={props.query} />
                    </span>
                    {system.titles.length ? (
                      <span class="dm-title-note" title={system.titles.join("、")}>
                        <Highlight text={system.titles.join("、")} query={props.query} />
                      </span>
                    ) : null}
                  </div>
                </td>
                <td>
                  <div class="dm-id-cell">
                    <span class="dm-cell-value is-mono" title={system.id}>{system.id}</span>
                    <IconButton icon="copy" label="复制系统 ID" onClick={function () { props.onCopyId(system.id); }} />
                  </div>
                </td>
                <td class="dm-col-number">{system.environments.length}</td>
                <td>
                  <span class={"dm-status is-" + status}>{SYSTEM_STATUS_LABELS[status]}</span>
                </td>
                <td class="dm-col-number">{stats.favorites}</td>
                <td class="dm-col-number">{stats.history}</td>
                <td class="dm-col-number">{stats.annotations}</td>
                <td class="dm-col-actions">
                  <div class="dm-row-actions">
                    <IconButton icon="trash-2" label="删除" tone="danger" onClick={function () { props.onDelete(system.id); }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
