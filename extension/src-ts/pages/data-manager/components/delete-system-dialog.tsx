import { useState } from "preact/hooks";
import type { SystemProfile } from "../../../shared/system-scope";
import { getDeleteTargets } from "../lib/systems";
import { Dialog } from "./dialog";

export function DeleteSystemDialog(props: {
  system: SystemProfile;
  onClose: () => void;
  onConfirm: (targetScope: string) => Promise<void>;
}) {
  const targets = getDeleteTargets(props.system);
  const [selected, setSelected] = useState(targets[0]?.scope || "");
  const [submitting, setSubmitting] = useState(false);

  async function submit(): Promise<void> {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await props.onConfirm(selected);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      title={"删除系统「" + (props.system.name || "未命名系统") + "」"}
      description="系统记录将被删除，它的常用数据、生成记录、字段标注和开关会退回到下面选中的站点，之后可继续使用或手动清理。"
      onClose={props.onClose}
      footer={
        <>
          <button type="button" class="dm-secondary-btn" data-autofocus onClick={props.onClose}>取消</button>
          <button type="button" class="dm-danger-btn" disabled={!selected || submitting} onClick={function () { void submit(); }}>
            删除系统
          </button>
        </>
      }
    >
      <div class="dm-radio-list" role="radiogroup" aria-label="数据退回的站点">
        {targets.map(function (target) {
          const checked = selected === target.scope;
          return (
            <label key={target.scope} class={"dm-site-option" + (checked ? " is-checked" : "")}>
              <input
                type="radio"
                name="dm-delete-system-target"
                value={target.scope}
                checked={checked}
                onChange={function () { setSelected(target.scope); }}
              />
              <span class="dm-site-option-name" title={target.scope}>{target.label}</span>
              <span class="dm-site-option-meta">退回此站点</span>
            </label>
          );
        })}
      </div>
    </Dialog>
  );
}
