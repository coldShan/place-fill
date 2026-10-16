import type { ComponentChildren } from "preact";
import { getFieldLabel, type ProfileFieldKey, type ProfileFieldMap } from "../page-model";
import { isMonospaceField } from "../lib/columns";
import { FIELD_GROUPS } from "../lib/field-groups";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";

export function DrawerShell(props: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <aside class="dm-drawer" aria-label={props.eyebrow + "详情"}>
      <header class="dm-drawer-head">
        <div class="dm-drawer-heading">
          <span class="dm-drawer-eyebrow">{props.eyebrow}</span>
          <h2 class="dm-drawer-title" title={props.title}>{props.title}</h2>
          {props.subtitle ? <p class="dm-drawer-subtitle">{props.subtitle}</p> : null}
        </div>
        <IconButton icon="x" label="关闭详情" onClick={props.onClose} />
      </header>
      <div class="dm-drawer-body">{props.children}</div>
      {props.footer ? <footer class="dm-drawer-foot">{props.footer}</footer> : null}
    </aside>
  );
}

export function ProfileDetails(props: {
  profile: ProfileFieldMap;
  onCopyField: (fieldKey: ProfileFieldKey, value: string) => void;
}) {
  return (
    <>
      {FIELD_GROUPS.map(function (group) {
        return (
          <section class="dm-detail-group" key={group.title}>
            <h3 class="dm-detail-group-title">{group.title}</h3>
            <dl class="dm-detail-list">
              {group.fields.map(function (fieldKey) {
                const value = props.profile[fieldKey];
                return (
                  <div class="dm-detail-row" key={fieldKey}>
                    <dt>{getFieldLabel(fieldKey)}</dt>
                    <dd>
                      {value ? (
                        <button
                          type="button"
                          class={"dm-detail-value" + (isMonospaceField(fieldKey) ? " is-mono" : "")}
                          title="点击复制"
                          onClick={function () { props.onCopyField(fieldKey, value); }}
                        >
                          <span>{value}</span>
                          <Icon name="copy" class="dm-copy-cell-icon" />
                        </button>
                      ) : (
                        <span class="dm-cell-empty">—</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </>
  );
}
