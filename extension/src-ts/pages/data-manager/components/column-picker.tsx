import { getFieldLabel, type ProfileFieldKey } from "../page-model";
import { toggleColumn } from "../lib/columns";
import { DISPLAY_FIELD_ORDER } from "../lib/field-groups";
import { Icon } from "./icon";
import { Popover } from "./popover";

export function ColumnPicker(props: {
  columns: ProfileFieldKey[];
  defaultColumns: ProfileFieldKey[];
  onChange: (columns: ProfileFieldKey[]) => void;
}) {
  return (
    <Popover
      label="选择显示的列"
      trigger={
        <>
          <Icon name="columns-3" />
          列
        </>
      }
    >
      {function () {
        return (
          <div class="dm-column-picker">
            <div class="dm-popover-title">显示的列</div>
            {DISPLAY_FIELD_ORDER.map(function (fieldKey) {
              const checked = props.columns.includes(fieldKey);
              const locked = checked && props.columns.length === 1;
              return (
                <label key={fieldKey} class={"dm-check-row" + (locked ? " is-locked" : "")}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={function () {
                      props.onChange(toggleColumn(props.columns, fieldKey));
                    }}
                  />
                  {getFieldLabel(fieldKey)}
                </label>
              );
            })}
            <div class="dm-popover-foot">
              <button
                type="button"
                class="dm-link-btn"
                onClick={function () {
                  props.onChange(props.defaultColumns.slice());
                }}
              >
                恢复默认
              </button>
            </div>
          </div>
        );
      }}
    </Popover>
  );
}
