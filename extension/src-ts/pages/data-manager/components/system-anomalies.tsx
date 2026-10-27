import type { SystemProfile } from "../../../shared/system-scope";
import { formatDisplayTime } from "../lib/display";
import { DELETED_SYSTEM_LABEL } from "../lib/scope-label";
import { Icon } from "./icon";

export function SystemAnomalies(props: {
  system: SystemProfile;
  systems: SystemProfile[];
  onDismiss: (id: string) => void;
}) {
  const { system } = props;
  if (!system.anomalies.length) return null;
  function titleSystemName(id: string): string {
    const found = props.systems.find(function (item) { return item.id === id; });
    return found ? found.name || "未命名系统" : DELETED_SYSTEM_LABEL;
  }
  return (
    <section class="dm-detail-group">
      <h3 class="dm-detail-group-title">异常提醒</h3>
      <div class="dm-banner is-warning dm-anomaly-banner" role="alert">
        <Icon name="circle-alert" />
        <span class="dm-banner-text">
          以下页面所在的域名属于本系统，但页面标题命中了其他系统，可能需要调整归属。
        </span>
        <button type="button" class="dm-link-btn" onClick={function () { props.onDismiss(system.id); }}>忽略</button>
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
  );
}
