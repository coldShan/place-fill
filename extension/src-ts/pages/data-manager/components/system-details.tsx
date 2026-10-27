import type { SystemProfile } from "../../../shared/system-scope";
import { formatDisplayTime } from "../lib/display";
import { DELETED_SYSTEM_LABEL } from "../lib/scope-label";
import { formatEnvironmentHost } from "../lib/systems";
import type { SystemStats } from "../state/use-systems";
import { Icon } from "./icon";

export function SystemDetails(props: {
  system: SystemProfile;
  systems: SystemProfile[];
  stats: SystemStats;
  onCopyId: (id: string) => void;
  onDismissAnomalies: (id: string) => void;
}) {
  const { system, stats } = props;
  function titleSystemName(id: string): string {
    const found = props.systems.find(function (item) { return item.id === id; });
    return found ? found.name || "未命名系统" : DELETED_SYSTEM_LABEL;
  }
  return (
    <>
      {system.anomalies.length ? (
        <section class="dm-detail-group">
          <h3 class="dm-detail-group-title">异常提醒</h3>
          <div class="dm-banner is-warning dm-anomaly-banner" role="alert">
            <Icon name="circle-alert" />
            <span class="dm-banner-text">
              以下页面所在的域名属于本系统，但页面标题命中了其他系统，可能需要调整归属。
            </span>
            <button type="button" class="dm-link-btn" onClick={function () { props.onDismissAnomalies(system.id); }}>忽略</button>
          </div>
          <ul class="dm-anomaly-list">
            {system.anomalies.map(function (anomaly) {
              return (
                <li class="dm-anomaly-item" key={anomaly.titleSystemId + anomaly.url}>
                  <span class="dm-anomaly-title">标题命中「{titleSystemName(anomaly.titleSystemId)}」</span>
                  <span class="dm-anomaly-url" title={anomaly.url}>{anomaly.url}</span>
                  <span class="dm-anomaly-time">{formatDisplayTime(String(anomaly.at))}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <section class="dm-detail-group">
        <h3 class="dm-detail-group-title">基本信息</h3>
        <dl class="dm-detail-list">
          <div class="dm-detail-row">
            <dt>系统 ID</dt>
            <dd>
              <button
                type="button"
                class="dm-detail-value is-mono"
                title="点击复制"
                onClick={function () { props.onCopyId(system.id); }}
              >
                <span>{system.id}</span>
                <Icon name="copy" class="dm-copy-cell-icon" />
              </button>
            </dd>
          </div>
          <div class="dm-detail-row">
            <dt>标题关键词</dt>
            <dd>
              {system.titles.length ? (
                <span class="dm-chip-list">
                  {system.titles.map(function (title) {
                    return <span class="dm-chip" key={title}>{title}</span>;
                  })}
                </span>
              ) : (
                <span class="dm-cell-empty">— 仅按端口、参数识别</span>
              )}
            </dd>
          </div>
          <div class="dm-detail-row">
            <dt>关联数据</dt>
            <dd>常用 {stats.favorites} · 记录 {stats.history} · 标注 {stats.annotations}</dd>
          </div>
          <div class="dm-detail-row">
            <dt>最近更新</dt>
            <dd>{formatDisplayTime(String(system.updatedAt))}</dd>
          </div>
        </dl>
      </section>
      <section class="dm-detail-group">
        <h3 class="dm-detail-group-title">环境（{system.environments.length}）</h3>
        {system.environments.length ? (
          <ul class="dm-env-list">
            {system.environments.map(function (environment) {
              const params = Object.keys(environment.query);
              return (
                <li class="dm-env-item" key={environment.id || formatEnvironmentHost(environment)}>
                  <span class="dm-env-host">
                    {formatEnvironmentHost(environment)}
                    {environment.autoAdded ? <span class="dm-badge">自动</span> : null}
                  </span>
                  {environment.lastPath || params.length ? (
                    <span class="dm-chip-list">
                      {environment.lastPath ? <span class="dm-chip">path = {environment.lastPath}</span> : null}
                      {params.map(function (key) {
                        return <span class="dm-chip" key={key}>{key}={environment.query[key]}</span>;
                      })}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <span class="dm-cell-empty">—</span>
        )}
      </section>
    </>
  );
}
