import type { ProfileFieldKey } from "../page-model";
import { isMonospaceField } from "../lib/columns";

export function FieldCell(props: { fieldKey: ProfileFieldKey; value: string }) {
  if (!props.value) return <span class="dm-cell-empty">—</span>;
  return (
    <span class={"dm-cell-value" + (isMonospaceField(props.fieldKey) ? " is-mono" : "")} title={props.value}>
      {props.value}
    </span>
  );
}
