import type { ProfileFieldKey } from "../page-model";
import { isMonospaceField } from "../lib/columns";
import { Highlight } from "./highlight";
import { Icon } from "./icon";

export function FieldCell(props: {
  fieldKey: ProfileFieldKey;
  value: string;
  query: string;
  onCopy: (fieldKey: ProfileFieldKey, value: string) => void;
}) {
  if (!props.value) return <span class="dm-cell-empty">—</span>;
  return (
    <button
      type="button"
      class={"dm-copy-cell" + (isMonospaceField(props.fieldKey) ? " is-mono" : "")}
      title={props.value + "（点击复制）"}
      onClick={function (event) {
        event.stopPropagation();
        props.onCopy(props.fieldKey, props.value);
      }}
    >
      <span class="dm-copy-cell-text">
        <Highlight text={props.value} query={props.query} />
      </span>
      <Icon name="copy" class="dm-copy-cell-icon" />
    </button>
  );
}
