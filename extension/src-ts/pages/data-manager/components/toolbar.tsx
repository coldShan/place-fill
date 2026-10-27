import type { ComponentChildren } from "preact";
import type { DataManagerView } from "../../../shared/data-manager-routing";

export const VIEW_LABELS: Record<DataManagerView, string> = {
  favorites: "常用数据",
  history: "生成记录",
  systems: "系统标注"
};

export function Toolbar(props: {
  view: DataManagerView;
  counts: Record<DataManagerView, number>;
  hint?: string;
  onViewChange: (view: DataManagerView) => void;
  children?: ComponentChildren;
}) {
  const views = Object.keys(VIEW_LABELS) as DataManagerView[];
  return (
    <div class="dm-toolbar">
      <div class="dm-tabs" role="tablist" aria-label="数据管理视图">
        {views.map(function (item) {
          const active = item === props.view;
          return (
            <button
              key={item}
              type="button"
              class="dm-tab"
              role="tab"
              data-view={item}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={function () { props.onViewChange(item); }}
              onKeyDown={function (event) {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const offset = event.key === "ArrowLeft" ? -1 : 1;
                const next = views[(views.indexOf(item) + offset + views.length) % views.length];
                if (!next) return;
                props.onViewChange(next);
                event.currentTarget.parentElement?.querySelector<HTMLElement>('[data-view="' + next + '"]')?.focus();
              }}
            >
              {VIEW_LABELS[item]}
              <span class="dm-tab-count">{props.counts[item]}</span>
            </button>
          );
        })}
      </div>
      <div class="dm-toolbar-right">
        {props.hint ? <span class="dm-toolbar-hint">{props.hint}</span> : null}
        {props.children}
      </div>
    </div>
  );
}
